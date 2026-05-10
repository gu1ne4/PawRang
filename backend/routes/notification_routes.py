"""Admin notification HTTP routes."""

from flask import Blueprint, jsonify, request

from services.notification_service import (
    delete_admin_notification_response,
    delete_admin_notifications_response,
    get_admin_notifications_response,
    read_admin_notification_response,
    read_all_admin_notifications_response,
    reconcile_inventory_expiring_soon_notifications_response,
)

notification_bp = Blueprint("admin_notifications", __name__)


@notification_bp.route("/api/admin-notifications", methods=["GET"])
def get_admin_notifications():
    payload, status_code = get_admin_notifications_response(request.args)
    return jsonify(payload), status_code


@notification_bp.route("/api/admin-notifications/<int:notification_id>/read", methods=["POST"])
def read_admin_notification(notification_id):
    payload, status_code = read_admin_notification_response(notification_id, request.get_json() or {})
    return jsonify(payload), status_code


@notification_bp.route("/api/admin-notifications/<int:notification_id>", methods=["DELETE"])
def delete_admin_notification(notification_id):
    payload, status_code = delete_admin_notification_response(
        notification_id,
        request.get_json(silent=True) or {},
        request.args,
    )
    return jsonify(payload), status_code


@notification_bp.route("/api/admin-notifications", methods=["DELETE"])
def delete_admin_notifications():
    payload, status_code = delete_admin_notifications_response(request.get_json(silent=True) or {})
    return jsonify(payload), status_code


@notification_bp.route("/api/admin-notifications/read-all", methods=["POST"])
def read_all_admin_notifications():
    payload, status_code = read_all_admin_notifications_response(request.get_json() or {})
    return jsonify(payload), status_code


@notification_bp.route("/api/admin-notifications/reconcile/inventory-expiring-soon", methods=["POST"])
def reconcile_inventory_expiring_soon_notifications():
    payload, status_code = reconcile_inventory_expiring_soon_notifications_response(request.get_json() or {})
    return jsonify(payload), status_code
