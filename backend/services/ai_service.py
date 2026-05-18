"""AI summary and clinical support services."""

import json

from extensions.openai_client import (
    AI_BUSY_MESSAGE,
    OPENAI_MODEL,
    call_openai_with_raw_structured_output,
)

_deps = {}


def configure_ai_service(**deps):
    _deps.update(deps)


def get_current_manila_datetime():
    callback = _deps.get("get_current_manila_datetime")
    if not callback:
        raise RuntimeError("AI service dependency is not configured: get_current_manila_datetime")
    return callback()


def record_emr_audit_event(*args, **kwargs):
    callback = _deps.get("record_emr_audit_event")
    if callback:
        return callback(*args, **kwargs)
    return None
ADMIN_AI_SUMMARY_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "summary": {"type": "STRING"},
        "important_flags": {
            "type": "ARRAY",
            "items": {"type": "STRING"}
        },
        "follow_up_questions": {
            "type": "ARRAY",
            "items": {"type": "STRING"}
        },
        "missing_information": {
            "type": "ARRAY",
            "items": {"type": "STRING"}
        }
    },
    "required": [
        "summary",
        "important_flags",
        "follow_up_questions",
        "missing_information"
    ]
}

DOCTOR_EMR_BRIEF_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "summary": {"type": "STRING"},
        "important_flags": {"type": "ARRAY", "items": {"type": "STRING"}},
        "relevant_history": {"type": "ARRAY", "items": {"type": "STRING"}},
        "exam_focus": {"type": "ARRAY", "items": {"type": "STRING"}},
        "care_continuity_notes": {"type": "ARRAY", "items": {"type": "STRING"}},
        "missing_information": {"type": "ARRAY", "items": {"type": "STRING"}},
    },
    "required": [
        "summary",
        "important_flags",
        "relevant_history",
        "exam_focus",
        "care_continuity_notes",
        "missing_information",
    ]
}

CLIENT_CARE_SUMMARY_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "summary": {"type": "STRING"},
        "visit_summary": {"type": "STRING"},
        "home_care_instructions": {"type": "ARRAY", "items": {"type": "STRING"}},
        "medication_notes": {"type": "ARRAY", "items": {"type": "STRING"}},
        "watch_for": {"type": "ARRAY", "items": {"type": "STRING"}},
        "follow_up": {"type": "ARRAY", "items": {"type": "STRING"}},
        "friendly_message": {"type": "STRING"},
        "missing_information": {"type": "ARRAY", "items": {"type": "STRING"}},
    },
    "required": [
        "summary",
        "visit_summary",
        "home_care_instructions",
        "medication_notes",
        "watch_for",
        "follow_up",
        "friendly_message",
        "missing_information",
    ]
}

USER_SYMPTOM_SUMMARY_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "summary": {"type": "STRING"}
    },
    "required": ["summary"]
}


def _text_or_default(value, default="Not provided"):
    raw = str(value or "").strip()
    return raw or default


def _bool_to_phrase(value):
    if value is True:
        return "Yes"
    if value is False:
        return "No"
    return "Not provided"


def _has_meaningful_value(value):
    if value is None:
        return False
    if isinstance(value, bool):
        return True
    if isinstance(value, (int, float)):
        return True
    if isinstance(value, str):
        return value.strip().lower() not in {"", "not provided", "unknown", "n/a", "none"}
    if isinstance(value, list):
        return any(_has_meaningful_value(item) for item in value)
    if isinstance(value, dict):
        return any(_has_meaningful_value(item) for item in value.values())
    return bool(value)


def _generated_at_manila_iso():
    return get_current_manila_datetime().replace(microsecond=0).isoformat()


