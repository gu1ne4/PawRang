"""Admin analytics HTTP routes."""

from flask import Blueprint, jsonify, request

from services.analytics_service import get_admin_analytics_overview_response

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/api/admin/analytics/overview", methods=["GET"])
def admin_analytics_overview():
    payload, status_code = get_admin_analytics_overview_response(request.args)
    return jsonify(payload), status_code