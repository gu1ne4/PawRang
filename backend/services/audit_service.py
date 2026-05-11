"""System audit helpers and data access."""

import uuid

from flask import request

_deps = {}


def configure_audit_service(**deps):
    """Inject app-level dependencies after app.py finishes defining them."""
    _deps.update(deps)


def _dep(name):
    if name not in _deps:
        raise RuntimeError(f"Audit service dependency is not configured: {name}")
    return _deps[name]


def _audit_logs_table():
    return _deps.get("audit_logs_table", "audit_logs")


def _audit_logs_setup_message():
    return _deps.get(
        "audit_logs_setup_message",
        "Audit log table is not ready yet. Run backend/sql/audit_logs.sql first.",
    )


def parse_uuid_or_none(value):
    if not value:
        return None

    try:
        return str(uuid.UUID(str(value)))
    except (ValueError, TypeError, AttributeError):
        return None


def trim_audit_text(value, default="", limit=500):
    text = str(value or "").strip()
    if not text:
        text = default
    return text[:limit]


def normalize_audit_status(value):
    raw_status = str(value or "Success").strip().lower()
    if raw_status in {"success", "successful", "completed", "ok"}:
        return "Success"
    if raw_status in {"warning", "warn", "review", "needs review", "sensitive"}:
        return "Warning"
    if raw_status in {"failed", "failure", "error", "rejected", "blocked"}:
        return "Failed"
    return "Success"


def normalize_audit_role(role):
    role_value = str(role or "").strip()
    lowered = role_value.lower()
    if "admin" in lowered:
        return "Admin"
    if "vet" in lowered or "doctor" in lowered:
        return "Veterinarian"
    if "reception" in lowered or "front" in lowered or "clinical" in lowered or "clinic staff" in lowered:
        return "Clinic Staff"
    if "patient" in lowered or "user" in lowered or "client" in lowered or "owner" in lowered:
        return "User"
    return role_value or "System"


def normalize_audit_account_type(value):
    raw_value = str(value or "").strip().lower()
    if raw_value in {
        "employee",
        "staff",
        "clinical staff",
        "clinic staff",
        "admin",
        "doctor",
        "vet",
        "veterinarian",
        "receptionist",
        "employee_accounts",
    }:
        return "employee"
    if raw_value in {"patient", "user", "client", "owner", "patient_account"}:
        return "patient"
    if raw_value == "system":
        return "system"
    return "unknown" if raw_value else None


def get_audit_profile_display_name(profile):
    if not profile:
        return ""

    first_name = profile.get("firstName") or profile.get("first_name") or ""
    last_name = profile.get("lastName") or profile.get("last_name") or ""
    return (
        profile.get("username")
        or f"{first_name} {last_name}".strip()
        or profile.get("full_name")
        or profile.get("fullname")
        or profile.get("email")
        or ""
    )


def resolve_audit_actor_context(data):
    current_user = data.get("currentUser") or data.get("current_user") or {}
    if not isinstance(current_user, dict):
        current_user = {}

    raw_actor_id = (
        data.get("actorId")
        or data.get("actor_id")
        or data.get("userId")
        or data.get("user_id")
        or data.get("processedBy")
        or data.get("processed_by")
        or current_user.get("id")
        or current_user.get("pk")
    )
    actor_account_id = parse_uuid_or_none(raw_actor_id)

    actor = (
        data.get("actor")
        or data.get("actorName")
        or data.get("actor_name")
        or data.get("username")
        or current_user.get("username")
        or current_user.get("fullName")
        or current_user.get("fullname")
    )
    raw_role = (
        data.get("role")
        or data.get("actorRole")
        or data.get("actor_role")
        or current_user.get("role")
    )
    actor_account_type = normalize_audit_account_type(
        data.get("actorAccountType")
        or data.get("actor_account_type")
        or data.get("userType")
        or data.get("user_type")
        or current_user.get("account_type")
    )

    if actor_account_id:
        try:
            profile, source_table = _dep("find_account_by_user_id")(actor_account_id)
            if profile:
                actor = actor or get_audit_profile_display_name(profile)
                raw_role = raw_role or profile.get("role")
                actor_account_type = "employee" if source_table == "employee_accounts" else "patient"
        except Exception as profile_error:
            print("Audit actor lookup failed:", str(profile_error))

    return {
        "actor": trim_audit_text(actor, "system", 160),
        "actor_account_id": actor_account_id,
        "actor_account_type": actor_account_type or "system",
        "actor_role": normalize_audit_role(raw_role),
    }


def get_request_ip_address():
    try:
        forwarded_for = request.headers.get("X-Forwarded-For", "")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip() or None
        return request.remote_addr
    except RuntimeError:
        return None


def get_request_user_agent():
    try:
        return request.headers.get("User-Agent")
    except RuntimeError:
        return None


def normalize_audit_log(row):
    if not row:
        return None

    branch_id = row.get("branch_id", row.get("branchId"))

    return {
        "id": row.get("audit_log_id") or row.get("id"),
        "module": row.get("module") or "System",
        "event": row.get("event") or "Action Recorded",
        "actor": row.get("actor") or "system",
        "role": row.get("actor_role") or row.get("role") or "System",
        "target": row.get("target") or "System",
        "summary": row.get("summary") or "",
        "dateTime": row.get("created_at") or row.get("dateTime") or row.get("date_time"),
        "status": normalize_audit_status(row.get("status")),
        "branchId": branch_id,
        "branch_id": branch_id,
    }