def build_ai_support_metadata(case_context, missing_information=None, mode="admin"):
    sources = []
    missing_context = list(missing_information or [])

    pet = case_context.get("pet") or {}
    current_record = case_context.get("current_record") or {}
    current_visit = case_context.get("current_visit") or {}
    visit_history = case_context.get("visit_history") if isinstance(case_context.get("visit_history"), list) else []

    if _has_meaningful_value(pet):
        sources.append("pet profile")
    if _has_meaningful_value(current_record):
        sources.append("current record")
    if _has_meaningful_value(current_visit):
        sources.append("current visit")
    if visit_history:
        sources.append("visit history")
    if any(_has_meaningful_value((visit or {}).get("medical_information")) for visit in visit_history):
        sources.append("medical intake")
    if any(_has_meaningful_value((visit or {}).get("clinical_exam")) for visit in visit_history):
        sources.append("clinical exam entries")
    if any(_has_meaningful_value((visit or {}).get("lab_results")) for visit in visit_history):
        sources.append("lab results")
    if any(_has_meaningful_value((visit or {}).get("prescriptions")) for visit in visit_history):
        sources.append("prescriptions")

    if mode == "doctor" and not visit_history:
        missing_context.append("Visit history")
    if mode == "doctor" and not any(_has_meaningful_value((visit or {}).get("clinical_exam")) for visit in visit_history):
        missing_context.append("Clinical exam findings")

    deduped_sources = list(dict.fromkeys(sources))
    deduped_missing = list(dict.fromkeys(item for item in missing_context if _has_meaningful_value(item)))

    if len(deduped_sources) >= 5 and len(deduped_missing) <= 2:
        reliability = "High"
        reason = "Generated from multiple relevant record sources with few major gaps."
    elif len(deduped_sources) >= 3 and len(deduped_missing) <= 5:
        reliability = "Moderate"
        reason = "Generated from useful case data, but some context still needs review."
    else:
        reliability = "Low"
        reason = "Generated from limited case data or several missing clinical details."

    reasons = [reason]
    if deduped_missing:
        reasons.append("Missing or incomplete: " + ", ".join(deduped_missing[:4]))

    return {
        "label": "AI-generated clinical support",
        "review_required": True,
        "reliability": reliability,
        "reasons": reasons,
        "sources": deduped_sources,
        "missing_context": deduped_missing,
        "generated_at": _generated_at_manila_iso(),
        "disclaimer": "Review and verify before use. This output does not diagnose, prescribe, or replace veterinary judgment.",
    }


def attach_ai_support_metadata(ai_result, case_context, mode="admin"):
    result = dict(ai_result or {})
    result["support_metadata"] = build_ai_support_metadata(
        case_context,
        result.get("missing_information") if isinstance(result.get("missing_information"), list) else [],
        mode,
    )
    return result


def _normalized_text(value):
    return str(value or "").strip().lower()


def _answer_is_yes(value):
    return _normalized_text(value) in {"yes", "true", "1", "y"}


def _answer_is_no(value):
    return _normalized_text(value) in {"no", "false", "0", "n"}


def _make_risk_flag(flag_id, severity, title, detail, action, source):
    return {
        "id": flag_id,
        "severity": severity,
        "title": title,
        "detail": detail,
        "suggested_action": action,
        "source": source,
    }


def _make_follow_up_reminder(reminder_id, priority, title, detail, timing, action, source):
    return {
        "id": reminder_id,
        "priority": priority,
        "title": title,
        "detail": detail,
        "suggested_timing": timing,
        "suggested_action": action,
        "source": source,
    }


