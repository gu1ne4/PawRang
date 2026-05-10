"""Admin notification helpers and data access."""

from datetime import datetime

_deps = {}


def configure_notification_service(**deps):
    """Inject app-level dependencies after app.py finishes defining them."""
    _deps.update(deps)


def _dep(name):
    if name not in _deps:
        raise RuntimeError(f"Notification service dependency is not configured: {name}")
    return _deps[name]


def _notification_modules():
    return _deps.get("admin_notification_modules", {"inventory", "appointments", "emr", "billing"})


def _notification_severities():
    return _deps.get("admin_notification_severities", {"info", "success", "warning", "error"})


def create_admin_notification(
    *,
    branch_id,
    event_type,
    title,
    message,
    severity="info",
    module="inventory",
    link=None,
    actor_id=None,
    entity_type=None,
    entity_id=None,
    event_key=None,
    metadata=None,
):
    if module not in _notification_modules():
        raise ValueError(f"Unsupported notification module: {module}")
    if severity not in _notification_severities():
        raise ValueError(f"Unsupported notification severity: {severity}")

    payload = {
        "branch_id": branch_id,
        "module": module,
        "event_type": event_type,
        "severity": severity,
        "title": title.strip(),
        "message": message.strip(),
        "link": link.strip() if isinstance(link, str) and link.strip() else None,
        "actor_id": actor_id,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "event_key": event_key.strip() if isinstance(event_key, str) and event_key.strip() else None,
        "metadata": metadata or {},
    }

    response = _dep("supabase_admin").table("admin_notifications").insert(payload).execute()
    created = response.data[0] if response.data else None
    if not created:
        raise ValueError("Failed to create admin notification")
    return created


def normalize_admin_notification(record, admin_user_id=None):
    read_at = record.get("read_at")
    metadata = record.get("metadata") or {}

    return {
        "id": record.get("notification_id"),
        "notificationId": record.get("notification_id"),
        "branchId": record.get("branch_id"),
        "module": record.get("module") or "inventory",
        "eventType": record.get("event_type") or "",
        "type": record.get("severity") or "info",
        "title": record.get("title") or "",
        "message": record.get("message") or "",
        "timestamp": record.get("created_at"),
        "read": bool(read_at),
        "readAt": read_at,
        "link": record.get("link") or None,
        "actorId": record.get("actor_id"),
        "entityType": record.get("entity_type"),
        "entityId": record.get("entity_id"),
        "eventKey": record.get("event_key"),
        "metadata": metadata,
        "adminUserId": admin_user_id,
    }


def create_inventory_admin_notification(
    *,
    branch_id,
    event_type,
    title,
    message,
    severity="info",
    link="/inventory",
    actor_id=None,
    entity_type=None,
    entity_id=None,
    event_key=None,
    metadata=None,
):
    return create_admin_notification(
        branch_id=branch_id,
        event_type=event_type,
        title=title,
        message=message,
        severity=severity,
        module="inventory",
        link=link,
        actor_id=actor_id,
        entity_type=entity_type,
        entity_id=entity_id,
        event_key=event_key,
        metadata=metadata,
    )


def safe_create_inventory_admin_notification(**kwargs):
    try:
        return create_inventory_admin_notification(**kwargs)
    except Exception as notification_error:
        print("Inventory admin notification error:", str(notification_error))
        return None


def create_appointment_admin_notification(
    *,
    table_name,
    id_column,
    record_id,
    event_type,
    title,
    action_text,
    severity="info",
    link="/admin/schedule",
    event_key=None,
    metadata=None,
):
    email_context = _dep("get_reschedule_email_context")(table_name, id_column, record_id)
    record = email_context.get("record") or {}
    branch_id = record.get("branch_id")
    if not branch_id:
        raise ValueError("Appointment notification requires branch_id")

    entity_type = "walkin" if table_name == "walkin_appointments" else "appointment"
    patient_name = email_context.get("patient_name") or "Patient"
    pet_name = email_context.get("pet_name") or "your pet"
    service_name = email_context.get("service_name") or "Appointment"
    appointment_date = record.get("appointment_date") or ""
    appointment_time = _dep("format_display_time")(record.get("appointment_time"))
    schedule_text = " ".join(
        part for part in [
            str(appointment_date).strip(),
            f"at {appointment_time}" if appointment_time else "",
        ] if part
    ).strip()
    message = f"{patient_name}'s appointment for {pet_name} ({service_name}) {action_text}."
    if schedule_text:
        message = f"{message} Schedule: {schedule_text}."

    return create_admin_notification(
        branch_id=branch_id,
        event_type=event_type,
        title=title,
        message=message,
        severity=severity,
        module="appointments",
        link=link,
        entity_type=entity_type,
        entity_id=record_id,
        event_key=event_key,
        metadata={
            "recordType": entity_type,
            "patientName": patient_name,
            "petName": pet_name,
            "serviceName": service_name,
            "appointmentDate": appointment_date,
            "appointmentTime": record.get("appointment_time"),
            **(metadata or {}),
        },
    )