def record_system_audit_log(data, *, raise_on_missing=False, raise_errors=False):
    data = data or {}
    if not isinstance(data, dict):
        data = {}
    actor_context = resolve_audit_actor_context(data)
    metadata = data.get("metadata") if isinstance(data.get("metadata"), dict) else {}

    try:
        branch_id = _dep("coerce_int")(
            data.get("branchId", data.get("branch_id")),
            "branch_id",
            minimum=1,
            allow_none=True,
        )
    except ValueError:
        branch_id = None

    payload = {
        "module": trim_audit_text(data.get("module"), "System", 80),
        "event": trim_audit_text(data.get("event"), "Action Recorded", 120),
        "actor": actor_context["actor"],
        "actor_account_id": actor_context["actor_account_id"],
        "actor_account_type": actor_context["actor_account_type"],
        "actor_role": actor_context["actor_role"],
        "target": trim_audit_text(data.get("target"), "System", 180),
        "target_type": trim_audit_text(data.get("targetType") or data.get("target_type"), "", 80) or None,
        "target_id": trim_audit_text(data.get("targetId") or data.get("target_id"), "", 80) or None,
        "summary": trim_audit_text(data.get("summary"), "", 700),
        "status": normalize_audit_status(data.get("status")),
        "branch_id": branch_id,
        "metadata": metadata,
        "ip_address": data.get("ipAddress") or data.get("ip_address") or get_request_ip_address(),
        "user_agent": data.get("userAgent") or data.get("user_agent") or get_request_user_agent(),
    }

    try:
        response = _dep("execute_with_retry")(
            lambda: _dep("supabase_admin").table(_audit_logs_table()).insert(payload).execute(),
            context="Create audit log",
        )
        rows = response.data or []
        return normalize_audit_log(rows[0] if rows else payload)
    except Exception as e:
        missing_table = (
            _dep("is_missing_relation_error")(e, _audit_logs_table())
            or _dep("is_missing_supabase_resource_error")(e)
        )
        if missing_table and raise_on_missing:
            raise RuntimeError(_audit_logs_setup_message())
        if raise_errors:
            raise
        print("Audit log insert failed:", str(e))
        return None


def get_audit_logs_response(args):
    try:
        limit = _dep("coerce_int")(args.get("limit"), "limit", minimum=1, maximum=1000, default=300)
        search = (args.get("search") or "").strip()
        module = (args.get("module") or "").strip()
        role = (args.get("role") or "").strip()
        status = (args.get("status") or "").strip()
        branch_id = (args.get("branch_id", args.get("branchId")) or "").strip()

        query = _dep("supabase_admin").table(_audit_logs_table()).select("*")
        if module and module != "All Modules":
            query = query.eq("module", module)
        if role and role != "All Roles":
            query = query.eq("actor_role", role)
        if status and status != "All Statuses":
            query = query.eq("status", normalize_audit_status(status))
        if branch_id and branch_id not in ("All Branches", "all", "All"):
            if branch_id.lower() in ("system-wide", "system", "none", "unassigned"):
                query = query.is_("branch_id", "null")
            else:
                query = query.eq("branch_id", _dep("coerce_int")(branch_id, "branch_id", minimum=1))
        if search:
            escaped_search = search.replace(",", "\\,")
            query = query.or_(
                f"module.ilike.%{escaped_search}%,"
                f"event.ilike.%{escaped_search}%,"
                f"actor.ilike.%{escaped_search}%,"
                f"actor_role.ilike.%{escaped_search}%,"
                f"target.ilike.%{escaped_search}%,"
                f"summary.ilike.%{escaped_search}%"
            )

        response = _dep("execute_with_retry")(
            lambda: query.order("created_at", desc=True).limit(limit).execute(),
            context="Fetch audit logs",
        )
        logs = [
            normalized
            for normalized in (normalize_audit_log(row) for row in (response.data or []))
            if normalized
        ]
        return {"logs": logs}, 200
    except Exception as e:
        if (
            _dep("is_missing_relation_error")(e, _audit_logs_table())
            or _dep("is_missing_supabase_resource_error")(e)
        ):
            return {"logs": [], "warning": _audit_logs_setup_message()}, 200
        print("Fetch audit logs error:", str(e))
        return {"error": str(e)}, 400


def create_audit_log_response(data):
    if not isinstance(data, dict):
        data = {}
    if not str(data.get("module") or "").strip():
        return {"error": "module is required"}, 400
    if not str(data.get("event") or "").strip():
        return {"error": "event is required"}, 400

    try:
        log = record_system_audit_log(data, raise_on_missing=True, raise_errors=True)
        return {"message": "Audit log recorded", "log": log}, 201
    except RuntimeError as setup_error:
        return {"error": str(setup_error)}, 503
    except Exception as e:
        print("Create audit log error:", str(e))
        return {"error": str(e)}, 400