def build_admin_ai_case_context(payload):
    medical = payload.get("medicalInformation") or payload.get("medical_information") or {}

    return {
        "patient_name": _text_or_default(payload.get("name")),
        "patient_email": _text_or_default(
            payload.get("email")
            or payload.get("patientEmail")
            or payload.get("patient_email")
            or payload.get("walk_in_email")
        ),
        "patient_phone": _text_or_default(
            payload.get("phone")
            or payload.get("contact_number")
            or payload.get("patientPhone")
            or payload.get("patient_phone")
            or payload.get("walk_in_phone")
        ),
        "reason_for_visit": _text_or_default(
            payload.get("reasonForVisit")
            or payload.get("patient_reason")
            or payload.get("reason")
        ),
        "reschedule_reason": _text_or_default(
            payload.get("rescheduleReason")
            or payload.get("reschedule_reason")
        ),
        "pet_name": _text_or_default(payload.get("petName") or payload.get("pet_name"), "Unknown Pet"),
        "pet_type": _text_or_default(
            payload.get("type")
            or payload.get("petType")
            or payload.get("pet_type")
            or payload.get("walk_in_pet_type"),
            "Unknown"
        ),
        "pet_breed": _text_or_default(
            payload.get("breed")
            or payload.get("petBreed")
            or payload.get("pet_breed")
            or payload.get("walk_in_breed"),
            "Unknown"
        ),
        "pet_gender": _text_or_default(
            payload.get("gender")
            or payload.get("petGender")
            or payload.get("pet_gender")
            or payload.get("walk_in_gender"),
            "Unknown"
        ),
        "service": _text_or_default(payload.get("service"), "Appointment"),
        "date_time": _text_or_default(payload.get("date_time"), "Schedule not set"),
        "assigned_doctor": _text_or_default(payload.get("doctor"), "Not Assigned"),
        "branch": _text_or_default(payload.get("branch") or payload.get("branchName")),
        "medical_information": {
            "on_medication": _bool_to_phrase(medical.get("on_medication")),
            "flea_tick_prevention": _bool_to_phrase(medical.get("flea_tick_prevention")),
            "is_vaccinated": _bool_to_phrase(medical.get("is_vaccinated")),
            "is_pregnant": _bool_to_phrase(medical.get("is_pregnant")),
            "has_allergies": _bool_to_phrase(medical.get("has_allergies")),
            "has_skin_condition": _bool_to_phrase(medical.get("has_skin_condition")),
            "medication_details": _text_or_default(medical.get("medication_details")),
            "additional_notes": _text_or_default(medical.get("additional_notes")),
            "reported_symptoms": medical.get("reported_symptoms") or [],
            "owner_symptom_notes": _text_or_default(medical.get("owner_symptom_notes")),
            "symptom_duration": _text_or_default(medical.get("symptom_duration")),
            "eating_status": _text_or_default(medical.get("eating_status")),
            "drinking_status": _text_or_default(medical.get("drinking_status")),
            "worsening_status": _text_or_default(medical.get("worsening_status")),
        }
    }


def build_admin_ai_prompt(case_context):
    service_name = str(case_context.get("service") or "").strip().lower()
    if "boarding" in service_name:
        service_focus = (
            "This is a boarding-related request. Prioritize missing boarding-clearance details "
            "such as vaccination status, parasite prevention, allergies, current medication, "
            "and any condition that staff should confirm before boarding."
        )
    elif "groom" in service_name:
        service_focus = (
            "This is a grooming-related request. Prioritize coat, skin, allergy, parasite, and "
            "medication details that may affect grooming preparation."
        )
    elif "vaccin" in service_name:
        service_focus = (
            "This is a vaccination-related request. Prioritize missing vaccine history, current "
            "health concerns, allergies, and medication details that may affect the visit."
        )
    else:
        service_focus = (
            "This is a general clinic appointment. Prioritize the most relevant admin-facing intake "
            "issues and missing details needed before veterinary review."
        )

    return f"""
You are an AI assistant for veterinary clinic admins.

Your role:
- help admin staff understand the appointment quickly
- summarize the provided case details clearly
- identify possible admin-relevant flags that may need clarification
- suggest follow-up questions for staff before endorsement to the veterinarian
- use symptom intake details when they are provided, especially the reported symptoms, owner notes, duration, appetite, drinking, and worsening status

Rules:
- Do NOT provide a diagnosis
- Do NOT prescribe treatment
- Do NOT claim certainty beyond the provided data
- Keep the summary concise and practical
- Write the summary in 2 to 4 sentences only
- Return at most 4 important_flags
- Return at most 5 follow_up_questions
- Return at most 6 missing_information items
- If data is missing, list it under missing_information
- Do NOT list AI-generated summary fields as missing; staff-side summaries are generated from the raw symptom intake
- If reported_symptoms or owner_symptom_notes are present, do NOT treat symptom intake as missing
- important_flags should focus on intake concerns, missing preventive info, recent medication, skin concerns, pregnancy, and anything that may need staff attention
- If symptom intake is present, reflect it naturally in the summary and use it to improve follow-up questions
- follow_up_questions should be short and directly usable by clinic staff
- Avoid repeating the exact same issue in all sections unless absolutely necessary
- If a field is already clearly identified as missing, prefer one good follow-up question instead of many similar ones
- Make the wording sound professional and suitable for clinic admin use

Service-aware focus:
{service_focus}

Use only the data below.

Case context:
{json.dumps(case_context, indent=2)}
""".strip()