def safe_create_appointment_admin_notification(**kwargs):
    try:
        return create_appointment_admin_notification(**kwargs)
    except Exception as notification_error:
        print("Appointment admin notification error:", str(notification_error))
        return None


def resolve_emr_notification_context(medical_record_id=None, visit_id=None):
    visit = None
    if visit_id not in (None, ""):
        visit = _dep("get_single_row")("medical_record_visits", "medical_record_visit_id", visit_id)
        if visit and medical_record_id in (None, ""):
            medical_record_id = visit.get("medical_record_id")

    record = (
        _dep("get_single_row")("medical_records", "medical_record_id", medical_record_id)
        if medical_record_id not in (None, "")
        else None
    )
    if not record:
        raise ValueError("Medical record not found for EMR notification")

    pet = (
        _dep("get_single_row")("pet_profile", "pet_id", record.get("pet_id"))
        if record.get("pet_id") not in (None, "")
        else None
    )
    owner = _dep("get_single_row")("patient_account", "id", pet.get("owner_id")) if pet and pet.get("owner_id") else None

    if not visit:
        visit_res = _dep("execute_with_retry")(
            lambda: _dep("supabase_admin").table("medical_record_visits")
            .select("*")
            .eq("medical_record_id", medical_record_id)
            .order("visit_date", desc=True)
            .limit(1)
            .execute(),
            context="Fetch EMR notification latest visit",
        )
        visit = (visit_res.data or [None])[0]

    branch_id = (visit or {}).get("branch_id") or record.get("branch_id")
    if not branch_id:
        raise ValueError("EMR notification requires branch_id")

    owner_name = _dep("get_profile_display_name")(owner) if owner else "Unknown owner"
    return {
        "medicalRecordId": record.get("medical_record_id"),
        "branchId": branch_id,
        "record": record,
        "visit": visit,
        "pet": pet,
        "owner": owner,
        "petName": (pet or {}).get("pet_name") or "Unknown pet",
        "ownerName": owner_name,
    }


def create_emr_admin_notification(
    *,
    medical_record_id=None,
    visit_id=None,
    event_type,
    title,
    action_text,
    severity="info",
    link="/patient-records",
    entity_type="medical_record",
    entity_id=None,
    metadata=None,
):
    context = resolve_emr_notification_context(medical_record_id=medical_record_id, visit_id=visit_id)
    resolved_record_id = context.get("medicalRecordId")
    resolved_entity_id = entity_id if entity_id not in (None, "") else resolved_record_id
    message = f"{context.get('petName')} ({context.get('ownerName')}) {action_text}."

    return create_admin_notification(
        branch_id=context.get("branchId"),
        event_type=event_type,
        title=title,
        message=message,
        severity=severity,
        module="emr",
        link=link,
        entity_type=entity_type,
        entity_id=resolved_entity_id,
        metadata={
            "medicalRecordId": resolved_record_id,
            "petId": (context.get("pet") or {}).get("pet_id"),
            "petName": context.get("petName"),
            "ownerId": (context.get("owner") or {}).get("id"),
            "ownerName": context.get("ownerName"),
            "visitId": (context.get("visit") or {}).get("medical_record_visit_id"),
            **(metadata or {}),
        },
    )


def safe_create_emr_admin_notification(**kwargs):
    try:
        return create_emr_admin_notification(**kwargs)
    except Exception as notification_error:
        print("EMR admin notification error:", str(notification_error))
        return None


def get_default_admin_notification_branch_id():
    response = _dep("execute_with_retry")(
        lambda: _dep("supabase_admin").table("branches").select("*").limit(1).execute(),
        context="Fetch default notification branch",
    )
    branch = (response.data or [{}])[0]
    return branch.get("branch_id") or branch.get("id")


