"""System audit HTTP routes."""

from flask import Blueprint, jsonify, request

from services.audit_service import create_audit_log_response, get_audit_logs_response

audit_bp = Blueprint("audit", __name__)


@audit_bp.route("/api/audit-logs", methods=["GET"])
def get_audit_logs():
    payload, status_code = get_audit_logs_response(request.args)
    return jsonify(payload), status_code


@audit_bp.route("/api/audit-logs", methods=["POST"])
def create_audit_log():
    payload, status_code = create_audit_log_response(request.get_json(silent=True) or {})
    return jsonify(payload), status_code