def build_user_symptom_summary_prompt(payload):
    pet = payload.get("pet") or {}
    symptom_intake = payload.get("symptom_intake") or {}

    context = {
        "pet": {
            "name": _text_or_default(pet.get("name"), "Unknown Pet"),
            "species": _text_or_default(pet.get("species"), "Unknown"),
            "breed": _text_or_default(pet.get("breed"), "Unknown"),
            "gender": _text_or_default(pet.get("gender"), "Unknown"),
        },
        "service": _text_or_default(payload.get("service"), "Appointment"),
        "symptom_intake": {
            "selected_symptoms": symptom_intake.get("selected_symptoms") or [],
            "owner_symptom_notes": _text_or_default(symptom_intake.get("owner_symptom_notes")),
            "duration": _text_or_default(symptom_intake.get("duration")),
            "eating_status": _text_or_default(symptom_intake.get("eating_status")),
            "drinking_status": _text_or_default(symptom_intake.get("drinking_status")),
            "worsening_status": _text_or_default(symptom_intake.get("worsening_status")),
        }
    }

    return f"""
You are an AI assistant helping a veterinary clinic collect booking information.

Your role:
- summarize the owner's reported symptoms clearly
- keep the wording neutral and practical
- prepare a short intake-ready summary for clinic staff

Rules:
- Do NOT provide a diagnosis
- Do NOT prescribe treatment
- Do NOT mention probabilities or disease names
- Use only the information provided
- Keep the summary to 1 to 3 sentences
- Write in a professional tone suitable for clinic intake notes
- If no symptoms were clearly reported, say that no specific symptoms were reported during booking

Return a JSON object matching the requested schema.

Booking context:
{json.dumps(context, indent=2)}
""".strip()


def build_doctor_emr_case_context(payload):
    pet = payload.get("pet") or {}
    owner = payload.get("owner") or {}
    current_record = payload.get("current_record") or {}
    current_visit = payload.get("current_visit") or {}
    visit_history = payload.get("visit_history") if isinstance(payload.get("visit_history"), list) else []

    return {
        "pet": {
            "name": _text_or_default(pet.get("name"), "Unknown Pet"),
            "species": _text_or_default(pet.get("species"), "Unknown"),
            "breed": _text_or_default(pet.get("breed"), "Unknown"),
            "gender": _text_or_default(pet.get("gender"), "Unknown"),
            "age": _text_or_default(pet.get("age")),
            "weight": _text_or_default(pet.get("weight")),
            "neutered": _bool_to_phrase(pet.get("neutered")),
            "vaccinated": _bool_to_phrase(pet.get("vaccinated")),
        },
        "owner": {
            "name": _text_or_default(owner.get("name")),
            "contact": _text_or_default(owner.get("contact")),
            "email": _text_or_default(owner.get("email")),
        },
        "current_record": {
            "reason_for_visit": _text_or_default(current_record.get("reason_for_visit")),
            "assigned_doctor": _text_or_default(current_record.get("assigned_doctor")),
        },
        "current_visit": current_visit,
        "visit_history": visit_history[-6:],
    }


def build_doctor_emr_prompt(case_context):
    return f"""
You are an AI assistant supporting a licensed veterinarian reviewing an EMR.

Your role:
- create a concise clinical prep brief from the EMR and booking intake
- highlight relevant history, symptom intake, preventive-care concerns, and owner-reported changes
- suggest exam focus areas and clarifying questions the veterinarian may consider
- help the doctor prepare faster, not replace clinical judgment

Rules:
- Do NOT provide a diagnosis
- Do NOT prescribe treatment
- Do NOT rank diseases or claim probabilities
- Do NOT tell the doctor what final decision to make
- Use cautious language such as "consider checking", "owner reported", and "may be relevant"
- If symptoms are present, connect them to exam focus areas without naming a definitive disease
- If information is missing, list only items that could affect the doctor's assessment
- Return at most 4 important_flags
- Return at most 4 relevant_history items
- Return at most 4 exam_focus items
- Return at most 4 care_continuity_notes items
- Return at most 6 missing_information items
- Keep the summary in 2 to 4 sentences

Interpret the output fields this way:
- summary: doctor-facing clinical prep overview
- important_flags: relevant clinical or intake considerations, not diagnoses
- relevant_history: important previous visits, intake patterns, or findings
- exam_focus: exam areas the veterinarian may consider checking
- care_continuity_notes: continuity reminders for follow-up, meds, vaccines, labs, or owner education
- missing_information: data gaps that may matter before or during exam

Use only the data below.

EMR context:
{json.dumps(case_context, indent=2)}
""".strip()