def create_billing_admin_notification(
    *,
    invoice_record,
    event_type,
    title,
    action_text,
    severity="info",
    link="/billing",
    metadata=None,
):
    invoice = invoice_record or {}
    branch_id = invoice.get("branch_id") or get_default_admin_notification_branch_id()
    if not branch_id:
        raise ValueError("Billing notification requires a branch_id")

    invoice_id = invoice.get("billing_invoice_id")
    invoice_number = invoice.get("invoice_number") or f"Invoice {invoice_id or ''}".strip()
    customer_name = invoice.get("customer_name") or "Customer"
    pet_name = invoice.get("pet_name") or "pet"
    total_amount = round(float(invoice.get("total_amount") or 0), 2)
    amount_paid = round(float(invoice.get("amount_paid") or 0), 2)
    payment_status = invoice.get("payment_status") or _dep("derive_billing_payment_state")(total_amount, amount_paid)["payment_status"]
    message = (
        f"{invoice_number} for {customer_name} / {pet_name} {action_text}. "
        f"Total: PHP {total_amount:,.2f}. Status: {payment_status}."
    )

    return create_admin_notification(
        branch_id=branch_id,
        event_type=event_type,
        title=title,
        message=message,
        severity=severity,
        module="billing",
        link=link,
        entity_type="billing_invoice",
        entity_id=invoice_id,
        metadata={
            "invoiceId": invoice_id,
            "invoiceNumber": invoice_number,
            "customerName": customer_name,
            "petName": pet_name,
            "totalAmount": total_amount,
            "amountPaid": amount_paid,
            "paymentStatus": payment_status,
            "sourceRecordType": invoice.get("source_record_type"),
            "sourceRecordId": invoice.get("source_record_id"),
            **(metadata or {}),
        },
    )


def safe_create_billing_admin_notification(**kwargs):
    try:
        return create_billing_admin_notification(**kwargs)
    except Exception as notification_error:
        print("Billing admin notification error:", str(notification_error))
        return None


def admin_notification_event_exists(event_key):
    if not event_key:
        return False

    response = _dep("supabase_admin").table("admin_notifications") \
        .select("notification_id") \
        .eq("event_key", event_key) \
        .limit(1) \
        .execute()
    return bool(response.data)


def get_employee_account_or_400(user_id):
    if not user_id:
        return None, "admin_user_id is required"

    employee = _dep("get_single_row")("employee_accounts", "id", user_id)
    if not employee:
        return None, "Employee account not found"

    return employee, None


def mark_admin_notification_read(notification_id, admin_user_id):
    _dep("supabase_admin").table("admin_notification_reads").upsert({
        "notification_id": notification_id,
        "admin_user_id": admin_user_id,
        "read_at": datetime.utcnow().isoformat(),
    }).execute()


def get_admin_notification_reads_map(admin_user_id, notification_ids):
    if not admin_user_id or not notification_ids:
        return {}

    response = _dep("execute_with_retry")(
        lambda: _dep("supabase_admin").table("admin_notification_reads")
        .select("notification_id,read_at")
        .eq("admin_user_id", admin_user_id)
        .in_("notification_id", notification_ids)
        .execute(),
        context="Fetch admin notification reads",
    )

    reads_map = {}
    for row in (response.data or []):
        reads_map[row.get("notification_id")] = row.get("read_at")
    return reads_map


