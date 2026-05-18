"""AI HTTP routes."""

from flask import Blueprint, jsonify, request

from services.ai_service import (
    generate_admin_appointment_summary,
    generate_client_care_summary,
    generate_clinical_risk_flags,
    generate_doctor_emr_brief,
    generate_follow_up_reminders,
    generate_user_symptom_summary,
)

ai_bp = Blueprint("ai", __name__)


@ai_bp.route("/api/ai/symptom-summary", methods=["POST"])
def symptom_summary():
    payload, status_code = generate_user_symptom_summary(request.get_json() or {})
    return jsonify(payload), status_code


@ai_bp.route("/api/ai/admin-appointment-summary", methods=["POST"])
def admin_appointment_summary():
    payload, status_code = generate_admin_appointment_summary(request.get_json() or {})
    return jsonify(payload), status_code


@ai_bp.route("/api/ai/doctor-emr-brief", methods=["POST"])
def doctor_emr_brief():
    payload, status_code = generate_doctor_emr_brief(request.get_json() or {})
    return jsonify(payload), status_code


@ai_bp.route("/api/ai/clinical-risk-flags", methods=["POST"])
def clinical_risk_flags():
    payload, status_code = generate_clinical_risk_flags(request.get_json() or {})
    return jsonify(payload), status_code


@ai_bp.route("/api/ai/follow-up-reminders", methods=["POST"])
def follow_up_reminders():
    payload, status_code = generate_follow_up_reminders(request.get_json() or {})
    return jsonify(payload), status_code


@ai_bp.route("/api/ai/client-care-summary", methods=["POST"])
def client_care_summary():
    payload, status_code = generate_client_care_summary(request.get_json() or {})
    return jsonify(payload), status_code