def call_openai_with_structured_output(prompt, schema, schema_name="structured_output"):
    result = call_openai_with_raw_structured_output(prompt, schema, schema_name=schema_name)
    return {
        "summary": _text_or_default(result.get("summary")),
        "important_flags": result.get("important_flags") if isinstance(result.get("important_flags"), list) else [],
        "follow_up_questions": result.get("follow_up_questions") if isinstance(result.get("follow_up_questions"), list) else [],
        "missing_information": result.get("missing_information") if isinstance(result.get("missing_information"), list) else [],
        "model": OPENAI_MODEL
    }


def build_client_care_summary_prompt(case_context):
    return f"""
You are helping veterinary clinic staff draft a client-friendly care summary.

Rules:
- Use plain language for pet owners.
- Do not diagnose, prescribe, or replace veterinarian judgment.
- Base the summary only on the provided record.
- Keep bullets short and practical.
- Mention that clinic staff should review before sharing when details are incomplete.

Return JSON matching the schema.

Case context:
{json.dumps(case_context, indent=2)}
""".strip()


def build_clinical_risk_flags(case_context):
    flags = []
    current_visit = case_context.get("current_visit") or {}
    medical = current_visit.get("medical_information") or {}
    history = case_context.get("visit_history") if isinstance(case_context.get("visit_history"), list) else []

    if _answer_is_yes(medical.get("on_medication")) or _has_meaningful_value(medical.get("medication_details")):
        flags.append(_make_risk_flag(
            "current-medication",
            "medium",
            "Recent medication reported",
            "Owner intake indicates recent or current medication use.",
            "Confirm medication name, dose, timing, and reason before treatment decisions.",
            "current visit intake",
        ))
    if _answer_is_no(medical.get("flea_tick_prevention")):
        flags.append(_make_risk_flag(
            "parasite-prevention-gap",
            "low",
            "Parasite prevention may be incomplete",
            "Flea/tick prevention was not confirmed in the intake.",
            "Verify prevention status, especially before grooming or boarding.",
            "current visit intake",
        ))
    if _answer_is_no(medical.get("up_to_date_vaccinations")) or _answer_is_no(medical.get("is_vaccinated")):
        flags.append(_make_risk_flag(
            "vaccine-status-gap",
            "medium",
            "Vaccination status needs review",
            "Vaccination status is missing or not up to date.",
            "Check vaccine history and clinic requirements before proceeding.",
            "current visit intake",
        ))
    if _answer_is_yes(medical.get("pregnant")) or _answer_is_yes(medical.get("is_pregnant")):
        flags.append(_make_risk_flag(
            "pregnancy-reported",
            "high",
            "Pregnancy reported",
            "Owner intake indicates the pet may be pregnant.",
            "Use pregnancy-aware handling and confirm with the veterinarian.",
            "current visit intake",
        ))
    if _has_meaningful_value(medical.get("reported_symptoms")) or _has_meaningful_value(medical.get("owner_symptom_notes")):
        flags.append(_make_risk_flag(
            "owner-symptoms",
            "medium",
            "Owner symptoms require review",
            "Owner submitted symptom details that may affect the exam plan.",
            "Review duration, appetite, drinking, and worsening status with the owner.",
            "current visit intake",
        ))
    if any(_has_meaningful_value((visit or {}).get("lab_results")) for visit in history):
        flags.append(_make_risk_flag(
            "previous-labs",
            "low",
            "Previous labs available",
            "Visit history contains lab or diagnostic results.",
            "Review prior interpretations before finalizing today's assessment.",
            "visit history",
        ))

    missing = []
    if not _has_meaningful_value(current_visit.get("clinical_exam")):
        missing.append("Current clinical exam findings")
    if not _has_meaningful_value(medical):
        missing.append("Current medical intake")

    return {
        "summary": "Clinical support flags were prepared from the current visit and recent EMR history.",
        "flags": flags[:6],
        "missing_information": missing,
        "model": "rules",
        "support_metadata": build_ai_support_metadata(case_context, missing, mode="doctor"),
    }