def get_admin_notifications_response(args):
    try:
        admin_user_id = (args.get("admin_user_id") or args.get("adminUserId") or "").strip()
        branch_id_raw = args.get("branch_id", args.get("branchId"))
        module = (args.get("module") or "").strip()
        unread_only = _dep("parse_bool")(args.get("unread_only", args.get("unreadOnly")), default=False)
        limit_raw = args.get("limit")

        _, employee_error = get_employee_account_or_400(admin_user_id)
        if employee_error:
            return {"error": employee_error}, 400
        branch_scope, branch_error = _dep("get_actor_branch_scope")(admin_user_id)
        if branch_error:
            return {"error": branch_error}, 400

        query = _dep("supabase_admin").table("admin_notifications").select("*")
        if branch_id_raw not in (None, "", "all", "All"):
            branch_id, branch_error = _dep("validate_branch_scope_access")(branch_scope, branch_id_raw)
            if branch_error:
                return {"error": branch_error}, 403
            query = query.eq("branch_id", branch_id)
        else:
            query = _dep("apply_branch_scope_to_query")(query, branch_scope)
        if module:
            query = query.eq("module", module)

        limit_value = None
        if limit_raw not in (None, ""):
            limit_value = _dep("coerce_int")(limit_raw, "limit", minimum=1, maximum=200)

        query = query.order("created_at", desc=True)
        if limit_value:
            query = query.limit(limit_value)

        response = _dep("execute_with_retry")(lambda: query.execute(), context="Fetch admin notifications")
        rows = response.data or []
        notification_ids = [row.get("notification_id") for row in rows if row.get("notification_id") is not None]
        reads_map = get_admin_notification_reads_map(admin_user_id, notification_ids)

        notifications = []
        unread_count = 0

        for row in rows:
            enriched = dict(row)
            enriched["read_at"] = reads_map.get(row.get("notification_id"))
            normalized = normalize_admin_notification(enriched, admin_user_id=admin_user_id)
            if not normalized["read"]:
                unread_count += 1
            if unread_only and normalized["read"]:
                continue
            notifications.append(normalized)

        return {
            "notifications": notifications,
            "unreadCount": unread_count,
            "totalCount": len(notifications),
        }, 200
    except Exception as e:
        print("Fetch admin notifications error:", str(e))
        return {"error": str(e)}, 400


def read_admin_notification_response(notification_id, data):
    data = data or {}
    try:
        admin_user_id = (data.get("admin_user_id") or data.get("adminUserId") or "").strip()
        _, employee_error = get_employee_account_or_400(admin_user_id)
        if employee_error:
            return {"error": employee_error}, 400

        notification = _dep("get_single_row")("admin_notifications", "notification_id", notification_id)
        if not notification:
            return {"error": "Notification not found"}, 404
        branch_scope, branch_error = _dep("get_actor_branch_scope")(admin_user_id)
        if branch_error:
            return {"error": branch_error}, 400
        _, branch_access_error = _dep("validate_branch_scope_access")(
            branch_scope,
            notification.get("branch_id"),
            allow_unassigned=True,
        )
        if branch_access_error:
            return {"error": branch_access_error}, 403

        mark_admin_notification_read(notification_id, admin_user_id)

        enriched = dict(notification)
        enriched["read_at"] = datetime.utcnow().isoformat()
        return {
            "message": "Notification marked as read",
            "notification": normalize_admin_notification(enriched, admin_user_id=admin_user_id),
        }, 200
    except Exception as e:
        print("Mark admin notification read error:", str(e))
        return {"error": str(e)}, 400


def ensure_admin_notification_access(notification, branch_scope):
    if not notification:
        return "Notification not found", 404
    if branch_scope and branch_scope.get("can_access_all"):
        return None, None
    _, branch_error = _dep("validate_branch_scope_access")(
        branch_scope,
        notification.get("branch_id"),
        allow_unassigned=True,
    )
    if branch_error:
        return branch_error, 403
    return None, None


def get_accessible_admin_notifications(notification_ids, branch_scope):
    response = _dep("supabase_admin").table("admin_notifications") \
        .select("notification_id, branch_id") \
        .in_("notification_id", notification_ids) \
        .execute()
    notifications = response.data or []
    found_ids = {int(row.get("notification_id")) for row in notifications if row.get("notification_id") is not None}
    missing_ids = [notification_id for notification_id in notification_ids if notification_id not in found_ids]
    if missing_ids:
        return notifications, f"Notification not found: {missing_ids[0]}", 404

    if branch_scope and branch_scope.get("can_access_all"):
        return notifications, None, None

    for notification in notifications:
        _, branch_error = _dep("validate_branch_scope_access")(
            branch_scope,
            notification.get("branch_id"),
            allow_unassigned=True,
        )
        if branch_error:
            return notifications, branch_error, 403

    return notifications, None, None


def delete_admin_notification_response(notification_id, data, args):
    data = data or {}
    try:
        admin_user_id = (
            data.get("admin_user_id")
            or data.get("adminUserId")
            or args.get("admin_user_id")
            or args.get("adminUserId")
            or ""
        ).strip()
        _, employee_error = get_employee_account_or_400(admin_user_id)
        if employee_error:
            return {"error": employee_error}, 400
        branch_scope, branch_error = _dep("get_actor_branch_scope")(admin_user_id)
        if branch_error:
            return {"error": branch_error}, 400

        notification = _dep("get_single_row")("admin_notifications", "notification_id", notification_id)
        access_error, status_code = ensure_admin_notification_access(notification, branch_scope)
        if access_error:
            return {"error": access_error}, status_code

        _dep("supabase_admin").table("admin_notification_reads").delete().eq("notification_id", notification_id).execute()
        _dep("supabase_admin").table("admin_notifications").delete().eq("notification_id", notification_id).execute()

        return {"message": "Notification deleted", "deletedCount": 1}, 200
    except Exception as e:
        print("Delete admin notification error:", str(e))
        return {"error": str(e)}, 400