def build_follow_up_reminders(case_context):
    reminders = []
    current_visit = case_context.get("current_visit") or {}
    medical = current_visit.get("medical_information") or {}
    history = case_context.get("visit_history") if isinstance(case_context.get("visit_history"), list) else []

    if _has_meaningful_value(current_visit.get("prescriptions")):
        reminders.append(_make_follow_up_reminder(
            "prescription-check",
            "high",
            "Medication follow-up",
            "Current visit includes prescription details.",
            "Within the medication course or as directed by the veterinarian.",
            "Confirm owner understands dosage, duration, and warning signs.",
            "current visit",
        ))
    if _has_meaningful_value(current_visit.get("vaccination_details")):
        reminders.append(_make_follow_up_reminder(
            "vaccine-next-due",
            "medium",
            "Vaccine continuity",
            "Vaccination details were recorded for this visit.",
            "Use the next due date in the vaccination record.",
            "Schedule or remind owner about the next vaccine due date.",
            "current visit",
        ))
    if _has_meaningful_value(current_visit.get("lab_results")):
        reminders.append(_make_follow_up_reminder(
            "lab-review",
            "high",
            "Lab result review",
            "Current visit includes lab results or interpretations.",
            "As soon as results are finalized.",
            "Review results with the veterinarian and communicate owner instructions.",
            "current visit",
        ))
    if _has_meaningful_value(medical.get("reported_symptoms")) or _has_meaningful_value(medical.get("owner_symptom_notes")):
        reminders.append(_make_follow_up_reminder(
            "symptom-recheck",
            "medium",
            "Symptom recheck",
            "Owner reported symptoms during intake.",
            "Follow clinic guidance after today's exam.",
            "Document whether symptoms improve, persist, or worsen.",
            "current visit intake",
        ))
    if not reminders and history:
        reminders.append(_make_follow_up_reminder(
            "routine-continuity",
            "low",
            "Routine care continuity",
            "No urgent follow-up trigger was detected from the provided data.",
            "At the next routine wellness or service interval.",
            "Confirm preventive care, vaccines, and owner concerns.",
            "visit history",
        ))

    missing = []
    if not _has_meaningful_value(current_visit):
        missing.append("Current visit details")

    return {
        "summary": "Follow-up reminders were prepared from the current visit details and EMR history.",
        "reminders": reminders[:6],
        "missing_information": missing,
        "model": "rules",
        "support_metadata": build_ai_support_metadata(case_context, missing, mode="doctor"),
    }



def build_ai_error_payload(error, fallback_message):
    message = str(error or "")
    lowered = message.lower()
    busy_markers = (
        "429", "503", "overload", "overloaded", "busy", "rate limit",
        "resource_exhausted", "unavailable", "quota", "high demand",
    )
    if any(marker in lowered for marker in busy_markers):
        return {"error": AI_BUSY_MESSAGE}, 503
    if "missing openai_api_key" in lowered:
        return {"error": "AI service is not configured yet."}, 500
    return {"error": fallback_message}, 502


def generate_user_symptom_summary(payload):
    payload = payload or {}
    if not payload:
        return {"error": "Symptom intake context is required"}, 400
    try:
        prompt = build_user_symptom_summary_prompt(payload)
        ai_result = call_openai_with_structured_output(prompt, USER_SYMPTOM_SUMMARY_SCHEMA, "user_symptom_summary")
        summary = str(ai_result.get("summary") or "").strip()
        if not summary:
            return {"error": "AI summary could not be generated"}, 502
        return {"summary": summary, "model": OPENAI_MODEL}, 200
    except ValueError as value_error:
        return build_ai_error_payload(value_error, "Unable to generate the symptom summary right now.")
    except Exception as e:
        print("Symptom summary AI error:", str(e))
        return build_ai_error_payload(e, "Unable to generate the symptom summary right now.")


def generate_admin_appointment_summary(payload):
    payload = payload or {}
    if not payload:
        return {"error": "Appointment context is required"}, 400
    try:
        case_context = build_admin_ai_case_context(payload)
        prompt = build_admin_ai_prompt(case_context)
        ai_result = call_openai_with_structured_output(prompt, ADMIN_AI_SUMMARY_SCHEMA, "admin_appointment_summary")
        return {"summary": ai_result, "caseContext": case_context}, 200
    except ValueError as e:
        return build_ai_error_payload(e, "Unable to generate the AI summary right now.")
    except Exception as e:
        print("Admin AI summary error:", str(e))
        return build_ai_error_payload(e, "Unable to generate the AI summary right now.")