def delete_admin_notifications_response(data):
    data = data or {}
    try:
        admin_user_id = (data.get("admin_user_id") or data.get("adminUserId") or "").strip()
        raw_ids = data.get("notificationIds") or data.get("notification_ids") or []
        _, employee_error = get_employee_account_or_400(admin_user_id)
        if employee_error:
            return {"error": employee_error}, 400
        branch_scope, branch_error = _dep("get_actor_branch_scope")(admin_user_id)
        if branch_error:
            return {"error": branch_error}, 400

        notification_ids = []
        for raw_id in raw_ids:
            try:
                notification_ids.append(int(raw_id))
            except (TypeError, ValueError):
                continue
        notification_ids = list(dict.fromkeys(notification_ids))

        if not notification_ids:
            return {"error": "notificationIds is required"}, 400

        _, access_error, status_code = get_accessible_admin_notifications(notification_ids, branch_scope)
        if access_error:
            return {"error": access_error}, status_code

        _dep("supabase_admin").table("admin_notification_reads").delete().in_("notification_id", notification_ids).execute()
        _dep("supabase_admin").table("admin_notifications").delete().in_("notification_id", notification_ids).execute()

        return {"message": "Notifications deleted", "deletedCount": len(notification_ids)}, 200
    except Exception as e:
        print("Bulk delete admin notifications error:", str(e))
        return {"error": str(e)}, 400


def read_all_admin_notifications_response(data):
    data = data or {}
    try:
        admin_user_id = (data.get("admin_user_id") or data.get("adminUserId") or "").strip()
        branch_id_raw = data.get("branch_id", data.get("branchId"))
        module = (data.get("module") or "").strip()

        _, employee_error = get_employee_account_or_400(admin_user_id)
        if employee_error:
            return {"error": employee_error}, 400
        branch_scope, branch_error = _dep("get_actor_branch_scope")(admin_user_id)
        if branch_error:
            return {"error": branch_error}, 400

        query = _dep("supabase_admin").table("admin_notifications").select("notification_id")
        if branch_id_raw not in (None, "", "all", "All"):
            branch_id, branch_error = _dep("validate_branch_scope_access")(branch_scope, branch_id_raw)
            if branch_error:
                return {"error": branch_error}, 403
            query = query.eq("branch_id", branch_id)
        else:
            query = _dep("apply_branch_scope_to_query")(query, branch_scope)
        if module:
            query = query.eq("module", module)

        notifications_response = query.execute()
        notifications = notifications_response.data or []
        notification_ids = [
            row.get("notification_id")
            for row in notifications
            if row.get("notification_id") is not None
        ]

        if not notification_ids:
            return {"message": "No notifications to mark as read", "updatedCount": 0}, 200

        read_at = datetime.utcnow().isoformat()
        read_rows = [
            {
                "notification_id": notification_id,
                "admin_user_id": admin_user_id,
                "read_at": read_at,
            }
            for notification_id in notification_ids
        ]
        _dep("supabase_admin").table("admin_notification_reads").upsert(read_rows).execute()

        return {
            "message": "Notifications marked as read",
            "updatedCount": len(notification_ids),
        }, 200
    except Exception as e:
        print("Mark all admin notifications read error:", str(e))
        return {"error": str(e)}, 400


def reconcile_inventory_expiring_soon_notifications_response(data):
    data = data or {}
    try:
        branch_id_raw = data.get("branch_id", data.get("branchId"))
        branch_id = None
        if branch_id_raw not in (None, ""):
            branch_id = _dep("coerce_int")(branch_id_raw, "branch_id", minimum=1)

        expiry_windows = data.get("windows", data.get("expiryWindows"))
        result = _dep("reconcile_inventory_expiring_notifications")(
            branch_id=branch_id,
            expiry_windows=expiry_windows,
        )

        return {
            "message": "Inventory expiring-soon reconciliation completed",
            **result,
        }, 200
    except Exception as e:
        print("Reconcile inventory expiring notifications error:", str(e))
        return {"error": str(e)}, 400