def generate_doctor_emr_brief(payload):
    payload = payload or {}
    if not payload:
        return {"error": "EMR context is required"}, 400
    try:
        case_context = build_doctor_emr_case_context(payload)
        prompt = build_doctor_emr_prompt(case_context)
        ai_result = call_openai_with_raw_structured_output(prompt, DOCTOR_EMR_BRIEF_SCHEMA, "doctor_emr_brief")
        ai_result = attach_ai_support_metadata(ai_result, case_context, mode="doctor")
        pet_name = ((payload.get("pet") or {}).get("name") or "this pet").strip() or "this pet"
        record_emr_audit_event(
            "Doctor AI EMR Brief Generated",
            data=payload,
            record_id=payload.get("recordId") or payload.get("record_id"),
            target=f"{pet_name} EMR Brief",
            target_type="emr_ai_brief",
            target_id=payload.get("recordId") or payload.get("record_id") or payload.get("petId") or payload.get("pet_id"),
            summary=f"Doctor AI EMR brief was generated for {pet_name}.",
            status="Success",
            metadata={"pet_id": payload.get("petId") or payload.get("pet_id"), "visit_count": len(case_context.get("visit_history") or []), "model": OPENAI_MODEL},
        )
        return {"summary": ai_result, "caseContext": case_context}, 200
    except ValueError as e:
        record_emr_audit_event("Doctor AI EMR Brief Failed", data=payload, record_id=payload.get("recordId") or payload.get("record_id"), target="EMR Brief", target_type="emr_ai_brief", target_id=payload.get("recordId") or payload.get("record_id") or payload.get("petId") or payload.get("pet_id"), summary=f"Doctor AI EMR brief generation failed: {str(e)}", status="Failed")
        return build_ai_error_payload(e, "Unable to generate the EMR prep brief right now.")
    except Exception as e:
        print("Doctor EMR AI brief error:", str(e))
        record_emr_audit_event("Doctor AI EMR Brief Failed", data=payload, record_id=payload.get("recordId") or payload.get("record_id"), target="EMR Brief", target_type="emr_ai_brief", target_id=payload.get("recordId") or payload.get("record_id") or payload.get("petId") or payload.get("pet_id"), summary=f"Doctor AI EMR brief generation failed: {str(e)}", status="Failed")
        return build_ai_error_payload(e, "Unable to generate the EMR prep brief right now.")


def generate_clinical_risk_flags(payload):
    payload = payload or {}
    if not payload:
        return {"error": "EMR context is required"}, 400
    try:
        case_context = build_doctor_emr_case_context(payload)
        risk_flags = build_clinical_risk_flags(case_context)
        return {"riskFlags": risk_flags, "caseContext": case_context}, 200
    except Exception as e:
        print("Clinical risk flags error:", str(e))
        return build_ai_error_payload(e, "Unable to generate clinical risk flags right now.")


def generate_follow_up_reminders(payload):
    payload = payload or {}
    if not payload:
        return {"error": "EMR context is required"}, 400
    try:
        case_context = build_doctor_emr_case_context(payload)
        follow_up_reminders = build_follow_up_reminders(case_context)
        return {"followUpReminders": follow_up_reminders, "caseContext": case_context}, 200
    except Exception as e:
        print("Follow-up reminders error:", str(e))
        return build_ai_error_payload(e, "Unable to generate follow-up reminders right now.")


def generate_client_care_summary(payload):
    payload = payload or {}
    if not payload:
        return {"error": "EMR context is required"}, 400
    try:
        case_context = build_doctor_emr_case_context(payload)
        prompt = build_client_care_summary_prompt(case_context)
        ai_result = call_openai_with_raw_structured_output(prompt, CLIENT_CARE_SUMMARY_SCHEMA, "client_care_summary")
        ai_result = attach_ai_support_metadata(ai_result, case_context, mode="doctor")
        return {"clientCareSummary": ai_result, "caseContext": case_context}, 200
    except ValueError as e:
        return build_ai_error_payload(e, "Unable to generate the client care summary right now.")
    except Exception as e:
        print("Client care summary error:", str(e))
        return build_ai_error_payload(e, "Unable to generate the client care summary right now.")