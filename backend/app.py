from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import create_client, Client
from dotenv import load_dotenv
import os
import json
import random
import re
import string
import secrets
import hashlib
import uuid
import time
from urllib import error as urllib_error
from urllib import request as urllib_request
from datetime import datetime, timedelta, date, timezone
import smtplib
import ssl
from html import escape
from zoneinfo import ZoneInfo
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import resend

day_availability_store = {
    "sunday": False,
    "monday": True,
    "tuesday": True,
    "wednesday": True,
    "thursday": True,
    "friday": True,
    "saturday": False,
}
time_slots_store = {
    day: [] for day in ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
}
special_dates_store = []

BILLING_TAX_RATE = 0.12
BILLING_DISCOUNT_RATES = {
    "senior": 0.20,
    "pwd": 0.20,
    "promo": 0.10,
}
BILLING_TABLES_SETUP_MESSAGE = "Billing tables are not ready yet. Run backend/sql/billing_schema.sql first."
BILLING_SERVICE_SEED_ROWS = [
    {
        "service_code": "GROOM-BASIC",
        "service_name": "Basic Grooming",
        "service_category": "Grooming",
        "service_subcategory": "Pet Grooming",
        "unit_price": 500.00,
        "description": "Bath, brush, nail trim",
    },
    {
        "service_code": "GROOM-FULL",
        "service_name": "Full Grooming",
        "service_category": "Grooming",
        "service_subcategory": "Pet Grooming",
        "unit_price": 800.00,
        "description": "Bath, haircut, nail trim, ear cleaning",
    },
    {
        "service_code": "GROOM-DELUXE",
        "service_name": "Deluxe Grooming",
        "service_category": "Grooming",
        "service_subcategory": "Pet Grooming",
        "unit_price": 1200.00,
        "description": "Full grooming plus teeth brushing and perfume",
    },
    {
        "service_code": "GROOM-NAIL",
        "service_name": "Nail Trim Only",
        "service_category": "Grooming",
        "service_subcategory": "Pet Grooming",
        "unit_price": 200.00,
        "description": "Nail clipping and filing",
    },
    {
        "service_code": "GROOM-BATH",
        "service_name": "Bath Only",
        "service_category": "Grooming",
        "service_subcategory": "Pet Grooming",
        "unit_price": 300.00,
        "description": "Shampoo, conditioner, blow dry",
    },
    {
        "service_code": "CONSULT-CHECKUP",
        "service_name": "Consultation & Check-Up",
        "service_category": "Consultation",
        "service_subcategory": "Consultation & Check-Up",
        "unit_price": 500.00,
        "description": "Preventative service to assess your pet's overall health",
    },
    {
        "service_code": "DENTAL-PROPHY",
        "service_name": "Dental Prophylaxis",
        "service_category": "Dental",
        "service_subcategory": "Dental Prophylaxis",
        "unit_price": 800.00,
        "description": "Teeth cleaning, plaque removal, oral health check",
    },
    {
        "service_code": "BOARDING",
        "service_name": "Pet Boarding",
        "service_category": "Boarding",
        "service_subcategory": "Pet Boarding",
        "unit_price": 1200.00,
        "description": "Overnight stay, feeding, supervision",
    },
    {
        "service_code": "CONFINEMENT",
        "service_name": "Confinement",
        "service_category": "Confinement",
        "service_subcategory": "Confinement",
        "unit_price": 2500.00,
        "description": "Medical care, monitoring, IV fluids, medication",
    },
    {
        "service_code": "XRAY",
        "service_name": "X-Ray",
        "service_category": "Diagnostics",
        "service_subcategory": "Imaging",
        "unit_price": 1500.00,
        "description": "Radiography for bone, chest, abdominal imaging",
    },
    {
        "service_code": "ULTRASOUND",
        "service_name": "Ultrasound",
        "service_category": "Diagnostics",
        "service_subcategory": "Imaging",
        "unit_price": 2000.00,
        "description": "Soft tissue, abdominal, cardiac, pregnancy check",
    },
    {
        "service_code": "LAB-CBC",
        "service_name": "Complete Blood Count",
        "service_category": "Diagnostics",
        "service_subcategory": "Laboratory Tests",
        "unit_price": 800.00,
        "description": "CBC with differential",
    },
    {
        "service_code": "LAB-CHEM",
        "service_name": "Blood Chemistry",
        "service_category": "Diagnostics",
        "service_subcategory": "Laboratory Tests",
        "unit_price": 1200.00,
        "description": "Liver, kidney, glucose levels",
    },
    {
        "service_code": "LAB-URINALYSIS",
        "service_name": "Urinalysis",
        "service_category": "Diagnostics",
        "service_subcategory": "Laboratory Tests",
        "unit_price": 400.00,
        "description": "Complete urine analysis",
    },
    {
        "service_code": "LAB-FECAL",
        "service_name": "Fecal Examination",
        "service_category": "Diagnostics",
        "service_subcategory": "Laboratory Tests",
        "unit_price": 350.00,
        "description": "Parasite and bacteria check",
    },
    {
        "service_code": "VACCINATIONS",
        "service_name": "Vaccinations",
        "service_category": "Vaccinations",
        "service_subcategory": "Vaccinations",
        "unit_price": 1200.00,
        "description": "Core vaccines, boosters, rabies shot",
    },
]
BILLING_SERVICE_ALIASES = {
    "checkup": "Consultation & Check-Up",
    "consultation": "Consultation & Check-Up",
    "general consultation": "Consultation & Check-Up",
    "consultation and check up": "Consultation & Check-Up",
    "consultation and check-up": "Consultation & Check-Up",
    "checkup or consultation": "Consultation & Check-Up",
    "check-up or consultation": "Consultation & Check-Up",
    "vaccination": "Vaccinations",
    "vaccine": "Vaccinations",
    "dental cleaning": "Dental Prophylaxis",
    "cbc": "Complete Blood Count",
    "fecalysis": "Fecal Examination",
    "xray": "X-Ray",
    "x ray": "X-Ray",
    "radiology": "X-Ray",
    "radiology x ray": "X-Ray",
    "boarding": "Pet Boarding",
}


def title_name(value):
    return (value or "").replace("_", " ").title()


def build_display_name(profile):
    full = f"{profile.get('firstName', '')} {profile.get('lastName', '')}".strip()
    return full or profile.get('username') or profile.get('email') or "Unknown"


def get_current_manila_date():
    try:
        return datetime.now(ZoneInfo("Asia/Manila")).date()
    except Exception:
        return date.today()


def get_current_manila_datetime():
    try:
        return datetime.now(ZoneInfo("Asia/Manila"))
    except Exception:
        return datetime.utcnow() + timedelta(hours=8)


def normalize_db_time(value):
    raw = (value or "").strip()
    if not raw:
        return ""

    if " - " in raw:
        raw = raw.split(" - ")[0].strip()

    for fmt in ("%H:%M:%S", "%H:%M", "%I:%M %p", "%I:%M:%S %p"):
        try:
            return datetime.strptime(raw, fmt).strftime("%H:%M:%S")
        except ValueError:
            continue

    return raw


def format_time_for_email(value):
    normalized = normalize_db_time(value)
    if not normalized:
        return "TBD"
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(normalized, fmt).strftime("%I:%M %p").lstrip("0")
        except ValueError:
            continue
    return normalized


def format_date_for_email(value):
    raw = (value or "").strip()
    if not raw:
        return "TBD"
    for fmt in ("%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(raw, fmt).strftime("%B %d, %Y")
        except ValueError:
            continue
    return raw


def send_html_email(to_email, subject, html):
    if not to_email:
        raise ValueError("Recipient email is required")

    provider = EMAIL_PROVIDER

    if provider == "smtp":
        if not SMTP_FROM_EMAIL or not SMTP_PASSWORD:
            raise ValueError("SMTP email configuration is incomplete")

        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = SMTP_FROM_EMAIL
        message["To"] = to_email
        message.attach(MIMEText(html, "html"))

        if SMTP_USE_SSL:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ssl.create_default_context()) as server:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.sendmail(SMTP_FROM_EMAIL, [to_email], message.as_string())
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                if SMTP_USE_TLS:
                    server.starttls(context=ssl.create_default_context())
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.sendmail(SMTP_FROM_EMAIL, [to_email], message.as_string())

        return {"provider": "smtp", "to": to_email, "subject": subject}

    if not RESEND_API_KEY:
        raise ValueError("Resend email configuration is incomplete")

    return resend.Emails.send({
        "from": RESEND_FROM_EMAIL,
        "to": [to_email],
        "subject": subject,
        "html": html,
    })


def send_appointment_email_safely(send_fn, *args, context="Appointment email"):
    try:
        send_fn(*args)
        return True
    except Exception as e:
        print(f"{context} error: {e}")
        return False


def send_appointment_status_email(notification_type, patient_email, patient_name, pet_name, service, appointment_date, appointment_time, reason=""):
    if not patient_email:
        raise ValueError("Patient email is missing")

    safe_patient = patient_name or "Patient"
    safe_pet = pet_name or "your pet"
    safe_service = service or "appointment"
    display_date = format_date_for_email(appointment_date)
    display_time = format_time_for_email(appointment_time)
    reason_html = f"<p><strong>Reason:</strong> {reason}</p>" if reason else ""

    if notification_type == "cancelled":
        subject = "Your PawRang Appointment Has Been Cancelled"
        heading = "Appointment Cancelled"
        intro = f"Hello {safe_patient}, your appointment for <strong>{safe_pet}</strong> has been cancelled by the clinic."
    elif notification_type == "rescheduled":
        subject = "Your PawRang Appointment Has Been Rescheduled"
        heading = "Appointment Rescheduled"
        intro = f"Hello {safe_patient}, your appointment for <strong>{safe_pet}</strong> has been rescheduled by the clinic."
    else:
        raise ValueError(f"Unsupported notification type: {notification_type}")

    html = f"""
        <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
            <h2>{heading}</h2>
            <p>{intro}</p>
            <p><strong>Service:</strong> {safe_service}</p>
            <p><strong>Date:</strong> {display_date}</p>
            <p><strong>Time:</strong> {display_time}</p>
            {reason_html}
            <p>If you have any questions, please contact the clinic.</p>
            <p>Thank you,<br/>PawRang Veterinary Clinic</p>
        </div>
    """

    send_html_email(patient_email, subject, html)


def send_reschedule_review_email(to_email, patient_name, pet_name, service_name, appointment_date, appointment_time, action='accepted', clinic_note=None):
    if not to_email:
        return False

    normalized_action = (action or 'accepted').strip().lower()
    is_accepted = normalized_action == 'accepted'
    display_date = format_date_for_email(appointment_date)
    display_time = appointment_time or "Not provided"

    if is_accepted:
        subject = "Preferred Reschedule Confirmed"
        title = "Preferred Schedule Confirmed"
        intro = f"Hello {patient_name or 'Patient'}, the clinic has accepted your preferred reschedule for <strong>{pet_name or 'your pet'}</strong>."
        body = "<p>Your appointment has been updated to the confirmed schedule above.</p><p>If you need further changes, please contact the clinic.</p>"
    else:
        subject = "Preferred Reschedule Update"
        title = "Preferred Schedule Declined"
        intro = f"Hello {patient_name or 'Patient'}, the clinic reviewed your preferred schedule for <strong>{pet_name or 'your pet'}</strong>, but could not approve it at this time."
        body = "<p>Please wait for another proposed schedule from the clinic, or contact the clinic directly if you would like to discuss other available times.</p>"

    note_html = f"<p><strong>Clinic Note:</strong> {clinic_note}</p>" if clinic_note else ""
    html = f"""
        <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
            <h2>{title}</h2>
            <p>{intro}</p>
            <p><strong>Service:</strong> {service_name or 'Appointment'}</p>
            <p><strong>{'Confirmed' if is_accepted else 'Requested'} Date:</strong> {display_date}</p>
            <p><strong>{'Confirmed' if is_accepted else 'Requested'} Time:</strong> {display_time}</p>
            {note_html}
            {body}
        </div>
    """

    send_html_email(to_email, subject, html)
    return True


def send_appointment_confirmed_email(to_email, patient_name, pet_name, service_name, appointment_date, appointment_time, assigned_doctor=None):
    if not to_email:
        return False

    doctor_html = f"<p><strong>Assigned Doctor:</strong> {assigned_doctor}</p>" if assigned_doctor else ""
    html = f"""
        <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
            <h2>Appointment Confirmed</h2>
            <p>Hello {patient_name or 'Patient'},</p>
            <p>Your appointment for <strong>{pet_name or 'your pet'}</strong> has been confirmed by the clinic.</p>
            <p><strong>Service:</strong> {service_name or 'Appointment'}</p>
            <p><strong>Date:</strong> {format_date_for_email(appointment_date)}</p>
            <p><strong>Time:</strong> {appointment_time or 'TBD'}</p>
            {doctor_html}
            <p>If you have any questions, please contact the clinic.</p>
            <p>Thank you,<br/>PawRang Veterinary Clinic</p>
        </div>
    """

    send_html_email(to_email, "Appointment Confirmed", html)
    return True


def send_reschedule_email(to_email, patient_name, pet_name, service_name, new_date, new_time, reason=None, action_links=None):
    if not to_email:
        return False

    reason_html = f"<p><strong>Reason for rescheduling:</strong> {reason}</p>" if reason else ""
    action_html = ""
    if action_links:
        action_html = f"""
            <div style="margin: 24px 0;">
                <a href="{action_links.get('confirm')}" style="display:inline-block;padding:12px 18px;background:#2e7d32;color:#fff;text-decoration:none;border-radius:8px;margin-right:10px;">Confirm New Schedule</a>
                <a href="{action_links.get('choose_another')}" style="display:inline-block;padding:12px 18px;background:#1565c0;color:#fff;text-decoration:none;border-radius:8px;margin-right:10px;">Choose Another Date</a>
                <a href="{action_links.get('cancel')}" style="display:inline-block;padding:12px 18px;background:#c62828;color:#fff;text-decoration:none;border-radius:8px;">Cancel Appointment</a>
            </div>
        """

    html = f"""
        <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
            <h2>Reschedule Request</h2>
            <p>Hello {patient_name or 'Patient'},</p>
            <p>The clinic is proposing a new schedule for <strong>{pet_name or 'your pet'}</strong>.</p>
            <p><strong>Service:</strong> {service_name or 'Appointment'}</p>
            <p><strong>Proposed Date:</strong> {format_date_for_email(new_date)}</p>
            <p><strong>Proposed Time:</strong> {new_time or 'Not provided'}</p>
            {reason_html}
            {action_html}
            <p>Your current appointment will stay unchanged until you confirm.</p>
            <p>If you have questions, please contact the clinic.</p>
        </div>
    """

    send_html_email(to_email, "Appointment reschedule request", html)
    return True


def send_cancellation_email(to_email, patient_name, pet_name, service_name, appointment_date, appointment_time, reason=None):
    if not to_email:
        return False

    reason_html = f"<p><strong>Reason for cancellation:</strong> {reason}</p>" if reason else ""
    html = f"""
        <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
            <h2>Appointment Cancelled</h2>
            <p>Hello {patient_name or 'Patient'},</p>
            <p>Your appointment for <strong>{pet_name or 'your pet'}</strong> has been cancelled by the clinic.</p>
            <p><strong>Service:</strong> {service_name or 'Appointment'}</p>
            <p><strong>Original Date:</strong> {format_date_for_email(appointment_date)}</p>
            <p><strong>Original Time:</strong> {appointment_time or 'Not provided'}</p>
            {reason_html}
            <p>If you would like to book a new appointment, please contact the clinic or use the booking page.</p>
            <p>We apologize for the inconvenience.</p>
        </div>
    """

    send_html_email(to_email, "Appointment cancellation notice", html)
    return True


def send_booking_confirmation_email(to_email, patient_name, pet_name, service_name, appointment_date, appointment_time, appointment_status='pending'):
    if not to_email:
        return False

    normalized_status = (appointment_status or 'pending').strip().lower()
    is_pending = normalized_status == 'pending'
    status_html = (
        """
        <p>Your request has been received and is currently <strong>under review</strong>.</p>
        <p>We will send you another email once the clinic confirms your schedule.</p>
        """
        if is_pending else
        """
        <p>Your appointment has been successfully booked.</p>
        """
    )

    html = f"""
        <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
            <h2>Appointment Booking Confirmation</h2>
            <p>Hello {patient_name or 'Patient'},</p>
            <p>We have received the appointment request for <strong>{pet_name or 'your pet'}</strong>.</p>
            <p><strong>Service:</strong> {service_name or 'Appointment'}</p>
            <p><strong>Date:</strong> {format_date_for_email(appointment_date)}</p>
            <p><strong>Time:</strong> {appointment_time or 'Not provided'}</p>
            {status_html}
            <p>If any detail needs to change, please contact the clinic.</p>
        </div>
    """

    send_html_email(to_email, "Appointment request received" if is_pending else "Appointment booking confirmation", html)
    return True


def format_admin_appointment(appointment, patients_by_id, pets_by_id, doctors_by_id):
    owner = patients_by_id.get(appointment.get("owner_id"), {})
    pet = pets_by_id.get(appointment.get("pet_id"), {})
    doctor_id = appointment.get("assigned_doctor_id") or appointment.get("doctor_id")
    doctor_profile = doctors_by_id.get(doctor_id, {}) if doctor_id else {}
    doctor_name = (
        f"{doctor_profile.get('first_name', '')} {doctor_profile.get('last_name', '')}".strip()
        or doctor_profile.get("username")
        or "Not Assigned"
    )

    date_part = appointment.get("appointment_date") or ""
    time_part = appointment.get("appointment_time") or ""
    date_time = f"{date_part} - {time_part}" if date_part or time_part else ""

    return {
        "id": appointment.get("appointment_id"),
        "appointment_id": appointment.get("appointment_id"),
        "name": build_display_name(owner),
        "patient_email": owner.get("email"),
        "patient_phone": owner.get("contact_number"),
        "service": appointment.get("appointment_type") or "Unknown",
        "date_time": date_time,
        "status": (appointment.get("status") or "pending").lower(),
        "doctor": doctor_name,
        "assignedDoctor": doctor_id,
        "pet_name": pet.get("pet_name"),
        "pet_type": pet.get("pet_species"),
        "petGender": pet.get("pet_gender"),
        "reasonForVisit": appointment.get("patient_reason") or "",
    }


def load_admin_appointments():
    appointments = supabase_admin.table("appointments").select("*").execute().data or []
    patients = supabase_admin.table("patient_account").select("*").execute().data or []
    pets = supabase_admin.table("pet_profile").select("*").execute().data or []
    doctors = supabase_admin.table("employee_accounts").select("*").execute().data or []

    patients_by_id = {item.get("id"): item for item in patients}
    pets_by_id = {item.get("pet_id"): item for item in pets}
    doctors_by_id = {
        item.get("id"): item for item in doctors
        if (item.get("role") or "").lower() in ("vet", "doctor", "veterinarian", "receptionist", "admin")
    }

    return [
        build for build in (
            format_admin_appointment(item, patients_by_id, pets_by_id, doctors_by_id)
            for item in appointments
        )
    ]

load_dotenv()
app = Flask(__name__)
CORS(app, resources={r'/*': {'origins': '*'}})

SUPABASE_URL         = os.environ.get('SUPABASE_URL')
SUPABASE_KEY         = os.environ.get('SUPABASE_KEY')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')
RESEND_API_KEY       = (os.environ.get('RESEND_API_KEY') or '').strip() or None
RESEND_FROM_EMAIL    = (os.environ.get('RESEND_FROM_EMAIL') or 'onboarding@resend.dev').strip()
SMTP_HOST            = (os.environ.get('SMTP_HOST') or 'smtp.gmail.com').strip()
SMTP_PORT            = int(os.environ.get('SMTP_PORT', '587'))
SMTP_EMAIL           = (os.environ.get('SMTP_EMAIL') or '').strip() or None
SMTP_PASSWORD        = (os.environ.get('SMTP_PASSWORD') or '').strip() or None
SMTP_USERNAME        = (os.environ.get('SMTP_USERNAME') or SMTP_EMAIL or '').strip() or None
SMTP_FROM_EMAIL      = (os.environ.get('SMTP_FROM_EMAIL') or SMTP_EMAIL or '').strip() or None
SMTP_USE_TLS         = os.environ.get('SMTP_USE_TLS', 'true').strip().lower() not in {'0', 'false', 'no'}
SMTP_USE_SSL         = os.environ.get('SMTP_USE_SSL', 'false').strip().lower() in {'1', 'true', 'yes'}
EMAIL_PROVIDER       = (
    os.environ.get('EMAIL_PROVIDER', '').strip().lower()
    or ('smtp' if SMTP_EMAIL and SMTP_PASSWORD else 'resend')
)
EMPLOYEE_SETUP_URL_BASE = os.environ.get('EMPLOYEE_SETUP_URL_BASE', 'http://localhost:5173/employee/setup-account')
GEMINI_API_KEY       = os.environ.get('GEMINI_API_KEY')
GEMINI_MODEL         = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')
OPENAI_API_KEY       = (os.environ.get('OPENAI_API_KEY') or '').strip() or None
OPENAI_MODEL         = (os.environ.get('OPENAI_MODEL') or 'gpt-5-mini').strip()
OPENAI_MAX_OUTPUT_TOKENS = int(os.environ.get('OPENAI_MAX_OUTPUT_TOKENS') or '800')
AI_PROVIDER          = (
    os.environ.get('AI_PROVIDER', '').strip().lower()
    or ('openai' if OPENAI_API_KEY else 'gemini')
)
AI_BUSY_MESSAGE      = "Server is busy. Please try again later."

if not SUPABASE_URL or not SUPABASE_KEY or not SUPABASE_SERVICE_KEY:
    raise ValueError("Missing Supabase credentials in .env")
if EMAIL_PROVIDER == 'smtp' and (not SMTP_FROM_EMAIL or not SMTP_PASSWORD):
    raise ValueError("Missing SMTP email configuration in .env")
if EMAIL_PROVIDER == 'resend' and not RESEND_API_KEY:
    raise ValueError("Missing RESEND_API_KEY in .env")

supabase       = create_client(SUPABASE_URL, SUPABASE_KEY)
supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

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
        "important_flags": {
            "type": "ARRAY",
            "items": {"type": "STRING"}
        },
        "relevant_history": {
            "type": "ARRAY",
            "items": {"type": "STRING"}
        },
        "exam_focus": {
            "type": "ARRAY",
            "items": {"type": "STRING"}
        },
        "care_continuity_notes": {
            "type": "ARRAY",
            "items": {"type": "STRING"}
        }
    },
    "required": [
        "summary",
        "important_flags",
        "relevant_history",
        "exam_focus",
        "care_continuity_notes"
    ]
}

CLIENT_CARE_SUMMARY_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "summary": {"type": "STRING"},
        "visit_summary": {"type": "STRING"},
        "home_care_instructions": {
            "type": "ARRAY",
            "items": {"type": "STRING"}
        },
        "medication_notes": {
            "type": "ARRAY",
            "items": {"type": "STRING"}
        },
        "watch_for": {
            "type": "ARRAY",
            "items": {"type": "STRING"}
        },
        "follow_up": {
            "type": "ARRAY",
            "items": {"type": "STRING"}
        },
        "friendly_message": {"type": "STRING"},
        "missing_information": {
            "type": "ARRAY",
            "items": {"type": "STRING"}
        }
    },
    "required": [
        "summary",
        "visit_summary",
        "home_care_instructions",
        "medication_notes",
        "watch_for",
        "follow_up",
        "friendly_message",
        "missing_information"
    ]
}

USER_SYMPTOM_SUMMARY_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "summary": {"type": "STRING"}
    },
    "required": ["summary"]
}


def _has_meaningful_value(value):
    if value is None:
        return False
    if isinstance(value, bool):
        return True
    if isinstance(value, (int, float)):
        return True
    if isinstance(value, str):
        cleaned = value.strip().lower()
        return cleaned not in {"", "not provided", "unknown", "n/a", "none"}
    if isinstance(value, list):
        return any(_has_meaningful_value(item) for item in value)
    if isinstance(value, dict):
        return any(_has_meaningful_value(item) for item in value.values())
    return bool(value)


def _generated_at_manila_iso():
    return get_current_manila_datetime().replace(microsecond=0).isoformat()


def build_ai_support_metadata(case_context, missing_information=None, mode="admin"):
    missing_count = len(missing_information or [])
    sources = []
    reasons = []
    missing_context = list(missing_information or [])

    if mode == "doctor":
        pet = case_context.get("pet") or {}
        current_record = case_context.get("current_record") or {}
        visit_history = case_context.get("visit_history") if isinstance(case_context.get("visit_history"), list) else []

        if _has_meaningful_value(pet):
            sources.append("pet profile")
        if _has_meaningful_value(current_record):
            sources.append("current visit details")
        if visit_history:
            sources.append("visit history")
        if any(_has_meaningful_value((visit or {}).get("medical_information")) for visit in visit_history):
            sources.append("booking medical intake")
        if any(_has_meaningful_value(((visit or {}).get("medical_information") or {}).get("reported_symptoms")) for visit in visit_history):
            sources.append("owner symptom intake")
        if any(_has_meaningful_value((visit or {}).get("clinical_exam")) for visit in visit_history):
            sources.append("clinical exam entries")
        if any(_has_meaningful_value((visit or {}).get("lab_results")) for visit in visit_history):
            sources.append("lab or diagnostic results")
        if any(_has_meaningful_value((visit or {}).get("prescriptions")) for visit in visit_history):
            sources.append("prescription history")

        if not visit_history:
            missing_context.append("Visit history")
        if not any(_has_meaningful_value((visit or {}).get("clinical_exam")) for visit in visit_history):
            missing_context.append("Clinical exam findings")
        if not any(_has_meaningful_value(((visit or {}).get("medical_information") or {}).get("reported_symptoms")) for visit in visit_history):
            missing_context.append("Owner symptom intake")
    else:
        medical = case_context.get("medical_information") or {}
        if _has_meaningful_value(case_context.get("patient_name")):
            sources.append("client details")
        if _has_meaningful_value(case_context.get("pet_name")) or _has_meaningful_value(case_context.get("pet_type")):
            sources.append("pet profile")
        if _has_meaningful_value(case_context.get("reason_for_visit")):
            sources.append("reason for visit")
        if _has_meaningful_value(case_context.get("service")) or _has_meaningful_value(case_context.get("date_time")):
            sources.append("appointment details")
        if _has_meaningful_value(medical):
            sources.append("medical intake")
        if _has_meaningful_value(medical.get("reported_symptoms")) or _has_meaningful_value(medical.get("owner_symptom_notes")):
            sources.append("owner symptom intake")

        if not _has_meaningful_value(medical):
            missing_context.append("Medical intake")
        if not (
            _has_meaningful_value(medical.get("reported_symptoms"))
            or _has_meaningful_value(medical.get("owner_symptom_notes"))
        ):
            missing_context.append("Owner symptom intake")

    deduped_sources = list(dict.fromkeys(sources))
    deduped_missing = list(dict.fromkeys(item for item in missing_context if _has_meaningful_value(item)))

    source_count = len(deduped_sources)
    if source_count >= 6 and len(deduped_missing) <= 2 and missing_count <= 2:
        reliability = "High"
        reasons.append("Generated from multiple relevant record sources with few major gaps.")
    elif source_count >= 3 and len(deduped_missing) <= 5:
        reliability = "Moderate"
        reasons.append("Generated from useful case data, but some context still needs review.")
    else:
        reliability = "Low"
        reasons.append("Generated from limited case data or several missing clinical details.")

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


def _text_or_default(value, default="Not provided"):
    raw = str(value or "").strip()
    return raw or default


def _bool_to_phrase(value):
    if value is True:
        return "Yes"
    if value is False:
        return "No"
    return "Not provided"


def _normalized_text(value):
    return str(value or "").strip().lower()


def _answer_is_yes(value):
    return _normalized_text(value) in {"yes", "true", "1", "y"}


def _answer_is_no(value):
    return _normalized_text(value) in {"no", "false", "0", "n"}


def _answer_is_unknown(value):
    return _normalized_text(value) in {"", "not provided", "unknown", "n/a", "none"}


def _make_risk_flag(flag_id, severity, title, detail, action, source):
    return {
        "id": flag_id,
        "severity": severity,
        "title": title,
        "detail": detail,
        "suggested_action": action,
        "source": source,
    }


def _parse_iso_date(value):
    raw = str(value or "").strip()
    if not raw:
        return None
    try:
        return datetime.strptime(raw[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


def _make_follow_up_reminder(reminder_id, priority, title, detail, suggested_timing, suggested_action, source):
    return {
        "id": reminder_id,
        "priority": priority,
        "title": title,
        "detail": detail,
        "suggested_timing": suggested_timing,
        "suggested_action": suggested_action,
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
- Write the summary in 1 to 2 short sentences only
- Return at most 3 important_flags
- Return at most 3 follow_up_questions
- Return at most 4 missing_information items
- Keep every bullet under 14 words when possible
- Prefer one useful point over several similar points
- If data is missing, list it under missing_information
- Do NOT list AI-generated summary fields as missing; staff-side summaries are generated from the raw symptom intake
- If reported_symptoms or owner_symptom_notes are present, do NOT treat symptom intake as missing
- important_flags should focus on intake concerns, missing preventive info, recent medication, skin concerns, pregnancy, and anything that may need staff attention
- If symptom intake is present, reflect it naturally in the summary and use it to improve follow-up questions
- follow_up_questions should be short and directly usable by clinic staff
- Avoid repeating the exact same issue in all sections unless absolutely necessary
- If a field is already clearly identified as missing, prefer one good follow-up question instead of many similar ones
- Make the wording professional, direct, and easy to scan

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
    visit_history = payload.get("visit_history") if isinstance(payload.get("visit_history"), list) else []

    recent_visits = visit_history[-4:]
    symptom_intake = []
    clinical_exam_entries = []
    lab_entries = []
    prescription_entries = []
    service_entries = []

    for visit in recent_visits:
        if not isinstance(visit, dict):
            continue
        medical_information = visit.get("medical_information") or {}
        if _has_meaningful_value(medical_information):
            symptom_intake.append({
                "date": visit.get("date"),
                "reason": visit.get("reason"),
                "reported_symptoms": medical_information.get("reported_symptoms") or [],
                "owner_symptom_notes": medical_information.get("owner_symptom_notes") or "",
                "symptom_duration": medical_information.get("symptom_duration") or "",
                "eating_status": medical_information.get("eating_status") or "",
                "drinking_status": medical_information.get("drinking_status") or "",
                "worsening_status": medical_information.get("worsening_status") or "",
                "allergy_details": medical_information.get("allergy_details") or "",
                "medication_details": medical_information.get("medication_details") or "",
            })
        if _has_meaningful_value(visit.get("clinical_exam")):
            clinical_exam_entries.append({
                "date": visit.get("date"),
                "clinical_exam": visit.get("clinical_exam"),
                "doctor_remarks": visit.get("doctor_remarks") or "",
            })
        if _has_meaningful_value(visit.get("lab_results")):
            lab_entries.append({
                "date": visit.get("date"),
                "lab_results": visit.get("lab_results"),
            })
        if _has_meaningful_value(visit.get("prescriptions")):
            prescription_entries.append({
                "date": visit.get("date"),
                "prescriptions": visit.get("prescriptions"),
            })
        if _has_meaningful_value(visit.get("services")):
            service_entries.append({
                "date": visit.get("date"),
                "services": visit.get("services"),
            })

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
        "recent_visit_history": recent_visits,
        "clinical_signals": {
            "symptom_intake": symptom_intake[-3:],
            "clinical_exam_entries": clinical_exam_entries[-3:],
            "lab_entries": lab_entries[-3:],
            "prescription_entries": prescription_entries[-3:],
            "service_entries": service_entries[-3:],
        },
        "visit_history": recent_visits,
    }


def build_doctor_emr_prompt(case_context):
    return f"""
You are an AI assistant supporting a licensed veterinarian reviewing an EMR.

Your role:
- create a short clinical prep brief from the EMR and booking intake
- highlight relevant history, symptom intake, preventive-care concerns, medications, allergies, labs, prescriptions, and owner-reported changes
- suggest practical exam focus areas and continuity notes the veterinarian may consider
- help the doctor prepare faster, not replace clinical judgment

Rules:
- Do NOT provide a diagnosis
- Do NOT prescribe treatment
- Do NOT rank diseases or claim probabilities
- Do NOT tell the doctor what final decision to make
- Use cautious language such as "consider checking", "owner reported", and "may be relevant"
- If symptoms are present, connect them to exam focus areas without naming a definitive disease
- Do not include owner questions or missing-context sections
- Return at most 2 important_flags
- Return at most 3 relevant_history items
- Return at most 3 exam_focus items
- Return at most 2 care_continuity_notes
- Keep the summary in 1 to 2 short sentences
- Keep every bullet under 14 words when possible
- Avoid repeating the same point across sections

Interpret the output fields this way:
- summary: doctor-facing clinical prep overview
- important_flags: relevant clinical or intake considerations, not diagnoses
- relevant_history: past visits, prescriptions, labs, services, symptom patterns, or owner intake details that may be useful during review
- exam_focus: physical exam areas or measurements the veterinarian may consider checking based on the available data
- care_continuity_notes: follow-up, preventive-care, monitoring, or record-review reminders based only on the EMR

Use only the data below.

EMR context:
{json.dumps(case_context, indent=2)}
""".strip()


def build_current_visit_ai_case_context(payload):
    doctor_context = build_doctor_emr_case_context(payload)
    current_visit = payload.get("current_visit") or {}

    return {
        **doctor_context,
        "current_visit": {
            "date": _text_or_default(current_visit.get("date")),
            "time": _text_or_default(current_visit.get("time")),
            "veterinarian": _text_or_default(current_visit.get("veterinarian")),
            "reason": _text_or_default(current_visit.get("reason")),
            "weight": _text_or_default(current_visit.get("weight")),
            "neutered": _bool_to_phrase(current_visit.get("neutered")),
            "vaccinated": _bool_to_phrase(current_visit.get("vaccinated")),
            "clinical_exam": current_visit.get("clinical_exam") or {},
            "selected_services": current_visit.get("services") or [],
            "lab_results": current_visit.get("lab_results") or [],
            "prescriptions": current_visit.get("prescriptions") or [],
            "vaccination_details": current_visit.get("vaccination_details") or {},
            "existing_doctor_remarks": _text_or_default(current_visit.get("doctor_remarks"), ""),
            "appointment_medical_information": current_visit.get("medical_information") or {},
        }
    }


def build_client_care_summary_prompt(case_context):
    return f"""
You are an AI assistant helping a veterinary clinic draft a client-friendly care summary for a pet owner.

Your role:
- turn the veterinarian-entered visit details into plain, friendly owner-facing language
- summarize what happened during the visit and what the owner should remember
- make the text easy to understand without clinical jargon
- support clinic communication, not replace veterinarian instructions

Rules:
- Do NOT add a diagnosis that is not explicitly documented
- Do NOT add new medication names, dosages, treatments, restrictions, or follow-up dates
- Do NOT make emergency claims unless the source data clearly supports a concern
- If the record lacks enough information for a section, say it needs clinic review before sharing
- Medication notes must only summarize prescriptions already entered in the record
- Follow-up notes must only summarize existing follow-up/reminder data or say the clinic will advise
- Write for the pet owner using warm, simple wording
- Keep visit_summary to 1 to 2 short sentences
- Return at most 3 bullets per list field
- Keep bullet items short and actionable, under 14 words when possible
- Keep friendly_message to one short sentence
- Return at most 3 missing_information items

Interpret the output fields this way:
- summary: one-sentence internal preview of the owner summary
- visit_summary: short owner-facing paragraph
- home_care_instructions: practical home care bullets based only on documented services, notes, or plan
- medication_notes: owner-facing medication bullets based only on entered prescriptions
- watch_for: symptoms or changes the owner should monitor, based only on the record
- follow_up: follow-up/reminder bullets based only on the record
- friendly_message: short closing message suitable for copy/paste to the owner
- missing_information: important missing details staff should review before sharing

Use only the data below.

Care summary context:
{json.dumps(case_context, indent=2)}
""".strip()


def build_clinical_risk_flags(payload):
    case_context = build_current_visit_ai_case_context(payload)
    pet = case_context.get("pet") or {}
    current_visit = case_context.get("current_visit") or {}
    medical_information = current_visit.get("appointment_medical_information") or {}
    clinical_exam = current_visit.get("clinical_exam") or {}
    prescriptions = current_visit.get("prescriptions") if isinstance(current_visit.get("prescriptions"), list) else []
    recent_visits = case_context.get("recent_visit_history") if isinstance(case_context.get("recent_visit_history"), list) else []
    flags = []
    missing_information = []

    has_allergies = medical_information.get("has_allergies")
    allergy_details = medical_information.get("allergy_details")
    if _answer_is_yes(has_allergies) or _has_meaningful_value(allergy_details):
        flags.append(_make_risk_flag(
            "allergy-review",
            "high",
            "Allergy Review Needed",
            f"Allergy information is present{f': {allergy_details}' if _has_meaningful_value(allergy_details) else ''}.",
            "Review allergy details before finalizing medications, vaccines, grooming products, or procedures.",
            "medical intake",
        ))
    elif _answer_is_unknown(has_allergies):
        missing_information.append("Allergy status")

    medications_recent = medical_information.get("medications_in_past_72_hours")
    medication_details = medical_information.get("medication_details")
    if _answer_is_yes(medications_recent) or _has_meaningful_value(medication_details):
        flags.append(_make_risk_flag(
            "current-medication-review",
            "medium",
            "Current Medication Reported",
            f"Owner intake indicates recent medication use{f': {medication_details}' if _has_meaningful_value(medication_details) else ''}.",
            "Confirm medication name, dose, timing, and purpose before adding new prescriptions or procedures.",
            "medical intake",
        ))
    elif _answer_is_unknown(medications_recent):
        missing_information.append("Medication use in past 72 hours")

    eating_status = _normalized_text(medical_information.get("eating_status"))
    if eating_status and eating_status not in {"normal", "same", "unchanged", "not provided", "yes", "eating"}:
        flags.append(_make_risk_flag(
            "appetite-concern",
            "high",
            "Appetite Concern",
            f"Owner reported eating status: {medical_information.get('eating_status')}.",
            "Clarify appetite change, duration, vomiting, stool changes, and hydration status during exam.",
            "owner symptom intake",
        ))

    drinking_status = _normalized_text(medical_information.get("drinking_status"))
    if drinking_status and drinking_status not in {"normal", "same", "unchanged", "not provided", "yes", "drinking"}:
        flags.append(_make_risk_flag(
            "drinking-concern",
            "medium",
            "Drinking Pattern Concern",
            f"Owner reported drinking status: {medical_information.get('drinking_status')}.",
            "Clarify water intake changes and consider hydration assessment during exam.",
            "owner symptom intake",
        ))

    worsening_status = _normalized_text(medical_information.get("worsening_status"))
    if worsening_status and worsening_status not in {"no", "not worsening", "stable", "same", "unchanged", "not provided"}:
        flags.append(_make_risk_flag(
            "worsening-symptoms",
            "high",
            "Symptoms May Be Worsening",
            f"Owner reported condition status: {medical_information.get('worsening_status')}.",
            "Ask when symptoms changed and prioritize reassessment of vitals and current clinical status.",
            "owner symptom intake",
        ))

    vaccinated = medical_information.get("up_to_date_vaccinations") or pet.get("vaccinated")
    if _answer_is_no(vaccinated):
        flags.append(_make_risk_flag(
            "vaccine-gap",
            "medium",
            "Vaccination Gap",
            "Record indicates vaccinations may not be up to date.",
            "Verify vaccine history before boarding, grooming, confinement, vaccination, or exposure-risk services.",
            "pet profile or medical intake",
        ))
    elif _answer_is_unknown(vaccinated):
        missing_information.append("Vaccination status")

    pregnant = medical_information.get("pregnant")
    if _answer_is_yes(pregnant):
        flags.append(_make_risk_flag(
            "pregnancy-review",
            "medium",
            "Pregnancy Status Relevant",
            "Owner intake indicates the pet may be pregnant.",
            "Review pregnancy status before medications, imaging, vaccination, procedures, or grooming stressors.",
            "medical intake",
        ))
    elif _answer_is_unknown(pregnant):
        missing_information.append("Pregnancy status")

    if prescriptions and (_answer_is_yes(has_allergies) or _has_meaningful_value(allergy_details)):
        flags.append(_make_risk_flag(
            "prescription-allergy-check",
            "high",
            "Prescription Allergy Check",
            "This visit includes prescription entries and allergy information is present.",
            "Confirm prescriptions against allergy history before saving or dispensing.",
            "prescriptions and medical intake",
        ))

    if not _has_meaningful_value(clinical_exam.get("temperature")):
        missing_information.append("Temperature")
    if not _has_meaningful_value(clinical_exam.get("heartRate")):
        missing_information.append("Heart rate")
    if not _has_meaningful_value(clinical_exam.get("breathingRate")):
        missing_information.append("Breathing rate")

    recent_symptom_entries = [
        visit for visit in recent_visits
        if _has_meaningful_value(((visit or {}).get("medical_information") or {}).get("reported_symptoms"))
        or _has_meaningful_value(((visit or {}).get("medical_information") or {}).get("owner_symptom_notes"))
    ]
    if len(recent_symptom_entries) >= 2:
        flags.append(_make_risk_flag(
            "recurrent-symptom-review",
            "medium",
            "Repeated Symptom Intake Found",
            "Multiple recent visits include owner symptom intake.",
            "Review recent symptom pattern and whether this visit relates to an unresolved or recurring concern.",
            "visit history",
        ))

    severity_rank = {"high": 3, "medium": 2, "low": 1}
    flags = sorted(flags, key=lambda item: severity_rank.get(item.get("severity"), 0), reverse=True)[:8]
    deduped_missing = list(dict.fromkeys(item for item in missing_information if _has_meaningful_value(item)))[:8]
    high_count = sum(1 for item in flags if item.get("severity") == "high")
    medium_count = sum(1 for item in flags if item.get("severity") == "medium")

    if not flags:
        summary = "No major clinical risk flags were identified from the available intake and visit data."
    elif high_count:
        summary = f"{high_count} high-attention flag{'s' if high_count != 1 else ''} found. Review before finalizing the visit record."
    else:
        summary = f"{medium_count} review flag{'s' if medium_count != 1 else ''} found from the available intake and visit data."

    return {
        "summary": summary,
        "flags": flags,
        "missing_information": deduped_missing,
        "model": "clinical-risk-rules-v1",
    }, case_context


def build_follow_up_reminders(payload):
    case_context = build_current_visit_ai_case_context(payload)
    current_visit = case_context.get("current_visit") or {}
    medical_information = current_visit.get("appointment_medical_information") or {}
    recent_visits = case_context.get("recent_visit_history") if isinstance(case_context.get("recent_visit_history"), list) else []
    reminders = []
    missing_information = []
    today = get_current_manila_date()

    def add_reminder(reminder_id, priority, title, detail, suggested_timing, suggested_action, source):
        reminders.append(_make_follow_up_reminder(
            reminder_id,
            priority,
            title,
            detail,
            suggested_timing,
            suggested_action,
            source,
        ))

    vaccine_sources = []
    current_vaccine = current_visit.get("vaccination_details") or {}
    if _has_meaningful_value(current_vaccine):
        vaccine_sources.append(current_vaccine)
    for visit in recent_visits:
        if isinstance(visit, dict) and _has_meaningful_value(visit.get("vaccination_details")):
            vaccine_sources.append(visit.get("vaccination_details") or {})

    for index, vaccine in enumerate(vaccine_sources[:5]):
        due_date = _parse_iso_date(vaccine.get("next_due_date") or vaccine.get("nextDueDate"))
        vaccine_name = vaccine.get("vaccine_name") or vaccine.get("vaccineName") or "Vaccination"
        if due_date:
            days_until_due = (due_date - today).days
            if days_until_due < 0:
                add_reminder(
                    f"vaccine-overdue-{index}",
                    "high",
                    "Vaccine Due Date Passed",
                    f"{vaccine_name} was due on {due_date.isoformat()}.",
                    "As soon as clinically appropriate",
                    "Verify vaccine status and schedule booster/recheck if the veterinarian confirms it is needed.",
                    "vaccination record",
                )
            elif days_until_due <= 30:
                add_reminder(
                    f"vaccine-upcoming-{index}",
                    "medium",
                    "Upcoming Vaccine Due",
                    f"{vaccine_name} is due on {due_date.isoformat()}.",
                    f"Within {days_until_due} day{'s' if days_until_due != 1 else ''}",
                    "Remind the owner or schedule preventive visit if appropriate.",
                    "vaccination record",
                )
        elif _has_meaningful_value(vaccine_name):
            missing_information.append(f"Next due date for {vaccine_name}")

    prescriptions = current_visit.get("prescriptions") if isinstance(current_visit.get("prescriptions"), list) else []
    if prescriptions:
        add_reminder(
            "prescription-follow-up",
            "medium",
            "Medication Follow-Up Review",
            "This visit includes prescription entries.",
            "At medication completion or clinician-selected date",
            "Confirm response to medication, adverse effects, and whether a recheck is needed.",
            "current visit prescriptions",
        )

    lab_results = current_visit.get("lab_results") if isinstance(current_visit.get("lab_results"), list) else []
    if lab_results:
        add_reminder(
            "lab-result-review",
            "medium",
            "Lab Result Review",
            "This visit includes lab or diagnostic entries.",
            "After results are finalized",
            "Confirm interpretation, owner communication, and whether repeat testing or recheck is needed.",
            "current visit labs",
        )

    services = current_visit.get("selected_services") if isinstance(current_visit.get("selected_services"), list) else []
    service_text = " ".join(str(service or "").lower() for service in services)
    if any(keyword in service_text for keyword in ["confinement", "surgery", "dental", "x-ray", "ultrasound", "laboratory", "blood", "urinalysis", "fecal"]):
        add_reminder(
            "service-recheck",
            "medium",
            "Post-Service Follow-Up",
            f"Selected services may need follow-up: {', '.join(str(service) for service in services if service)}.",
            "Clinician-selected date",
            "Set a recheck or owner update reminder if clinically appropriate.",
            "selected services",
        )

    symptom_fields = [
        medical_information.get("reported_symptoms"),
        medical_information.get("owner_symptom_notes"),
        medical_information.get("eating_status"),
        medical_information.get("drinking_status"),
        medical_information.get("worsening_status"),
    ]
    if any(_has_meaningful_value(item) for item in symptom_fields):
        add_reminder(
            "symptom-follow-up",
            "medium",
            "Symptom Follow-Up",
            "Owner symptom intake is present for this case.",
            "Clinician-selected date",
            "Consider setting a follow-up to verify whether symptoms improved, worsened, or resolved.",
            "owner symptom intake",
        )

    if _answer_is_no(medical_information.get("up_to_date_vaccinations")):
        add_reminder(
            "preventive-vaccine-review",
            "medium",
            "Preventive Vaccine Review",
            "Owner intake indicates vaccinations may not be up to date.",
            "During this visit or next preventive visit",
            "Review vaccine history and document next recommended preventive schedule.",
            "medical intake",
        )

    recent_prescription_visits = [
        visit for visit in recent_visits
        if _has_meaningful_value((visit or {}).get("prescriptions"))
    ]
    if len(recent_prescription_visits) >= 2:
        add_reminder(
            "recurring-medication-review",
            "low",
            "Medication History Review",
            "Multiple recent visits include prescription records.",
            "During record review",
            "Check whether this reflects a recurring or unresolved issue that needs continuity planning.",
            "visit history",
        )

    if not reminders:
        add_reminder(
            "no-specific-reminder",
            "low",
            "No Specific Follow-Up Trigger Found",
            "No vaccine due date, prescriptions, lab results, or symptom follow-up trigger was identified from available data.",
            "None from available data",
            "Continue documenting follow-up needs in the visit plan when the veterinarian decides one is needed.",
            "available EMR context",
        )

    priority_rank = {"high": 3, "medium": 2, "low": 1}
    reminders = sorted(reminders, key=lambda item: priority_rank.get(item.get("priority"), 0), reverse=True)[:8]
    deduped_missing = list(dict.fromkeys(item for item in missing_information if _has_meaningful_value(item)))[:8]
    high_count = sum(1 for item in reminders if item.get("priority") == "high")
    medium_count = sum(1 for item in reminders if item.get("priority") == "medium")

    if high_count:
        summary = f"{high_count} high-priority follow-up reminder{'s' if high_count != 1 else ''} found."
    elif medium_count:
        summary = f"{medium_count} follow-up reminder{'s' if medium_count != 1 else ''} found from the available record."
    else:
        summary = "No urgent follow-up reminders were identified from the available record."

    return {
        "summary": summary,
        "reminders": reminders,
        "missing_information": deduped_missing,
        "model": "follow-up-reminder-rules-v1",
    }, case_context


def call_gemini_with_structured_output(prompt, schema):
    if AI_PROVIDER == "openai" or (OPENAI_API_KEY and not GEMINI_API_KEY):
        return call_openai_with_structured_output(prompt, schema)

    return call_gemini_api_with_structured_output(prompt, schema)


def normalize_schema_for_openai(schema):
    if not isinstance(schema, dict):
        return schema

    normalized = {}
    for key, value in schema.items():
        if key == "type" and isinstance(value, str):
            normalized[key] = value.lower()
        elif key == "properties" and isinstance(value, dict):
            normalized[key] = {
                prop_name: normalize_schema_for_openai(prop_schema)
                for prop_name, prop_schema in value.items()
            }
        elif key == "items":
            normalized[key] = normalize_schema_for_openai(value)
        else:
            normalized[key] = normalize_schema_for_openai(value) if isinstance(value, dict) else value

    if normalized.get("type") == "object":
        normalized["additionalProperties"] = False
        properties = normalized.get("properties") if isinstance(normalized.get("properties"), dict) else {}
        normalized["required"] = list(properties.keys())

    return normalized


def extract_openai_response_text(parsed):
    output_text = parsed.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()

    text_parts = []
    for output_item in parsed.get("output") or []:
        for content_item in (output_item or {}).get("content") or []:
            if not isinstance(content_item, dict):
                continue
            text_value = content_item.get("text")
            if isinstance(text_value, str):
                text_parts.append(text_value)

    return "".join(text_parts).strip()


def call_openai_with_structured_output(prompt, schema):
    if not OPENAI_API_KEY:
        raise ValueError("Missing OPENAI_API_KEY in backend environment.")

    response_schema = normalize_schema_for_openai(schema)
    payload = {
        "model": OPENAI_MODEL,
        "input": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "pawrang_ai_output",
                "strict": True,
                "schema": response_schema,
            }
        },
        "max_output_tokens": OPENAI_MAX_OUTPUT_TOKENS,
    }

    req = urllib_request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENAI_API_KEY}",
        },
        method="POST"
    )

    try:
        with urllib_request.urlopen(req, timeout=60) as response:
            raw = response.read().decode("utf-8")
    except urllib_error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        raise ValueError(f"OpenAI API error ({e.code}): {error_body}")
    except urllib_error.URLError as e:
        raise ValueError(f"OpenAI API connection error: {e}")

    parsed = json.loads(raw)
    text = extract_openai_response_text(parsed)
    if not text:
        raise ValueError("OpenAI returned an empty response.")

    try:
        result = json.loads(text)
    except json.JSONDecodeError as parse_error:
        raise ValueError(f"OpenAI returned invalid JSON: {parse_error}")

    return normalize_ai_structured_result(result, OPENAI_MODEL)


def call_gemini_api_with_structured_output(prompt, schema):
    if not GEMINI_API_KEY:
        raise ValueError("Missing GEMINI_API_KEY in backend environment.")

    endpoint = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    )
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
            "responseSchema": schema
        }
    }

    req = urllib_request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib_request.urlopen(req, timeout=45) as response:
            raw = response.read().decode("utf-8")
    except urllib_error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        raise ValueError(f"Gemini API error ({e.code}): {error_body}")
    except urllib_error.URLError as e:
        raise ValueError(f"Gemini API connection error: {e}")

    parsed = json.loads(raw)
    candidates = parsed.get("candidates") or []
    if not candidates:
        raise ValueError("Gemini returned no candidates.")

    parts = (((candidates[0] or {}).get("content") or {}).get("parts") or [])
    text = "".join(part.get("text", "") for part in parts if isinstance(part, dict)).strip()
    if not text:
        raise ValueError("Gemini returned an empty response.")

    result = json.loads(text)
    return normalize_ai_structured_result(result, GEMINI_MODEL)


def normalize_ai_structured_result(result, model_name):
    normalized_result = {
        "summary": _text_or_default(result.get("summary")),
        "important_flags": result.get("important_flags") if isinstance(result.get("important_flags"), list) else [],
        "follow_up_questions": result.get("follow_up_questions") if isinstance(result.get("follow_up_questions"), list) else [],
        "missing_information": result.get("missing_information") if isinstance(result.get("missing_information"), list) else [],
        "model": model_name
    }
    for optional_list_field in ("relevant_history", "exam_focus", "care_continuity_notes"):
        if isinstance(result.get(optional_list_field), list):
            normalized_result[optional_list_field] = result.get(optional_list_field)
    for optional_text_field in ("subjective", "objective", "assessment", "plan", "clinical_note"):
        if isinstance(result.get(optional_text_field), str):
            normalized_result[optional_text_field] = result.get(optional_text_field).strip()
    for optional_text_field in ("visit_summary", "friendly_message"):
        if isinstance(result.get(optional_text_field), str):
            normalized_result[optional_text_field] = result.get(optional_text_field).strip()
    for optional_list_field in ("home_care_instructions", "medication_notes", "watch_for", "follow_up"):
        if isinstance(result.get(optional_list_field), list):
            normalized_result[optional_list_field] = result.get(optional_list_field)
    return normalized_result


def build_ai_error_response(error, fallback_message):
    message = str(error or "")
    lowered = message.lower()
    busy_markers = (
        "429",
        "503",
        "overload",
        "overloaded",
        "busy",
        "rate limit",
        "resource_exhausted",
        "unavailable",
        "quota",
        "high demand",
    )

    if any(marker in lowered for marker in busy_markers):
        return jsonify({"error": AI_BUSY_MESSAGE}), 503

    if "missing gemini_api_key" in lowered:
        return jsonify({"error": "AI service is not configured yet."}), 500

    return jsonify({"error": fallback_message}), 502

otp_store = {}
RESEND_COOLDOWN_SECONDS = 60
EMAIL_CHANGE_OTP_EXPIRY_SECONDS = 5 * 60
INVENTORY_CATEGORIES = {
    "Pet Supplies",
    "Deworming",
    "Vitamins",
    "Food",
    "Accessories",
    "Medication",
}
INVENTORY_CATEGORY_CODES = {
    "Pet Supplies": "PS",
    "Deworming": "DEW",
    "Vitamins": "VIT",
    "Food": "FD",
    "Accessories": "ACC",
    "Medication": "MED",
}
INVENTORY_ITEM_STOP_WORDS = {"and", "for", "of", "the", "with", "to", "a", "an"}
ADMIN_NOTIFICATION_MODULES = {
    "inventory",
    "appointments",
    "emr",
    "billing",
    "accounts",
    "availability",
    "audit",
    "system",
}
ADMIN_NOTIFICATION_SEVERITIES = {"info", "success", "warning", "error"}
TRANSIENT_SUPABASE_ERROR_PATTERNS = (
    "winerror 10035",
    "non-blocking socket operation could not be completed immediately",
    "temporarily unavailable",
    "connection reset",
    "connection aborted",
    "timeout",
)
MISSING_SUPABASE_RESOURCE_PATTERNS = (
    "could not find the table",
    "does not exist",
    "relation",
    "schema cache",
)
LOGIN_SECURITY_TABLE = "login_lockouts"
MAX_LOGIN_ATTEMPTS = 3
BASE_LOCKOUT_MINUTES = 5
LOCKOUT_INCREMENT_MINUTES = 20
login_security_store = {}


def is_transient_supabase_error(error):
    message = str(error or "").lower()
    return any(pattern in message for pattern in TRANSIENT_SUPABASE_ERROR_PATTERNS)


def is_missing_supabase_resource_error(error):
    message = str(error or "").lower()
    return any(pattern in message for pattern in MISSING_SUPABASE_RESOURCE_PATTERNS)


def execute_with_retry(run_query, *, attempts=5, base_delay=0.3, context="Supabase read"):
    last_error = None

    for attempt in range(1, attempts + 1):
        try:
            return run_query()
        except Exception as e:
            last_error = e
            is_last_attempt = attempt >= attempts
            if is_last_attempt or not is_transient_supabase_error(e):
                raise
            print(f"{context} transient error on attempt {attempt}/{attempts}: {e}")
            time.sleep(base_delay * (2 ** (attempt - 1)))

    raise last_error


def get_single_row(table_name, column, value):
    result = execute_with_retry(
        lambda: supabase_admin.table(table_name)
        .select('*')
        .eq(column, value)
        .execute(),
        context=f"Fetch {table_name} row"
    )

    rows = result.data or []
    if len(rows) > 1:
        raise ValueError(f"Multiple {table_name} records found for {column}.")

    return rows[0] if rows else None


def utc_now():
    return datetime.utcnow()


def parse_datetime_value(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value

    raw = str(value).strip()
    if not raw:
        return None

    if raw.endswith("Z"):
        raw = raw[:-1] + "+00:00"

    try:
        parsed = datetime.fromisoformat(raw)
    except ValueError:
        return None

    if parsed.tzinfo is not None:
        return parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def format_lockout_minutes(minutes):
    total_minutes = max(1, int(minutes or 0))
    hours, remaining_minutes = divmod(total_minutes, 60)

    parts = []
    if hours:
        parts.append(f"{hours} hour" if hours == 1 else f"{hours} hours")
    if remaining_minutes:
        parts.append(f"{remaining_minutes} minute" if remaining_minutes == 1 else f"{remaining_minutes} minutes")
    return " ".join(parts) if parts else "1 minute"


def get_lockout_duration_minutes(lockout_count):
    prior_lockouts = max(0, int(lockout_count or 0))
    return BASE_LOCKOUT_MINUTES + (prior_lockouts * LOCKOUT_INCREMENT_MINUTES)


def get_login_security_key(profile, identifier):
    if profile and profile.get("id"):
        return str(profile.get("id"))
    return (identifier or "").strip().lower()


def get_default_login_security_state(profile=None, identifier=None):
    return {
        "account_key": get_login_security_key(profile, identifier),
        "account_id": profile.get("id") if profile else None,
        "email": (profile or {}).get("email"),
        "username": (profile or {}).get("username"),
        "failed_attempts": 0,
        "lockout_count": 0,
        "locked_until": None,
        "last_failed_at": None,
    }


def read_login_security_state(profile=None, identifier=None):
    state = get_default_login_security_state(profile, identifier)
    account_key = state["account_key"]
    stored_state = None

    if profile and profile.get("id"):
        try:
            result = execute_with_retry(
                lambda: supabase_admin.table(LOGIN_SECURITY_TABLE)
                .select("*")
                .eq("account_id", profile.get("id"))
                .limit(1)
                .execute(),
                context="Fetch login security state"
            )
            rows = result.data or []
            stored_state = rows[0] if rows else None
        except Exception as e:
            if not is_missing_supabase_resource_error(e):
                raise
            stored_state = login_security_store.get(account_key)
    else:
        stored_state = login_security_store.get(account_key)

    if not stored_state:
        return state

    state.update({
        "account_key": account_key,
        "account_id": stored_state.get("account_id") or state["account_id"],
        "email": stored_state.get("email") or state["email"],
        "username": stored_state.get("username") or state["username"],
        "failed_attempts": int(stored_state.get("failed_attempts") or 0),
        "lockout_count": int(stored_state.get("lockout_count") or 0),
        "locked_until": parse_datetime_value(stored_state.get("locked_until")),
        "last_failed_at": parse_datetime_value(stored_state.get("last_failed_at")),
    })
    return state


def persist_login_security_state(state):
    payload = {
        "account_id": state.get("account_id"),
        "email": state.get("email"),
        "username": state.get("username"),
        "failed_attempts": int(state.get("failed_attempts") or 0),
        "lockout_count": int(state.get("lockout_count") or 0),
        "locked_until": state.get("locked_until").isoformat() if state.get("locked_until") else None,
        "last_failed_at": state.get("last_failed_at").isoformat() if state.get("last_failed_at") else None,
        "updated_at": utc_now().isoformat(),
    }

    account_key = state.get("account_key")
    if not account_key:
        return

    login_security_store[account_key] = {
        **payload,
        "account_key": account_key,
    }

    if not state.get("account_id"):
        return

    try:
        execute_with_retry(
            lambda: supabase_admin.table(LOGIN_SECURITY_TABLE).upsert(
                payload,
                on_conflict="account_id"
            ).execute(),
            context="Persist login security state"
        )
    except Exception as e:
        if not is_missing_supabase_resource_error(e):
            raise


def clear_login_security_state(profile, identifier=None):
    state = read_login_security_state(profile, identifier)
    state.update({
        "failed_attempts": 0,
        "lockout_count": 0,
        "locked_until": None,
        "last_failed_at": None,
        "account_id": profile.get("id") if profile else state.get("account_id"),
        "email": (profile or {}).get("email") or state.get("email"),
        "username": (profile or {}).get("username") or state.get("username"),
    })
    persist_login_security_state(state)
    return state


def build_lockout_response(state):
    now = utc_now()
    locked_until = state.get("locked_until")
    if not locked_until or locked_until <= now:
        return None

    seconds_left = max(1, int((locked_until - now).total_seconds()))
    minutes_left = max(1, int((seconds_left + 59) // 60))
    return {
        "error": f"Too many invalid login attempts. This account is locked for {format_lockout_minutes(minutes_left)}.",
        "attempts_left": 0,
        "retry_after_seconds": seconds_left,
        "locked_until": locked_until.isoformat(),
        "lockout_active": True,
    }


def record_failed_login_attempt(profile, identifier):
    state = read_login_security_state(profile, identifier)
    now = utc_now()
    locked_until = state.get("locked_until")

    if locked_until and locked_until <= now:
        state["failed_attempts"] = 0
        state["locked_until"] = None

    state["account_id"] = profile.get("id") if profile else state.get("account_id")
    state["email"] = (profile or {}).get("email") or state.get("email")
    state["username"] = (profile or {}).get("username") or state.get("username")
    state["last_failed_at"] = now
    state["failed_attempts"] = int(state.get("failed_attempts") or 0) + 1

    attempts_left = max(0, MAX_LOGIN_ATTEMPTS - state["failed_attempts"])
    if state["failed_attempts"] >= MAX_LOGIN_ATTEMPTS:
        lockout_minutes = get_lockout_duration_minutes(state.get("lockout_count"))
        state["lockout_count"] = int(state.get("lockout_count") or 0) + 1
        state["failed_attempts"] = 0
        state["locked_until"] = now + timedelta(minutes=lockout_minutes)
        persist_login_security_state(state)
        return {
            "error": f"Too many invalid login attempts. This account has been locked for {format_lockout_minutes(lockout_minutes)}.",
            "attempts_left": 0,
            "retry_after_seconds": int(lockout_minutes * 60),
            "locked_until": state["locked_until"].isoformat(),
            "lockout_active": True,
        }, 423

    persist_login_security_state(state)
    return {
        "error": f"Invalid credentials. {attempts_left} login attempt{'s' if attempts_left != 1 else ''} left before account lockout.",
        "attempts_left": attempts_left,
        "lockout_active": False,
    }, 401


def find_account_by_identifier(identifier):
    column = 'email' if '@' in identifier else 'username'

    employee_profile = get_single_row('employee_accounts', column, identifier)
    if employee_profile:
        return employee_profile, 'employee_accounts'

    patient_profile = get_single_row('patient_account', column, identifier)
    if patient_profile:
        return patient_profile, 'patient_account'

    return None, None


def find_account_by_user_id(user_id):
    employee_profile = get_single_row('employee_accounts', 'id', user_id)
    if employee_profile:
        return employee_profile, 'employee_accounts'

    patient_profile = get_single_row('patient_account', 'id', user_id)
    if patient_profile:
        return patient_profile, 'patient_account'

    return None, None


def normalize_profile(profile, source_table):
    if source_table == 'employee_accounts':
        branch_name = profile.get('branch_name') or profile.get('branchName')
        return {
            "id": profile.get('id'),
            "email": profile.get('email'),
            "username": profile.get('username'),
            "firstName": profile.get('first_name') or profile.get('firstName'),
            "lastName": profile.get('last_name') or profile.get('lastName'),
            "contact_number": profile.get('contact_number') or profile.get('contactNumber'),
            "role": profile.get('role'),
            "status": profile.get('status'),
            "userImage": profile.get('employee_image'),
            "branch_id": profile.get('branch_id'),
            "branch_name": branch_name,
            "branchName": branch_name,
            "account_type": "employee",
        }

    return {
        "id": profile.get('id'),
        "email": profile.get('email'),
        "username": profile.get('username'),
        "firstName": profile.get('firstName') or profile.get('first_name'),
        "lastName": profile.get('lastName') or profile.get('last_name'),
        "contact_number": profile.get('contact_number') or profile.get('contactNumber'),
        "role": profile.get('role'),
        "status": profile.get('status'),
        "userImage": profile.get('userImage') or profile.get('user_image') or profile.get('userimage') or profile.get('profileImage'),
        "account_type": "patient",
    }


def split_full_name(full_name):
    parts = (full_name or "").strip().split()
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def normalize_patient_admin_account(profile):
    first_name = profile.get('firstName') or ""
    last_name = profile.get('lastName') or ""
    full_name = f"{first_name} {last_name}".strip() or profile.get('username') or profile.get('email') or "Unknown"
    contact = profile.get('contact_number') or ""
    user_image = profile.get('userImage')
    raw_status = (profile.get('status') or 'active').strip().lower()
    status = 'Disabled' if raw_status in ('disabled', 'inactive') else 'Active'

    return {
        "id": profile.get('id'),
        "pk": profile.get('id'),
        "username": profile.get('username') or "",
        "fullName": full_name,
        "fullname": full_name,
        "contactNumber": contact,
        "contactnumber": contact,
        "email": profile.get('email') or "",
        "status": status,
        "userImage": user_image,
        "userimage": user_image,
    }


def normalize_employee_admin_account(profile):
    raw_status = (profile.get('status') or 'active').strip().lower()
    status = 'Disabled' if raw_status in ('disabled', 'inactive') else 'Active'
    role = profile.get('role') or 'Admin'
    branch_name = profile.get('branch_name') or profile.get('branchName')

    return {
        "id": profile.get('id'),
        "username": profile.get('username') or '',
        "first_name": profile.get('first_name') or '',
        "last_name": profile.get('last_name') or '',
        "contact_number": profile.get('contact_number') or '',
        "email": profile.get('email') or '',
        "role": role,
        "status": status,
        "employee_image": profile.get('employee_image'),
        "created_at": profile.get('created_at'),
        "is_initial_login": bool(profile.get('is_initial_login')),
        "branch_id": profile.get('branch_id'),
        "branch_name": branch_name,
        "branchName": branch_name,
    }


def parse_bool(value, default=False):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    return str(value).strip().lower() in ('1', 'true', 'yes', 'y', 'on')


def coerce_int(value, field_name, minimum=None, maximum=None, default=None, allow_none=False):
    if value in (None, ''):
        if allow_none:
            return None
        if default is not None:
            return default
        raise ValueError(f"{field_name} is required")

    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be a whole number")

    if minimum is not None and parsed < minimum:
        raise ValueError(f"{field_name} must be at least {minimum}")
    if maximum is not None and parsed > maximum:
        raise ValueError(f"{field_name} must be at most {maximum}")
    return parsed


def coerce_number(value, field_name, minimum=None, maximum=None, default=None, allow_none=False):
    if value in (None, ''):
        if allow_none:
            return None
        if default is not None:
            return default
        raise ValueError(f"{field_name} is required")

    try:
        parsed = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be a valid number")

    if minimum is not None and parsed < minimum:
        raise ValueError(f"{field_name} must be at least {minimum}")
    if maximum is not None and parsed > maximum:
        raise ValueError(f"{field_name} must be at most {maximum}")
    return round(parsed, 2)


def format_display_time(value):
    normalized = normalize_db_time(value)
    if not normalized:
        return ""

    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(normalized, fmt).strftime("%I:%M %p").lstrip("0")
        except ValueError:
            continue
    return normalized


def format_display_time_range(value):
    normalized = normalize_db_time(value)
    if not normalized:
        return ""

    try:
        start = datetime.strptime(normalized, "%H:%M:%S")
    except ValueError:
        try:
            start = datetime.strptime(normalized, "%H:%M")
        except ValueError:
            return value or ""

    end = start + timedelta(hours=1)
    return f"{start.strftime('%I:%M %p').lstrip('0')} - {end.strftime('%I:%M %p').lstrip('0')}"


def get_public_base_url():
    return (
        os.environ.get("PUBLIC_API_URL")
        or os.environ.get("BACKEND_PUBLIC_URL")
        or os.environ.get("APP_BASE_URL")
        or request.url_root.rstrip("/")
    )


def normalize_medical_information_record(record):
    if not record:
        return None

    record_type = record.get("record_type") or ("walkin" if record.get("walkin_id") not in (None, "") else "appointment")
    target_id = record.get("walkin_id") if record_type == "walkin" else record.get("appointment_id")

    return {
        "id": record.get("id") or record.get("medical_information_id") or record.get("medical_id"),
        "record_type": record_type,
        "target_id": target_id,
        "appointment_id": record.get("appointment_id"),
        "walkin_id": record.get("walkin_id"),
        "on_medication": record.get("on_medication"),
        "medication_details": record.get("medication_details"),
        "flea_tick_prevention": record.get("flea_tick_prevention"),
        "is_vaccinated": record.get("is_vaccinated"),
        "is_pregnant": record.get("is_pregnant"),
        "additional_notes": record.get("additional_notes"),
        "has_allergies": record.get("has_allergies"),
        "allergy_details": record.get("allergy_details"),
        "has_skin_condition": record.get("has_skin_condition"),
        "skin_condition_details": record.get("skin_condition_details"),
        "been_groomed_before": record.get("been_groomed_before"),
        "reported_symptoms": record.get("reported_symptoms") or [],
        "owner_symptom_notes": record.get("owner_symptom_notes"),
        "symptom_duration": record.get("symptom_duration"),
        "eating_status": record.get("eating_status"),
        "drinking_status": record.get("drinking_status"),
        "worsening_status": record.get("worsening_status"),
        "ai_symptom_summary": record.get("ai_symptom_summary"),
        "created_at": record.get("created_at"),
        "updated_at": record.get("updated_at"),
    }


def build_medical_information_lookup(rows):
    lookup = {}

    for medical_row in rows or []:
        normalized = normalize_medical_information_record(medical_row)
        if not normalized:
            continue

        record_type = (normalized.get("record_type") or "appointment").strip().lower()
        target_type = "walkin" if record_type == "walkin" else "appointment"
        target_id = normalized.get("target_id")

        if target_id in (None, ""):
            continue

        key = f"{target_type}-{target_id}"
        if key not in lookup:
            lookup[key] = normalized

    return lookup


def parse_emr_date(value):
    if value in (None, ""):
        return None
    if isinstance(value, date):
        return value

    raw = str(value).strip()
    if not raw:
        return None

    raw_date = raw[:10] if "T" in raw else raw
    for fmt in ("%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(raw_date, fmt).date()
        except ValueError:
            continue

    return None


def normalize_emr_date(value):
    parsed = parse_emr_date(value)
    return parsed.strftime("%Y-%m-%d") if parsed else None


def format_emr_display_date(value):
    parsed = parse_emr_date(value)
    return parsed.strftime("%m/%d/%Y") if parsed else ""


def calculate_emr_pet_age(birthday, fallback_age=""):
    parsed_birthday = parse_emr_date(birthday)
    if not parsed_birthday:
        return fallback_age or ""

    today = date.today()
    if parsed_birthday > today:
        return fallback_age or ""

    years = today.year - parsed_birthday.year
    months = today.month - parsed_birthday.month
    days = today.day - parsed_birthday.day

    if days < 0:
        months -= 1
        if today.month == 1:
            previous_month = date(today.year - 1, 12, 1)
        else:
            previous_month = date(today.year, today.month - 1, 1)
        if previous_month.month == 12:
            next_month = date(previous_month.year + 1, 1, 1)
        else:
            next_month = date(previous_month.year, previous_month.month + 1, 1)
        days += (next_month - previous_month).days

    if months < 0:
        years -= 1
        months += 12

    if years > 0:
        return f"{years} year{'s' if years != 1 else ''}"
    if months > 0:
        return f"{months} month{'s' if months != 1 else ''}"
    if days > 1:
        return f"{days} days old"
    if days == 1:
        return "1 day old"
    return "Born today"


def parse_emr_float(value):
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def format_pet_patient_id(pet_id):
    try:
        return f"PET-{int(pet_id):03d}"
    except (TypeError, ValueError):
        return f"PET-{pet_id}" if pet_id not in (None, "") else ""


def coerce_optional_bool(value):
    if value in (None, ""):
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)

    normalized = str(value).strip().lower()
    if normalized in {"true", "1", "yes", "y"}:
        return True
    if normalized in {"false", "0", "no", "n"}:
        return False
    return None


def format_missing_required_fields(fields):
    cleaned_fields = [str(field).strip() for field in (fields or []) if str(field).strip()]
    return f"Missing required fields: {', '.join(cleaned_fields)}" if cleaned_fields else "Missing required fields."


def extract_digits_only(value):
    return "".join(character for character in str(value or "") if character.isdigit())


def build_owner_visibility_payload(item, existing_row=None, default_visible=False):
    item = item or {}
    existing_row = existing_row or {}

    explicit_visible = coerce_optional_bool(
        item.get("visibleToOwner")
        if "visibleToOwner" in item
        else item.get("visible_to_owner")
    )
    visible_to_owner = explicit_visible if explicit_visible is not None else (
        bool(existing_row.get("visible_to_owner")) if existing_row else bool(default_visible)
    )

    if visible_to_owner:
        visible_to_owner_at = (
            item.get("visibleToOwnerAt")
            or item.get("visible_to_owner_at")
            or existing_row.get("visible_to_owner_at")
            or datetime.utcnow().isoformat()
        )
        visible_to_owner_by = (
            item.get("visibleToOwnerBy")
            or item.get("visible_to_owner_by")
            or existing_row.get("visible_to_owner_by")
            or ""
        )
    else:
        visible_to_owner_at = None
        visible_to_owner_by = None

    return {
        "visible_to_owner": bool(visible_to_owner),
        "visible_to_owner_at": visible_to_owner_at,
        "visible_to_owner_by": visible_to_owner_by,
    }


def get_emr_owner_visibility_maps(medical_record_id):
    visibility_maps = {
        "lab_results": {},
        "vaccinations": {},
    }

    if medical_record_id in (None, ""):
        return visibility_maps

    visit_rows = execute_with_retry(
        lambda: supabase_admin.table("medical_record_visits")
        .select("medical_record_visit_id")
        .eq("medical_record_id", medical_record_id)
        .execute(),
        context="Fetch EMR visibility visit ids"
    ).data or []

    visit_ids = [
        item.get("medical_record_visit_id")
        for item in visit_rows
        if item.get("medical_record_visit_id") not in (None, "")
    ]
    if not visit_ids:
        return visibility_maps

    lab_rows = execute_with_retry(
        lambda: supabase_admin.table("medical_record_lab_results")
        .select("medical_record_lab_result_id, visible_to_owner, visible_to_owner_at, visible_to_owner_by")
        .in_("medical_record_visit_id", visit_ids)
        .execute(),
        context="Fetch EMR lab visibility map"
    ).data or []
    vaccination_rows = execute_with_retry(
        lambda: supabase_admin.table("medical_record_vaccinations")
        .select("medical_record_vaccination_id, visible_to_owner, visible_to_owner_at, visible_to_owner_by")
        .in_("medical_record_visit_id", visit_ids)
        .execute(),
        context="Fetch EMR vaccination visibility map"
    ).data or []

    visibility_maps["lab_results"] = {
        str(item.get("medical_record_lab_result_id")): item
        for item in lab_rows
        if item.get("medical_record_lab_result_id") not in (None, "")
    }
    visibility_maps["vaccinations"] = {
        str(item.get("medical_record_vaccination_id")): item
        for item in vaccination_rows
        if item.get("medical_record_vaccination_id") not in (None, "")
    }
    return visibility_maps


def normalize_weight_kg(value, unit="kg"):
    parsed = parse_emr_float(value)
    if parsed is None:
        return None

    normalized_unit = (unit or "kg").strip().lower()
    if normalized_unit in {"lb", "lbs", "pound", "pounds"}:
        return round(parsed / 2.20462, 4)

    return parsed


def build_emr_default_visit(data):
    data = data or {}
    pet_details = data.get("petDetails") or {}
    visit_date = normalize_emr_date(data.get("lastVisit")) or datetime.utcnow().date().strftime("%Y-%m-%d")
    veterinarian = data.get("veterinarian") or pet_details.get("doctorAssigned") or ""
    reason = data.get("reason") or pet_details.get("reasonForVisit") or ""
    doctor_remarks = pet_details.get("doctorRemarks") or data.get("doctorRemarks") or ""
    weight_value = parse_emr_float(pet_details.get("weight"))
    weight_unit = (pet_details.get("weightUnit") or "kg").strip() if pet_details.get("weightUnit") else "kg"

    if not any([veterinarian, reason, doctor_remarks, weight_value is not None]):
        return None

    return {
        "id": "",
        "date": visit_date,
        "time": "",
        "veterinarian": veterinarian,
        "reason": reason,
        "doctorRemarks": doctor_remarks,
        "weight": weight_value or 0,
        "weightUnit": weight_unit if weight_unit in {"kg", "lbs"} else "kg",
        "sameAsLastWeight": False,
        "neutered": coerce_optional_bool(pet_details.get("neutered")),
        "vaccinated": coerce_optional_bool(pet_details.get("vaccinated")),
        "deceased": coerce_optional_bool(pet_details.get("deceased")),
        "clinicalExam": {
            "length": 0,
            "lengthUnit": "cm",
            "temperature": 0,
            "tempUnit": "C",
            "heartRate": "",
            "breathingRate": "",
            "additionalFindings": "",
        },
        "labResults": [],
        "prescriptions": [],
        "selectedServices": [],
    }


def validate_emr_record_required_fields(data):
    data = data or {}
    pet_details = data.get("petDetails") or {}
    missing_fields = []

    pet_name = str(data.get("petName") or pet_details.get("name") or "").strip()
    breed = str(data.get("breed") or pet_details.get("breed") or "").strip()
    owner_first_name = str(data.get("ownerFirstName") or "").strip()
    owner_last_name = str(data.get("ownerLastName") or "").strip()
    owner_email = str(data.get("ownerEmail") or "").strip()
    owner_contact = str(data.get("ownerContact") or "").strip()
    veterinarian = str(data.get("veterinarian") or pet_details.get("doctorAssigned") or "").strip()
    reason = str(data.get("reason") or pet_details.get("reasonForVisit") or "").strip()

    if not pet_name:
        missing_fields.append("Pet name")
    if not breed:
        missing_fields.append("Breed")
    if not owner_first_name:
        missing_fields.append("Owner first name")
    if not owner_last_name:
        missing_fields.append("Owner last name")
    if not owner_email:
        missing_fields.append("Owner email")
    elif "@" not in owner_email or "." not in owner_email.split("@")[-1]:
        missing_fields.append("Owner email must be a valid email address")

    if not owner_contact:
        missing_fields.append("Owner contact number")
    else:
        owner_contact_digits = extract_digits_only(owner_contact)
        if not owner_contact_digits.startswith("63") or len(owner_contact_digits) != 12:
            missing_fields.append("Owner contact number must be a valid PH number starting with 63")

    if not veterinarian:
        missing_fields.append("Veterinarian")
    if not reason:
        missing_fields.append("Reason for visit")

    if missing_fields:
        raise ValueError(format_missing_required_fields(missing_fields))


def get_emr_search_results(branch_scope=None):
    pets = execute_with_retry(
        lambda: supabase_admin.table("pet_profile").select("*").order("created_at", desc=True).execute(),
        context="Fetch EMR search pets"
    ).data or []
    owners = execute_with_retry(
        lambda: supabase_admin.table("patient_account").select("*").execute(),
        context="Fetch EMR search owners"
    ).data or []
    records = execute_with_retry(
        lambda: supabase_admin.table("medical_records").select("*").execute(),
        context="Fetch EMR search medical records"
    ).data or []

    owners_by_id = {str(item.get("id")): item for item in owners}
    records_by_pet_id = {str(item.get("pet_id")): item for item in records if item.get("pet_id") not in (None, "")}
    accessible_pet_ids = None
    if branch_scope and not branch_scope.get("can_access_all"):
        scoped_appointments = execute_with_retry(
            lambda: supabase_admin.table("appointments").select("pet_id").eq("branch_id", branch_scope.get("branch_id")).execute(),
            context="Fetch branch-scoped EMR pet appointments"
        ).data or []
        accessible_pet_ids = {
            str(item.get("pet_id"))
            for item in scoped_appointments
            if item.get("pet_id") not in (None, "")
        }

    search_results = []
    for pet in pets:
        pet_id = pet.get("pet_id")
        if accessible_pet_ids is not None and str(pet_id) not in accessible_pet_ids:
            continue
        owner = owners_by_id.get(str(pet.get("owner_id")), {})
        medical_record = records_by_pet_id.get(str(pet_id), {})

        search_results.append({
            "id": pet_id,
            "petId": pet_id,
            "petName": pet.get("pet_name") or "",
            "ownerName": get_profile_display_name(owner) or "Unknown Owner",
            "ownerFirstName": owner.get("firstName") or owner.get("first_name") or "",
            "ownerLastName": owner.get("lastName") or owner.get("last_name") or "",
            "ownerUsername": owner.get("username") or "",
            "species": pet.get("pet_species") or "",
            "breed": pet.get("pet_breed") or "",
            "ownerEmail": owner.get("email") or "",
            "ownerContact": owner.get("contact_number") or "",
            "gender": pet.get("pet_gender") or "",
            "dateOfBirth": normalize_emr_date(pet.get("birthday")) or "",
            "weightKg": pet.get("weight_kg") or "",
            "colorMarkings": pet.get("color_markings") or "",
            "neutered": bool(pet.get("is_neutered")) if pet.get("is_neutered") is not None else False,
            "vaccinated": bool(pet.get("is_vaccinated")),
            "vaccinationProof": ((pet.get("vaccination_urls") or [None])[0]),
            "image": pet.get("pet_photo_url") or "",
            "hasExistingRecord": medical_record.get("medical_record_id") not in (None, ""),
            "existingRecordId": medical_record.get("medical_record_id"),
            "deceased": bool(pet.get("is_deceased")),
        })

    return search_results


def get_emr_records(
    record_ids=None,
    include_billing=False,
    include_details=True,
    include_lab_results=True,
    include_vaccinations=True,
    include_medical_information=True,
    branch_scope=None,
):
    records_query = supabase_admin.table("medical_records").select("*")
    if record_ids:
        records_query = records_query.in_("medical_record_id", list(record_ids))

    medical_records = execute_with_retry(
        lambda: records_query.execute(),
        context="Fetch EMR records"
    ).data or []

    if not medical_records:
        return []

    medical_record_ids = [item.get("medical_record_id") for item in medical_records if item.get("medical_record_id") not in (None, "")]
    pet_ids = [item.get("pet_id") for item in medical_records if item.get("pet_id") not in (None, "")]

    visits_query = supabase_admin.table("medical_record_visits").select("*")
    if medical_record_ids:
        visits_query = visits_query.in_("medical_record_id", medical_record_ids)
    visit_rows = execute_with_retry(
        lambda: visits_query.execute(),
        context="Fetch EMR visits"
    ).data or []

    if branch_scope and not branch_scope.get("can_access_all"):
        scoped_branch_id = parse_branch_id(branch_scope.get("branch_id"))
        visit_rows = [
            visit for visit in visit_rows
            if parse_branch_id(visit.get("branch_id")) == scoped_branch_id
            or parse_branch_id(resolve_emr_visit_branch_id(
                visit.get("source_type"),
                visit.get("source_id"),
                fallback_branch_id=visit.get("branch_id"),
            )) == scoped_branch_id
        ]
        accessible_record_ids = {
            str(visit.get("medical_record_id"))
            for visit in visit_rows
            if visit.get("medical_record_id") not in (None, "")
        }
        medical_records = [
            record for record in medical_records
            if str(record.get("medical_record_id")) in accessible_record_ids
        ]
        if not medical_records:
            return []
        medical_record_ids = [item.get("medical_record_id") for item in medical_records if item.get("medical_record_id") not in (None, "")]
        pet_ids = [item.get("pet_id") for item in medical_records if item.get("pet_id") not in (None, "")]

    appointment_source_ids = [
        item.get("source_id")
        for item in visit_rows
        if (item.get("source_type") or "").strip().lower() == "appointment" and item.get("source_id") not in (None, "")
    ]
    walkin_source_ids = [
        item.get("source_id")
        for item in visit_rows
        if (item.get("source_type") or "").strip().lower() == "walkin" and item.get("source_id") not in (None, "")
    ]
    should_fetch_medical_information = include_details and include_medical_information
    medical_information_rows = []
    if should_fetch_medical_information and appointment_source_ids:
        medical_information_rows.extend(
            execute_with_retry(
                lambda: supabase_admin.table("medical_information").select("*").in_("appointment_id", appointment_source_ids).execute(),
                context="Fetch EMR appointment medical information"
            ).data or []
        )
    if should_fetch_medical_information and walkin_source_ids:
        medical_information_rows.extend(
            execute_with_retry(
                lambda: supabase_admin.table("medical_information").select("*").in_("walkin_id", walkin_source_ids).execute(),
                context="Fetch EMR walk-in medical information"
            ).data or []
        )

    visit_ids = [item.get("medical_record_visit_id") for item in visit_rows if item.get("medical_record_visit_id") not in (None, "")]

    def fetch_child_rows(table_name, context_name):
        if not visit_ids:
            return []
        query = supabase_admin.table(table_name).select("*").in_("medical_record_visit_id", visit_ids)
        return execute_with_retry(lambda: query.execute(), context=context_name).data or []

    prescription_rows = fetch_child_rows("medical_record_prescriptions", "Fetch EMR prescriptions") if include_details else []
    lab_result_rows = (
        fetch_child_rows("medical_record_lab_results", "Fetch EMR lab results")
        if include_details and include_lab_results
        else []
    )
    visit_service_rows = fetch_child_rows("medical_record_visit_services", "Fetch EMR visit services") if include_details else []
    vaccination_rows = (
        fetch_child_rows("medical_record_vaccinations", "Fetch EMR vaccinations")
        if include_details and include_vaccinations
        else []
    )

    pets_query = supabase_admin.table("pet_profile").select("*")
    if pet_ids:
        pets_query = pets_query.in_("pet_id", pet_ids)
    pet_rows = execute_with_retry(
        lambda: pets_query.execute(),
        context="Fetch EMR pet profiles"
    ).data or []

    owner_ids = [item.get("owner_id") for item in pet_rows if item.get("owner_id") not in (None, "")]
    owners = []
    if owner_ids:
        owners = execute_with_retry(
            lambda: supabase_admin.table("patient_account").select("*").in_("id", owner_ids).execute(),
            context="Fetch EMR owners"
        ).data or []

    pets_by_id = {str(item.get("pet_id")): item for item in pet_rows}
    owners_by_id = {str(item.get("id")): item for item in owners}
    medical_information_by_target = build_medical_information_lookup(medical_information_rows)
    billing_invoice_index = fetch_billing_source_invoice_index() if include_billing else {}

    visits_by_record_id = {}
    for visit in visit_rows:
        record_id = str(visit.get("medical_record_id"))
        visits_by_record_id.setdefault(record_id, []).append(visit)

    def append_child_row(bucket, row):
        visit_id = str(row.get("medical_record_visit_id"))
        bucket.setdefault(visit_id, []).append(row)

    prescriptions_by_visit_id = {}
    lab_results_by_visit_id = {}
    services_by_visit_id = {}
    vaccinations_by_visit_id = {}

    for row in prescription_rows:
        append_child_row(prescriptions_by_visit_id, row)
    for row in lab_result_rows:
        append_child_row(lab_results_by_visit_id, row)
    for row in visit_service_rows:
        append_child_row(services_by_visit_id, row)
    for row in vaccination_rows:
        append_child_row(vaccinations_by_visit_id, row)

    def visit_sort_key(visit):
        parsed_date = parse_emr_date(visit.get("visit_date")) or date.min
        normalized_time = normalize_db_time(visit.get("visit_time")) or "00:00:00"
        return (parsed_date.isoformat(), normalized_time, int(visit.get("medical_record_visit_id") or 0))

    normalized_records = []
    for medical_record in medical_records:
        record_id = medical_record.get("medical_record_id")
        pet = pets_by_id.get(str(medical_record.get("pet_id")), {})
        owner = owners_by_id.get(str(pet.get("owner_id")), {})

        visits = sorted(visits_by_record_id.get(str(record_id), []), key=visit_sort_key)
        normalized_visits = []

        for visit in visits:
            visit_id = str(visit.get("medical_record_visit_id"))
            visit_billing_invoice = resolve_billing_invoice_for_visit(visit, billing_invoice_index)
            visit_prescriptions = sorted(
                prescriptions_by_visit_id.get(visit_id, []),
                key=lambda item: (int(item.get("sort_order") or 0), int(item.get("medical_record_prescription_id") or 0))
            )
            visit_lab_results = sorted(
                lab_results_by_visit_id.get(visit_id, []),
                key=lambda item: (int(item.get("sort_order") or 0), int(item.get("medical_record_lab_result_id") or 0))
            )
            visit_services = sorted(
                services_by_visit_id.get(visit_id, []),
                key=lambda item: (int(item.get("sort_order") or 0), int(item.get("medical_record_visit_service_id") or 0))
            )
            visit_vaccinations = sorted(
                vaccinations_by_visit_id.get(visit_id, []),
                key=lambda item: (int(item.get("sort_order") or 0), int(item.get("medical_record_vaccination_id") or 0))
            )

            clinical_exam = {
                "length": parse_emr_float(visit.get("body_length_value")) or 0,
                "lengthUnit": visit.get("body_length_unit") or "cm",
                "temperature": parse_emr_float(visit.get("temperature_value")) or 0,
                "tempUnit": visit.get("temperature_unit") or "C",
                "heartRate": visit.get("heart_rate") or "",
                "breathingRate": visit.get("breathing_rate") or "",
                "additionalFindings": visit.get("additional_findings") or "",
            }
            has_clinical_exam = any([
                parse_emr_float(visit.get("body_length_value")) is not None,
                parse_emr_float(visit.get("temperature_value")) is not None,
                clinical_exam["heartRate"],
                clinical_exam["breathingRate"],
                clinical_exam["additionalFindings"],
            ])

            normalized_visit = {
                "id": str(visit.get("medical_record_visit_id") or ""),
                "sourceType": (visit.get("source_type") or "manual").strip().lower() or "manual",
                "sourceId": str(visit.get("source_id")) if visit.get("source_id") not in (None, "") else None,
                "branchId": visit.get("branch_id"),
                "branch_id": visit.get("branch_id"),
                "date": format_emr_display_date(visit.get("visit_date")),
                "time": format_display_time(visit.get("visit_time")) or "",
                "veterinarian": visit.get("veterinarian_name") or "",
                "reason": visit.get("reason") or "",
                "doctorRemarks": visit.get("doctor_remarks") or "",
                "weight": parse_emr_float(visit.get("weight_value")) or 0,
                "weightUnit": visit.get("weight_unit") or "kg",
                "sameAsLastWeight": bool(visit.get("same_as_last_weight")),
                "neutered": bool(visit.get("pet_state_neutered")) if visit.get("pet_state_neutered") is not None else False,
                "vaccinated": bool(visit.get("pet_state_vaccinated")) if visit.get("pet_state_vaccinated") is not None else False,
                "deceased": bool(visit.get("pet_state_deceased")) if visit.get("pet_state_deceased") is not None else False,
                "clinicalExam": clinical_exam if has_clinical_exam else None,
                "labResults": [
                    {
                        "id": str(item.get("medical_record_lab_result_id") or ""),
                        "testType": item.get("test_type") or "",
                        "fileName": item.get("file_name") or "",
                        "fileUrl": item.get("file_url") or "",
                        "fileData": item.get("file_url") or "",
                        "interpretation": item.get("interpretation") or "",
                        "visibleToOwner": bool(item.get("visible_to_owner")),
                        "visibleToOwnerAt": item.get("visible_to_owner_at") or "",
                        "visibleToOwnerBy": item.get("visible_to_owner_by") or "",
                    }
                    for item in visit_lab_results
                ],
                "prescriptions": [
                    {
                        "id": str(item.get("medical_record_prescription_id") or ""),
                        "medicationName": item.get("medication_name") or "",
                        "dosage": item.get("dosage") or "",
                        "route": item.get("route") or "",
                        "frequency": item.get("frequency") or "",
                        "duration": item.get("duration") or "",
                        "prescribedDate": normalize_emr_date(item.get("prescribed_date")) or "",
                        "instructions": item.get("instructions") or "",
                    }
                    for item in visit_prescriptions
                ],
                "selectedServices": [
                    {
                        "id": str(item.get("medical_record_visit_service_id") or ""),
                        "name": item.get("service_name") or "",
                        "price": parse_emr_float(item.get("service_price")) or 0,
                        "description": item.get("service_description") or "",
                    }
                    for item in visit_services
                ],
                "appointmentId": str(visit.get("source_id")) if visit.get("source_type") == "appointment" and visit.get("source_id") not in (None, "") else None,
                "billingSourceType": "visit",
                "billingSourceId": str(visit.get("medical_record_visit_id") or ""),
                "hasBillingInvoice": bool(visit_billing_invoice),
                "billingInvoiceId": str(visit_billing_invoice.get("billingInvoiceId") or "") if visit_billing_invoice else None,
                "billingInvoiceNumber": visit_billing_invoice.get("billingInvoiceNumber") if visit_billing_invoice else None,
                "medicalInformation": medical_information_by_target.get(
                    f"{(visit.get('source_type') or '').strip().lower()}-{visit.get('source_id')}"
                ) if (visit.get("source_type") or "").strip().lower() in {"appointment", "walkin"} and visit.get("source_id") not in (None, "") else None,
                "vaccinationDetails": (
                    {
                        "id": str(visit_vaccinations[0].get("medical_record_vaccination_id") or ""),
                        "vaccineName": visit_vaccinations[0].get("vaccine_name") or "",
                        "doseVolume": visit_vaccinations[0].get("dose_volume") or "",
                        "injectionSite": visit_vaccinations[0].get("injection_site") or "",
                        "manufacturer": visit_vaccinations[0].get("manufacturer") or "",
                        "dateAdministered": normalize_emr_date(visit_vaccinations[0].get("date_administered")) or "",
                        "nextDueDate": normalize_emr_date(visit_vaccinations[0].get("next_due_date")) or "",
                        "visibleToOwner": bool(visit_vaccinations[0].get("visible_to_owner")),
                        "visibleToOwnerAt": visit_vaccinations[0].get("visible_to_owner_at") or "",
                        "visibleToOwnerBy": visit_vaccinations[0].get("visible_to_owner_by") or "",
                    }
                    if visit_vaccinations else None
                ),
            }
            normalized_visits.append(normalized_visit)

        latest_visit = visits[-1] if visits else None
        pet_weight_value = parse_emr_float(pet.get("weight_kg"))
        owner_first_name = owner.get("firstName") or owner.get("first_name") or ""
        owner_last_name = owner.get("lastName") or owner.get("last_name") or ""
        pet_vaccination_urls = pet.get("vaccination_urls") or []

        normalized_records.append({
            "id": record_id,
            "pk": record_id,
            "petId": pet.get("pet_id"),
            "ownerId": owner.get("id"),
            "patientId": format_pet_patient_id(pet.get("pet_id")),
            "petName": pet.get("pet_name") or "",
            "ownerName": get_profile_display_name(owner) or "Unknown Owner",
            "ownerFirstName": owner_first_name,
            "ownerLastName": owner_last_name,
            "ownerEmail": owner.get("email") or "",
            "ownerContact": owner.get("contact_number") or "",
            "lastVisit": format_emr_display_date(latest_visit.get("visit_date")) if latest_visit else "",
            "lastVisitRaw": normalize_emr_date(latest_visit.get("visit_date")) if latest_visit else "",
            "veterinarian": (latest_visit.get("veterinarian_name") or "") if latest_visit else "",
            "reason": (latest_visit.get("reason") or "") if latest_visit else "",
            "deceased": bool(pet.get("is_deceased")),
            "detailsLoaded": bool(include_details),
            "visitHistory": normalized_visits if include_details else [],
            "petDetails": {
                "name": pet.get("pet_name") or "",
                "breed": pet.get("pet_breed") or "",
                "species": pet.get("pet_species") or "Dog",
                "gender": pet.get("pet_gender") or "Male",
                "dateOfBirth": normalize_emr_date(pet.get("birthday")) or "",
                "age": calculate_emr_pet_age(pet.get("birthday"), pet.get("age") or ""),
                "weight": pet_weight_value or 0,
                "weightUnit": "kg",
                "colorMarkings": pet.get("color_markings") or "",
                "neutered": bool(pet.get("is_neutered")) if pet.get("is_neutered") is not None else False,
                "deceased": bool(pet.get("is_deceased")),
                "vaccinated": bool(pet.get("is_vaccinated")),
                "vaccinationProof": pet_vaccination_urls[0] if pet_vaccination_urls else "",
                "image": pet.get("pet_photo_url") or "",
                "doctorRemarks": (latest_visit.get("doctor_remarks") or "") if latest_visit else "",
                "doctorAssigned": (latest_visit.get("veterinarian_name") or "") if latest_visit else "",
                "reasonForVisit": (latest_visit.get("reason") or "") if latest_visit else "",
            },
        })

    normalized_records.sort(
        key=lambda item: (
            item.get("lastVisitRaw") or "",
            int(item.get("id") or 0)
        ),
        reverse=True
    )
    return normalized_records


def save_emr_record_payload(data, existing_record_id=None, branch_scope=None):
    data = data or {}
    pet_id = data.get("petId") or data.get("pet_id")
    if pet_id in (None, ""):
        raise ValueError("petId is required to save a medical record.")
    validate_emr_record_required_fields(data)

    pet_id = int(pet_id)
    pet_profile = get_single_row("pet_profile", "pet_id", pet_id)
    if not pet_profile:
        raise ValueError("Selected pet profile was not found.")

    existing_record = None
    if existing_record_id is not None:
        existing_record = get_single_row("medical_records", "medical_record_id", existing_record_id)
        if not existing_record:
            raise ValueError("Medical record not found.")
    if not existing_record:
        existing_record = get_single_row("medical_records", "pet_id", pet_id)

    now_iso = datetime.utcnow().isoformat()
    if existing_record:
        medical_record_id = int(existing_record.get("medical_record_id"))
        supabase_admin.table("medical_records").update({
            "pet_id": pet_id,
            "updated_at": now_iso,
        }).eq("medical_record_id", medical_record_id).execute()
    else:
        created_record = supabase_admin.table("medical_records").insert({
            "pet_id": pet_id,
            "updated_at": now_iso,
        }).execute().data or []
        if not created_record:
            raise ValueError("Failed to create medical record.")
        medical_record_id = int(created_record[0].get("medical_record_id"))

    owner_visibility_maps = get_emr_owner_visibility_maps(medical_record_id)
    supabase_admin.table("medical_record_visits").delete().eq("medical_record_id", medical_record_id).execute()

    visit_history = data.get("visitHistory") or []
    if not visit_history:
        default_visit = build_emr_default_visit(data)
        visit_history = [default_visit] if default_visit else []

    for index, visit in enumerate(visit_history, start=1):
        if not visit:
            continue

        clinical_exam = visit.get("clinicalExam") or {}
        normalized_visit_date = normalize_emr_date(visit.get("date")) or datetime.utcnow().date().strftime("%Y-%m-%d")
        normalized_visit_time = normalize_db_time(visit.get("time")) or None
        source_id_raw = visit.get("appointmentId") or visit.get("sourceId")
        source_type = (visit.get("sourceType") or ("appointment" if source_id_raw not in (None, "") else "manual")).strip().lower()
        if source_type not in {"manual", "appointment", "walkin"}:
            source_type = "manual"
        visit_branch_id = resolve_emr_visit_branch_id(
            source_type=source_type,
            source_id=source_id_raw,
            branch_scope=branch_scope,
            fallback_branch_id=visit.get("branchId") or visit.get("branch_id") or data.get("branchId") or data.get("branch_id"),
        )
        _, branch_access_error = validate_branch_scope_access(branch_scope, visit_branch_id)
        if branch_access_error:
            raise ValueError(branch_access_error)

        visit_payload = {
            "medical_record_id": medical_record_id,
            "source_type": source_type,
            "source_id": int(source_id_raw) if source_id_raw not in (None, "") else None,
            "branch_id": visit_branch_id,
            "visit_date": normalized_visit_date,
            "visit_time": normalized_visit_time,
            "veterinarian_name": visit.get("veterinarian") or "",
            "reason": visit.get("reason") or "",
            "doctor_remarks": visit.get("doctorRemarks") or "",
            "weight_value": parse_emr_float(visit.get("weight")),
            "weight_unit": visit.get("weightUnit") if visit.get("weightUnit") in {"kg", "lbs"} else "kg",
            "same_as_last_weight": bool(visit.get("sameAsLastWeight")),
            "pet_state_neutered": coerce_optional_bool(visit.get("neutered")),
            "pet_state_vaccinated": coerce_optional_bool(visit.get("vaccinated")),
            "pet_state_deceased": coerce_optional_bool(visit.get("deceased")),
            "body_length_value": parse_emr_float(clinical_exam.get("length")),
            "body_length_unit": clinical_exam.get("lengthUnit") if clinical_exam.get("lengthUnit") in {"cm", "inches"} else None,
            "temperature_value": parse_emr_float(clinical_exam.get("temperature")),
            "temperature_unit": clinical_exam.get("tempUnit") if clinical_exam.get("tempUnit") in {"C", "F"} else None,
            "heart_rate": clinical_exam.get("heartRate") or "",
            "breathing_rate": clinical_exam.get("breathingRate") or "",
            "additional_findings": clinical_exam.get("additionalFindings") or "",
            "updated_at": now_iso,
        }
        visit_row = supabase_admin.table("medical_record_visits").insert(visit_payload).execute().data or []
        if not visit_row:
            continue
        visit_id = int(visit_row[0].get("medical_record_visit_id"))

        prescriptions = []
        for child_index, prescription in enumerate(visit.get("prescriptions") or [], start=1):
            if not (prescription.get("medicationName") or "").strip():
                continue
            prescriptions.append({
                "medical_record_visit_id": visit_id,
                "medication_name": prescription.get("medicationName") or "",
                "dosage": prescription.get("dosage") or "",
                "route": prescription.get("route") or "",
                "frequency": prescription.get("frequency") or "",
                "duration": prescription.get("duration") or "",
                "prescribed_date": normalize_emr_date(prescription.get("prescribedDate")),
                "instructions": prescription.get("instructions") or "",
                "sort_order": child_index,
            })
        if prescriptions:
            supabase_admin.table("medical_record_prescriptions").insert(prescriptions).execute()

        lab_results = []
        for child_index, lab_result in enumerate(visit.get("labResults") or [], start=1):
            if not (lab_result.get("testType") or "").strip():
                continue
            file_url = lab_result.get("fileUrl") or lab_result.get("fileData") or ""
            visibility_payload = build_owner_visibility_payload(
                lab_result,
                existing_row=owner_visibility_maps["lab_results"].get(str(lab_result.get("id") or "")),
            )
            lab_results.append({
                "medical_record_visit_id": visit_id,
                "test_type": lab_result.get("testType") or "",
                "file_name": lab_result.get("fileName") or "",
                "file_url": file_url,
                "interpretation": lab_result.get("interpretation") or "",
                "sort_order": child_index,
                **visibility_payload,
            })
        if lab_results:
            supabase_admin.table("medical_record_lab_results").insert(lab_results).execute()

        services = []
        for child_index, service in enumerate(visit.get("selectedServices") or [], start=1):
            if not (service.get("name") or "").strip():
                continue
            services.append({
                "medical_record_visit_id": visit_id,
                "service_name": service.get("name") or "",
                "service_price": parse_emr_float(service.get("price")),
                "service_description": service.get("description") or "",
                "sort_order": child_index,
            })
        if services:
            supabase_admin.table("medical_record_visit_services").insert(services).execute()

        vaccination = visit.get("vaccinationDetails") or {}
        if (vaccination.get("vaccineName") or "").strip():
            vaccination_visibility_payload = build_owner_visibility_payload(
                vaccination,
                existing_row=owner_visibility_maps["vaccinations"].get(str(vaccination.get("id") or "")),
            )
            supabase_admin.table("medical_record_vaccinations").insert({
                "medical_record_visit_id": visit_id,
                "vaccine_name": vaccination.get("vaccineName") or "",
                "dose_volume": vaccination.get("doseVolume") or "",
                "injection_site": vaccination.get("injectionSite") or "",
                "manufacturer": vaccination.get("manufacturer") or "",
                "date_administered": normalize_emr_date(vaccination.get("dateAdministered")) or datetime.utcnow().date().strftime("%Y-%m-%d"),
                "next_due_date": normalize_emr_date(vaccination.get("nextDueDate")),
                "sort_order": 1,
                **vaccination_visibility_payload,
            }).execute()

    pet_details = data.get("petDetails") or {}
    latest_visit = visit_history[-1] if visit_history else {}
    latest_weight_value = normalize_weight_kg(latest_visit.get("weight"), latest_visit.get("weightUnit"))
    fallback_weight_value = normalize_weight_kg(pet_details.get("weight"), pet_details.get("weightUnit"))
    latest_neutered = coerce_optional_bool(latest_visit.get("neutered"))
    fallback_neutered = coerce_optional_bool(pet_details.get("neutered"))
    latest_vaccinated = coerce_optional_bool(latest_visit.get("vaccinated"))
    fallback_vaccinated = coerce_optional_bool(pet_details.get("vaccinated"))
    latest_deceased = coerce_optional_bool(latest_visit.get("deceased"))
    fallback_deceased = coerce_optional_bool(pet_details.get("deceased"))

    pet_updates = {
        "pet_name": data.get("petName") or pet_details.get("name") or pet_profile.get("pet_name"),
        "pet_species": pet_details.get("species") or data.get("species") or pet_profile.get("pet_species"),
        "pet_breed": pet_details.get("breed") or data.get("breed") or pet_profile.get("pet_breed"),
        "pet_gender": pet_details.get("gender") or data.get("gender") or pet_profile.get("pet_gender"),
        "birthday": normalize_emr_date(pet_details.get("dateOfBirth")) or pet_profile.get("birthday"),
        "age": pet_details.get("age") or pet_profile.get("age"),
        "weight_kg": str(fallback_weight_value if fallback_weight_value is not None else latest_weight_value) if (fallback_weight_value is not None or latest_weight_value is not None) else pet_profile.get("weight_kg"),
        "pet_photo_url": pet_details.get("image") or pet_profile.get("pet_photo_url"),
        "color_markings": pet_details.get("colorMarkings") or pet_profile.get("color_markings"),
        "is_vaccinated": bool(fallback_vaccinated) if fallback_vaccinated is not None else (bool(latest_vaccinated) if latest_vaccinated is not None else bool(pet_profile.get("is_vaccinated"))),
        "is_neutered": fallback_neutered if fallback_neutered is not None else (latest_neutered if latest_neutered is not None else pet_profile.get("is_neutered")),
        "is_deceased": bool(fallback_deceased) if fallback_deceased is not None else (bool(latest_deceased) if latest_deceased is not None else bool(pet_profile.get("is_deceased"))),
        "updated_at": now_iso,
    }

    vaccination_proof = pet_details.get("vaccinationProof")
    if vaccination_proof:
        pet_updates["vaccination_urls"] = [vaccination_proof]
    pet_updates["deceased_at"] = now_iso if pet_updates.get("is_deceased") else None

    supabase_admin.table("pet_profile").update(pet_updates).eq("pet_id", pet_id).execute()

    owner_id = pet_profile.get("owner_id")
    if owner_id:
        owner_updates = {
            "firstName": data.get("ownerFirstName") or None,
            "lastName": data.get("ownerLastName") or None,
            "email": data.get("ownerEmail") or None,
            "contact_number": data.get("ownerContact") or None,
        }
        owner_updates = {key: value for key, value in owner_updates.items() if value not in (None, "")}
        if owner_updates:
            supabase_admin.table("patient_account").update(owner_updates).eq("id", owner_id).execute()

    refreshed_records = get_emr_records([medical_record_id], include_billing=True, branch_scope=branch_scope)
    return refreshed_records[0] if refreshed_records else None


def get_emr_pet_appointments(pet_id, branch_scope=None):
    appointments_query = supabase_admin.table("appointments").select("*").eq("pet_id", pet_id)
    appointments_query = apply_branch_scope_to_query(appointments_query, branch_scope)
    appointments = execute_with_retry(
        lambda: appointments_query.order("appointment_date").execute(),
        context="Fetch EMR pet appointments"
    ).data or []
    doctors = execute_with_retry(
        lambda: supabase_admin.table("employee_accounts").select("*").execute(),
        context="Fetch EMR appointment doctors"
    ).data or []
    appointment_ids = [item.get("appointment_id") for item in appointments if item.get("appointment_id") not in (None, "")]
    medical_information_rows = []
    if appointment_ids:
        medical_information_rows = execute_with_retry(
            lambda: supabase_admin.table("medical_information").select("*").in_("appointment_id", appointment_ids).execute(),
            context="Fetch EMR appointment medical information"
        ).data or []

    doctors_by_id = {str(item.get("id")): item for item in doctors}
    medical_information_by_target = build_medical_information_lookup(medical_information_rows)

    normalized = []
    for appointment in appointments:
        status = (appointment.get("status") or "").strip().lower()
        if status in {"cancelled", "completed"}:
            continue

        doctor = doctors_by_id.get(str(appointment.get("doctor_id") or appointment.get("assigned_doctor_id")), {})
        veterinarian_name = get_profile_display_name(doctor) or get_assigned_doctor_name_from_record(appointment) or "Unassigned"
        appointment_type = appointment.get("appointment_type") or ""
        appointment_reason = (appointment.get("patient_reason") or "").strip()

        normalized.append({
            "id": str(appointment.get("appointment_id") or ""),
            "date": format_emr_display_date(appointment.get("appointment_date")),
            "dateRaw": normalize_emr_date(appointment.get("appointment_date")) or "",
            "time": format_display_time(appointment.get("appointment_time")) or "",
            "veterinarian": veterinarian_name,
            "reason": appointment_reason,
            "services": [{
                "id": f"appointment-{appointment.get('appointment_id')}",
                "name": appointment_type,
                "price": 0,
            }] if appointment_type else [],
            "status": "scheduled",
            "medicalInformation": medical_information_by_target.get(f"appointment-{appointment.get('appointment_id')}"),
        })

    return normalized


def normalize_email_address(email):
    return (email or "").strip().lower()


def is_valid_email_address(email):
    return bool(re.fullmatch(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", normalize_email_address(email)))


def build_email_change_otp_key(user_id, email):
    return f"change-email:{user_id}:{normalize_email_address(email)}"


def find_account_by_email(email):
    normalized_email = normalize_email_address(email)
    if not normalized_email:
        return None

    patient = get_single_row("patient_account", "email", normalized_email)
    if patient:
        return {"account_type": "patient", "user_id": patient.get("id"), "email": normalized_email}

    employee = get_single_row("employee_accounts", "email", normalized_email)
    if employee:
        return {"account_type": "employee", "user_id": employee.get("id"), "email": normalized_email}

    return None


def get_profile_display_name(profile):
    if not profile:
        return ""

    first_name = profile.get("firstName") or profile.get("first_name") or ""
    last_name = profile.get("lastName") or profile.get("last_name") or ""
    combined_name = f"{first_name} {last_name}".strip()

    return (
        combined_name
        or profile.get("full_name")
        or profile.get("fullname")
        or profile.get("username")
        or profile.get("email")
        or ""
    )


def normalize_public_profile(profile):
    if not profile:
        return None

    first_name = profile.get("firstName") or profile.get("first_name") or ""
    last_name = profile.get("lastName") or profile.get("last_name") or ""
    full_name = (
        profile.get("full_name")
        or profile.get("fullname")
        or f"{first_name} {last_name}".strip()
        or get_profile_display_name(profile)
    )

    if (not first_name or not last_name) and full_name:
        split_first, split_last = split_full_name(full_name)
        first_name = first_name or split_first
        last_name = last_name or split_last

    contact = profile.get("contact_number") or profile.get("contactNumber") or profile.get("contactnumber") or ""
    user_image = (
        profile.get("userImage")
        or profile.get("userimage")
        or profile.get("user_image")
        or profile.get("profileImage")
    )
    created_at = profile.get("created_at") or profile.get("dateJoined") or profile.get("date_joined") or ""
    raw_status = (profile.get("status") or "active").strip().lower()

    return {
        "id": profile.get("id"),
        "username": profile.get("username") or "",
        "email": profile.get("email") or "",
        "fullname": full_name,
        "fullName": full_name,
        "firstName": first_name,
        "lastName": last_name,
        "contact_number": contact,
        "contactNumber": contact,
        "role": profile.get("role"),
        "status": raw_status,
        "userImage": user_image,
        "userimage": user_image,
        "profileImage": user_image,
        "created_at": created_at,
        "dateJoined": created_at,
    }


def build_reschedule_action_links(token):
    base_url = get_public_base_url()
    return {
        "confirm": f"{base_url}/reschedule/confirm/{token}",
        "choose_another": f"{base_url}/reschedule/choose-another-date/{token}",
        "cancel": f"{base_url}/reschedule/cancel/{token}",
    }


def parse_uuid_or_none(value):
    if not value:
        return None

    try:
        return str(uuid.UUID(str(value)))
    except (ValueError, TypeError, AttributeError):
        return None


def resolve_appointment_target(target_id, record_type=None):
    normalized_type = (record_type or "").strip().lower()

    if normalized_type == "walkin":
        return "walkin_appointments", "walkin_id", int(target_id)
    if normalized_type == "appointment":
        return "appointments", "appointment_id", int(target_id)

    appointment = get_single_row("appointments", "appointment_id", target_id)
    if appointment:
        return "appointments", "appointment_id", int(target_id)

    walkin = get_single_row("walkin_appointments", "walkin_id", target_id)
    if walkin:
        return "walkin_appointments", "walkin_id", int(target_id)

    raise ValueError("Appointment target not found")


def get_reschedule_email_context(table_name, id_column, record_id):
    record_res = supabase_admin.table(table_name).select("*").eq(id_column, record_id).single().execute()
    record = record_res.data or {}

    if table_name == "walkin_appointments":
        return {
            "record": record,
            "email": record.get("email"),
            "patient_name": f"{record.get('first_name', '')} {record.get('last_name', '')}".strip() or "Patient",
            "pet_name": record.get("pet_name") or "your pet",
            "service_name": record.get("appointment_type") or "Appointment",
        }

    owner = {}
    pet = {}

    owner_id = record.get("owner_id")
    pet_id = record.get("pet_id")

    if owner_id:
        owner_res = supabase_admin.table("patient_account").select("*").eq("id", owner_id).single().execute()
        owner = owner_res.data or {}

    if pet_id:
        pet_res = supabase_admin.table("pet_profile").select("*").eq("pet_id", pet_id).single().execute()
        pet = pet_res.data or {}

    return {
        "record": record,
        "email": owner.get("email"),
        "patient_name": get_profile_display_name(owner) or "Patient",
        "pet_name": pet.get("pet_name") or "your pet",
        "service_name": record.get("appointment_type") or "Appointment",
    }


def get_assigned_doctor_name_from_record(record):
    if not record:
        return None

    doctor_id = record.get("assigned_doctor_id") or record.get("doctor_id")
    if not doctor_id:
        return None

    try:
        doctor_res = supabase_admin.table("employee_accounts").select("*").eq("id", doctor_id).single().execute()
        doctor = doctor_res.data or {}
        full_name = get_profile_display_name(doctor)
        return full_name or None
    except Exception as doctor_error:
        print(f"Assigned doctor lookup error: {doctor_error}")
        return None


def get_pending_reschedule_request(token):
    req_res = supabase_admin.table("reschedule_requests").select("*").eq("token", token).single().execute()
    req = req_res.data or None

    if not req:
        return None, "not_found"

    if req.get("status") != "pending":
        return req, "closed"

    expires_at_raw = req.get("expires_at")
    if expires_at_raw:
        expires_at = datetime.fromisoformat(str(expires_at_raw).replace("Z", "+00:00"))
        if datetime.now(expires_at.tzinfo) > expires_at:
            supabase_admin.table("reschedule_requests").update({
                "status": "expired",
                "responded_at": datetime.utcnow().isoformat()
            }).eq("request_id", req.get("request_id")).execute()
            req["status"] = "expired"
            return req, "expired"

    return req, "ok"


def get_pending_reschedule_request_by_id(request_id, allow_needs_new_schedule=False):
    req = get_reschedule_request_by_id(request_id)

    if not req:
        return None, "not_found"

    current_status = (req.get("status") or "").strip().lower()

    if current_status == "pending":
        expires_at_raw = req.get("expires_at")
        if expires_at_raw:
            expires_at = datetime.fromisoformat(str(expires_at_raw).replace("Z", "+00:00"))
            if datetime.now(expires_at.tzinfo) > expires_at:
                supabase_admin.table("reschedule_requests").update({
                    "status": "expired",
                    "responded_at": datetime.utcnow().isoformat()
                }).eq("request_id", req.get("request_id")).execute()
                req["status"] = "expired"
                return req, "expired"

        return req, "ok"

    if allow_needs_new_schedule and current_status == "needs_new_schedule":
        return req, "ok"

    if current_status == "expired":
        return req, "expired"

    return req, "closed"


def get_reschedule_request_by_id(request_id):
    req_res = supabase_admin.table("reschedule_requests").select("*").eq("request_id", request_id).single().execute()
    return req_res.data or None


def apply_reschedule_to_target(req, appointment_date, appointment_time):
    table_name, id_column, resolved_id = resolve_appointment_target(req.get("target_id"), req.get("target_type"))
    current_res = supabase_admin.table(table_name).select("*").eq(id_column, resolved_id).single().execute()
    current_record = current_res.data or {}
    current_status = current_record.get("status")

    update_payload = {
        "appointment_date": appointment_date,
        "appointment_time": normalize_db_time(appointment_time),
        "reschedule_reason": req.get("reason"),
        "rescheduled_at": datetime.utcnow().isoformat(),
        "rescheduled_by": req.get("requested_by"),
    }

    if current_status and current_status not in ("cancelled", "completed"):
        update_payload["status"] = current_status

    supabase_admin.table(table_name).update(update_payload).eq(id_column, resolved_id).execute()
    return table_name, id_column, resolved_id


def build_patient_preference_note(preferred_date=None, preferred_time=None, response_note=None, fallback_message="Patient requested another schedule"):
    note_parts = []

    if preferred_date:
        note_parts.append(f"Preferred date: {preferred_date}")
    if preferred_time:
        note_parts.append(f"Preferred time: {preferred_time}")

    cleaned_response_note = (response_note or "").strip()
    if cleaned_response_note:
        note_parts.append(f"Patient note: {cleaned_response_note}")

    return " | ".join(note_parts) if note_parts else fallback_message


def render_html_page(title, message, extra_html=""):
    html = f"""
        <!doctype html>
        <html lang="en">
        <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>{title}</title>
            <style>
                body {{ font-family: Arial, sans-serif; background: #f6f8fb; margin: 0; padding: 24px; color: #1f2937; }}
                .card {{ max-width: 760px; margin: 40px auto; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 12px 30px rgba(0,0,0,0.08); }}
                h1 {{ margin-top: 0; font-size: 28px; }}
                p {{ line-height: 1.6; }}
                a, button {{ display: inline-block; margin: 8px 8px 0 0; padding: 12px 16px; border-radius: 8px; text-decoration: none; border: none; cursor: pointer; font-size: 14px; }}
                .primary {{ background: #2563eb; color: white; }}
                .success {{ background: #2e7d32; color: white; }}
                .danger {{ background: #c62828; color: white; }}
                .muted {{ background: #eef2ff; color: #334155; }}
                label {{ display: block; margin: 14px 0 6px; font-weight: 600; }}
                input, textarea, select {{ width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; box-sizing: border-box; }}
            </style>
        </head>
        <body>
            <div class="card">
                <h1>{title}</h1>
                <p>{message}</p>
                {extra_html}
            </div>
        </body>
        </html>
    """
    return html, 200, {"Content-Type": "text/html; charset=utf-8"}


def normalize_special_date_recurrence(value):
    normalized = str(value or "once").strip().lower()
    return "annual" if normalized in {"annual", "yearly", "recurring"} else "once"


def extract_month_day_from_date_key(date_key):
    try:
        parsed = datetime.strptime(str(date_key or ""), "%Y-%m-%d").date()
        return parsed.month, parsed.day
    except (TypeError, ValueError):
        return None, None


def normalize_special_date_record(record):
    recurrence = normalize_special_date_recurrence(record.get("event_recurrence"))
    event_date = record.get("event_date")
    month_value = record.get("event_month")
    day_value = record.get("event_day")
    if month_value in (None, "") or day_value in (None, ""):
        month_value, day_value = extract_month_day_from_date_key(event_date)

    try:
        month_value = int(month_value) if month_value not in (None, "") else None
        day_value = int(day_value) if day_value not in (None, "") else None
    except (TypeError, ValueError):
        month_value = None
        day_value = None

    return {
        **record,
        "event_recurrence": recurrence,
        "event_month": month_value,
        "event_day": day_value,
    }


def split_special_date_rules(records):
    exact_dates = set()
    annual_dates = set()
    for raw_record in records or []:
        record = normalize_special_date_record(raw_record)
        if record.get("event_recurrence") == "annual":
            month_value = record.get("event_month")
            day_value = record.get("event_day")
            if month_value and day_value:
                annual_dates.add(f"{int(month_value):02d}-{int(day_value):02d}")
        elif record.get("event_date"):
            exact_dates.add(str(record.get("event_date")))
    return exact_dates, annual_dates


def is_special_date_blocked(date_value, records):
    if isinstance(date_value, str):
        try:
            date_value = datetime.strptime(date_value, "%Y-%m-%d").date()
        except ValueError:
            return False
    exact_dates, annual_dates = split_special_date_rules(records)
    date_key = date_value.isoformat()
    annual_key = f"{date_value.month:02d}-{date_value.day:02d}"
    return date_key in exact_dates or annual_key in annual_dates


def build_special_date_payload_from_request(data):
    event_name = (data.get('event_name') or '').strip()
    recurrence = normalize_special_date_recurrence(data.get('event_recurrence') or data.get('recurrence_type'))
    raw_event_date = data.get('event_date')
    event_month = data.get('event_month')
    event_day = data.get('event_day')

    if raw_event_date and (event_month in (None, "") or event_day in (None, "")):
        event_month, event_day = extract_month_day_from_date_key(raw_event_date)

    try:
        event_month = int(event_month) if event_month not in (None, "") else None
        event_day = int(event_day) if event_day not in (None, "") else None
    except (TypeError, ValueError):
        event_month = None
        event_day = None

    if not event_name:
        raise ValueError("Event name is required")

    if recurrence == "annual":
        if not event_month or not event_day:
            raise ValueError("Event month and day are required for annual special days")
        if event_month < 1 or event_month > 12 or event_day < 1 or event_day > 31:
            raise ValueError("Invalid annual special day")
        event_date = None
    else:
        if not raw_event_date:
            raise ValueError("Event date is required")
        try:
            datetime.strptime(str(raw_event_date), "%Y-%m-%d")
        except ValueError:
            raise ValueError("Invalid event date format")
        event_date = raw_event_date

    return {
        "event_name": event_name,
        "event_date": event_date,
        "event_description": data.get('event_description') or data.get('description') or None,
        "event_recurrence": recurrence,
        "event_month": event_month,
        "event_day": event_day,
    }


def render_choose_another_date_page(req, error_message=""):
    proposed_date = escape(str(req.get("proposed_appointment_date") or "Not provided"))
    proposed_time = escape(format_display_time(req.get("proposed_appointment_time")) or "Not provided")
    error_html = f"<div class='error-box'>{escape(error_message)}</div>" if error_message else ""

    try:
        all_special_dates = supabase_admin.table("special_dates").select("*").execute().data or []
    except Exception as e:
        print(f"Special dates lookup warning: {e}")
        all_special_dates = []
    all_time_slots = supabase_admin.table("time_slots").select("*").execute().data or []
    day_availability_rows = supabase_admin.table("working_days").select("*").execute().data or []

    day_availability = {
        (row.get("day_of_week") or "").strip().lower(): bool(row.get("is_active"))
        for row in day_availability_rows
        if row.get("day_of_week")
    }
    special_dates, annual_special_dates = split_special_date_rules(all_special_dates)

    slots_by_day = {}
    for slot in all_time_slots:
        day_key = (slot.get("day_of_week") or "").strip().lower()
        if not day_key:
            continue
        if slot.get("is_active") is False:
            continue
        start_time = normalize_db_time(slot.get("start_time"))
        slots_by_day.setdefault(day_key, []).append({
            "value": start_time,
            "label": format_display_time_range(start_time),
        })

    slots_by_date = {}
    today_value = get_current_manila_date()
    current_month_start = date(today_value.year, today_value.month, 1)
    month_after_next_start = date(
        current_month_start.year + ((current_month_start.month - 1 + 2) // 12),
        ((current_month_start.month - 1 + 2) % 12) + 1,
        1
    )
    next_month_start = date(
        current_month_start.year + ((current_month_start.month - 1 + 1) // 12),
        ((current_month_start.month - 1 + 1) % 12) + 1,
        1
    )
    for month_offset in range(0, 2):
        month_base = date(today_value.year + ((today_value.month - 1 + month_offset) // 12), ((today_value.month - 1 + month_offset) % 12) + 1, 1)
        cursor = month_base
        while cursor.month == month_base.month:
            day_key = cursor.strftime("%A").lower()
            date_key = cursor.isoformat()
            if cursor >= today_value and day_availability.get(day_key) and not is_special_date_blocked(cursor, all_special_dates):
                day_slots = slots_by_day.get(day_key, [])
                if day_slots:
                    slots_by_date[date_key] = day_slots
            cursor += timedelta(days=1)

    html = f"""
        <!doctype html>
        <html lang="en">
        <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Choose Another Date</title>
            <style>
                body {{ margin:0; padding:28px 18px; font-family:Arial, sans-serif; background:linear-gradient(180deg,#f6f8fb 0%,#eef4ff 100%); color:#1f2937; }}
                .card {{ max-width:1200px; margin:0 auto; background:#fff; border-radius:24px; box-shadow:0 18px 50px rgba(61,103,238,.08); padding:28px; }}
                .summary {{ margin-top:20px; padding:18px 20px; border-radius:16px; border:1px solid #d8e3ff; background:linear-gradient(135deg,#f8fbff 0%,#eef3ff 100%); }}
                .summary small {{ display:block; color:#3d67ee; font-weight:700; text-transform:uppercase; letter-spacing:.04em; margin-bottom:8px; }}
                .layout {{ display:grid; grid-template-columns:minmax(320px,420px) minmax(360px,1fr); gap:22px; margin-top:24px; }}
                .panel {{ background:#fff; border:1px solid #e6e9f2; border-radius:20px; padding:22px; box-shadow:0 0 18px rgba(0,0,0,.04); }}
                .calendar-header {{ display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; }}
                .calendar-grid {{ display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:12px 8px; justify-items:center; }}
                .calendar-label {{ font-size:12px; font-weight:700; color:#98a2b3; text-transform:uppercase; }}
                .calendar-day, .calendar-spacer {{ width:44px; height:44px; }}
                .calendar-day {{ border-radius:50%; border:1px solid #111827; background:#fff; color:#111827; cursor:pointer; }}
                .calendar-day.selected {{ background:#3d67ee; color:#fff; border-color:#3d67ee; }}
                .calendar-day.disabled {{ color:#c5cad8; border-color:#dce2ef; background:#fafbff; cursor:not-allowed; }}
                .slot-list {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:14px; }}
                .slot-btn {{ border:1px solid #cfd8f6; background:#fff; border-radius:14px; padding:14px 16px; font-size:15px; font-weight:600; cursor:pointer; }}
                .slot-btn.selected {{ background:linear-gradient(135deg,#3d67ee 0%,#5b7fff 100%); color:#fff; border-color:#3d67ee; }}
                .hint, .empty, .error-box {{ margin-top:16px; padding:12px 14px; border-radius:12px; font-size:14px; }}
                .hint {{ background:#e8f5e9; color:#2e7d32; font-weight:600; }}
                .empty {{ background:#f5f7fb; color:#6b7280; text-align:center; }}
                .error-box {{ background:#fff1f1; color:#d32f2f; border:1px solid #f3c6c6; }}
                textarea {{ width:100%; min-height:130px; padding:16px 18px; border:1px solid #d6dceb; border-radius:16px; resize:vertical; }}
                .actions {{ display:flex; justify-content:flex-end; margin-top:26px; grid-column:1 / -1; }}
                .submit {{ background:linear-gradient(135deg,#3d67ee 0%,#2557eb 100%); color:#fff; border:none; border-radius:14px; padding:16px 28px; font-size:16px; font-weight:700; cursor:pointer; }}
                .submit:disabled {{ opacity:.45; cursor:not-allowed; }}
                @media (max-width:900px) {{ .layout {{ grid-template-columns:1fr; }} }}
            </style>
        </head>
        <body>
            <div class="card">
                <h1>Choose Another Date</h1>
                <p>Tell the clinic what schedule works better for you using the currently available appointment settings.</p>
                <div class="summary">
                    <small>Clinic Proposed Schedule</small>
                    <div><strong>{proposed_date}</strong> at <strong>{proposed_time}</strong></div>
                </div>
                {error_html}
                <form method="POST" class="layout">
                    <section class="panel">
                        <h2>Select Preferred Date</h2>
                        <p>Only days enabled in the clinic availability settings are selectable here.</p>
                        <div class="calendar-header">
                            <button type="button" id="prevMonthBtn">&#8249;</button>
                            <strong id="calendarMonthLabel"></strong>
                            <button type="button" id="nextMonthBtn">&#8250;</button>
                        </div>
                        <div class="calendar-grid" id="calendarGrid"></div>
                        <div class="hint" id="selectedDateHint">Select an available date.</div>
                        <input type="hidden" name="preferred_date" id="preferredDateInput" />
                    </section>
                    <section style="display:flex;flex-direction:column;gap:16px;">
                        <section class="panel">
                            <h2>Select Preferred Time Slot</h2>
                            <p>Available slots come directly from the clinic's configured time slots for the selected day.</p>
                            <div class="slot-list" id="slotList"></div>
                            <div class="empty" id="slotEmptyState">Pick another date to see other available slots.</div>
                            <input type="hidden" name="preferred_time" id="preferredTimeInput" />
                        </section>
                        <section class="panel">
                            <h2>Notes for the clinic</h2>
                            <textarea name="response_note" placeholder="Let us know which dates or times work better for you."></textarea>
                        </section>
                    </section>
                    <div class="actions"><button type="submit" class="submit" id="submitButton" disabled>Send My Preference</button></div>
                </form>
            </div>
            <script>
                const dayAvailability = __DAY_AVAILABILITY__;
                const specialDates = __SPECIAL_DATES__;
                const annualSpecialDates = __ANNUAL_SPECIAL_DATES__;
                const slotsByDate = __SLOTS_BY_DATE__;
                const monthLabel = document.getElementById('calendarMonthLabel');
                const calendarGrid = document.getElementById('calendarGrid');
                const selectedDateHint = document.getElementById('selectedDateHint');
                const selectedDateInput = document.getElementById('preferredDateInput');
                const selectedTimeInput = document.getElementById('preferredTimeInput');
                const slotList = document.getElementById('slotList');
                const slotEmptyState = document.getElementById('slotEmptyState');
                const submitButton = document.getElementById('submitButton');
                const weekdayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
                const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                const dayKeys = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
                const today = new Date('__TODAY_ISO__T00:00:00');
                const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                const maxMonth = new Date('__NEXT_MONTH_ISO__T00:00:00');
                const monthAfterNext = new Date('__MONTH_AFTER_NEXT_ISO__T00:00:00');
                const prevMonthBtn = document.getElementById('prevMonthBtn');
                const nextMonthBtn = document.getElementById('nextMonthBtn');
                let currentMonth = new Date(today.getFullYear(), today.getMonth(), 1); let selectedDate = ''; let selectedTime = '';
                function formatDateKey(date) {{ const y = date.getFullYear(); const m = String(date.getMonth()+1).padStart(2,'0'); const d = String(date.getDate()).padStart(2,'0'); return `${{y}}-${{m}}-${{d}}`; }}
                function formatAnnualDateKey(date) {{ const m = String(date.getMonth()+1).padStart(2,'0'); const d = String(date.getDate()).padStart(2,'0'); return `${{m}}-${{d}}`; }}
                function formatFriendlyDate(dateKey) {{ if (!dateKey) return 'Select an available date.'; const d = new Date(`${{dateKey}}T00:00:00`); return `Selected: ${{d.toLocaleDateString(undefined, {{ weekday:'long', month:'long', day:'numeric', year:'numeric' }})}}`; }}
                function isSameMonth(a, b) {{ return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth(); }}
                function syncMonthButtons() {{
                    prevMonthBtn.disabled = isSameMonth(currentMonth, minMonth);
                    nextMonthBtn.disabled = isSameMonth(currentMonth, maxMonth);
                    prevMonthBtn.style.opacity = prevMonthBtn.disabled ? '0.45' : '1';
                    nextMonthBtn.style.opacity = nextMonthBtn.disabled ? '0.45' : '1';
                    prevMonthBtn.style.cursor = prevMonthBtn.disabled ? 'not-allowed' : 'pointer';
                    nextMonthBtn.style.cursor = nextMonthBtn.disabled ? 'not-allowed' : 'pointer';
                }}
                function isDateSelectable(date) {{
                    const key = formatDateKey(date);
                    const weekday = dayKeys[date.getDay()];
                    const hasSlots = Boolean((slotsByDate[key] || []).length);
                    return !(date < todayMidnight || date >= monthAfterNext || !dayAvailability[weekday] || specialDates.includes(key) || annualSpecialDates.includes(formatAnnualDateKey(date)) || !hasSlots);
                }}
                function updateSubmitState() {{ submitButton.disabled = !(selectedDate && selectedTime); }}
                function setSelectedDate(dateKey) {{ selectedDate = dateKey; selectedTime = ''; selectedDateInput.value = dateKey; selectedTimeInput.value = ''; selectedDateHint.textContent = formatFriendlyDate(dateKey); renderCalendar(); renderSlots(); updateSubmitState(); }}
                function setSelectedTime(timeValue) {{ selectedTime = timeValue; selectedTimeInput.value = timeValue; renderSlots(); updateSubmitState(); }}
                function renderSlots() {{ slotList.innerHTML = ''; const slots = selectedDate ? (slotsByDate[selectedDate] || []) : []; if (!slots.length) {{ slotEmptyState.style.display='block'; slotEmptyState.textContent = selectedDate ? 'No configured time slots for this date.' : 'Pick another date to see other available slots.'; return; }} slotEmptyState.style.display='none'; slots.forEach((slot) => {{ const btn = document.createElement('button'); btn.type='button'; btn.className='slot-btn' + (selectedTime === slot.value ? ' selected' : ''); btn.textContent = slot.label; btn.addEventListener('click', () => setSelectedTime(slot.value)); slotList.appendChild(btn); }}); }}
                function renderCalendar() {{ calendarGrid.innerHTML=''; monthLabel.textContent = `${{monthNames[currentMonth.getMonth()]}} ${{currentMonth.getFullYear()}}`; syncMonthButtons(); weekdayLabels.forEach((label) => {{ const el = document.createElement('div'); el.className='calendar-label'; el.textContent = label; calendarGrid.appendChild(el); }}); const first = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1); const last = new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1, 0); for (let i=0;i<first.getDay();i++) {{ const spacer=document.createElement('div'); spacer.className='calendar-spacer'; calendarGrid.appendChild(spacer); }} for (let day=1; day<=last.getDate(); day++) {{ const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day); const key = formatDateKey(date); const btn = document.createElement('button'); btn.type='button'; btn.className='calendar-day'; btn.textContent=String(day); const selectable = isDateSelectable(date); if (!selectable) {{ btn.classList.add('disabled'); btn.disabled = true; }} else if (selectedDate === key) {{ btn.classList.add('selected'); }} btn.addEventListener('click', () => {{ if (!selectable) return; setSelectedDate(key); }}); calendarGrid.appendChild(btn); }} }}
                prevMonthBtn.addEventListener('click', () => {{ if (isSameMonth(currentMonth, minMonth)) return; currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth()-1, 1); renderCalendar(); }});
                nextMonthBtn.addEventListener('click', () => {{ if (isSameMonth(currentMonth, maxMonth)) return; currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1, 1); renderCalendar(); }});
                renderCalendar(); renderSlots(); updateSubmitState();
            </script>
        </body>
        </html>
    """

    html = html.replace("__DAY_AVAILABILITY__", json.dumps(day_availability))
    html = html.replace("__SPECIAL_DATES__", json.dumps(sorted(special_dates)))
    html = html.replace("__ANNUAL_SPECIAL_DATES__", json.dumps(sorted(annual_special_dates)))
    html = html.replace("__SLOTS_BY_DATE__", json.dumps(slots_by_date))
    html = html.replace("__TODAY_ISO__", today_value.isoformat())
    html = html.replace("__NEXT_MONTH_ISO__", next_month_start.isoformat())
    html = html.replace("__MONTH_AFTER_NEXT_ISO__", month_after_next_start.isoformat())
    return html, 200, {"Content-Type": "text/html; charset=utf-8"}


def parse_inventory_expiration_date(value, no_expiration=False):
    if no_expiration or not value or str(value).strip().upper() == 'N/A':
        return None

    raw = str(value).strip()
    for fmt in ('%Y-%m-%d', '%m/%d/%Y'):
        try:
            return datetime.strptime(raw, fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue

    raise ValueError('expirationDate must be YYYY-MM-DD or MM/DD/YYYY')


def format_inventory_expiration_date(value, no_expiration=False):
    if no_expiration or not value:
        return 'N/A'

    raw = str(value).strip()
    for fmt in ('%Y-%m-%d', '%m/%d/%Y'):
        try:
            return datetime.strptime(raw[:10] if fmt == '%Y-%m-%d' else raw, fmt).strftime('%m/%d/%Y')
        except ValueError:
            continue
    return raw


def format_inventory_created_date(value):
    if not value:
        return ''
    raw = str(value).strip()
    for fmt in ('%Y-%m-%dT%H:%M:%S.%f%z', '%Y-%m-%dT%H:%M:%S%z', '%Y-%m-%dT%H:%M:%S.%f', '%Y-%m-%dT%H:%M:%S'):
        try:
            return datetime.strptime(raw, fmt).strftime('%m/%d/%Y')
        except ValueError:
            continue
    return raw[:10] if len(raw) >= 10 else raw


def abbreviate_inventory_item_name(item_name):
    words = []
    for raw_word in str(item_name or '').replace('-', ' ').split():
        cleaned = ''.join(ch for ch in raw_word if ch.isalnum())
        if not cleaned:
            continue
        if cleaned.lower() in INVENTORY_ITEM_STOP_WORDS:
            continue
        words.append(cleaned)

    if not words:
        return 'ITEM'

    abbreviation = ''.join(word[0].upper() for word in words[:6])
    return abbreviation or 'ITEM'


def inventory_code_exists(branch_id, code, exclude_item_id=None):
    response = supabase_admin.table('inventory_items') \
        .select('inventory_item_id') \
        .eq('branch_id', branch_id) \
        .eq('item_code', code) \
        .execute()

    for row in (response.data or []):
        if exclude_item_id is None or int(row.get('inventory_item_id')) != int(exclude_item_id):
            return True
    return False


def generate_inventory_item_code(branch_id, category, item_name, exclude_item_id=None):
    category_code = INVENTORY_CATEGORY_CODES.get(category, 'GEN')
    item_code = abbreviate_inventory_item_name(item_name)

    for _ in range(30):
        suffix = ''.join(random.choices(string.digits, k=3))
        code = f"{category_code}-{item_code}-{suffix}"
        if not inventory_code_exists(branch_id, code, exclude_item_id=exclude_item_id):
            return code

    raise ValueError('Unable to generate a unique inventory item code')


def inventory_transaction_reference_exists(branch_id, reference_number):
    response = supabase_admin.table('inventory_transactions') \
        .select('inventory_transaction_id') \
        .eq('branch_id', branch_id) \
        .eq('reference_number', reference_number) \
        .execute()
    return bool(response.data)


def generate_inventory_transaction_reference(branch_id, transaction_type):
    prefix = 'GRN' if transaction_type == 'IN' else 'SOT'
    timestamp = datetime.utcnow().strftime('%Y%m%d-%H%M%S')

    for _ in range(50):
        suffix = ''.join(random.choices(string.digits, k=4))
        reference_number = f'{prefix}-{timestamp}-{suffix}'
        if not inventory_transaction_reference_exists(branch_id, reference_number):
            return reference_number

    raise ValueError('Unable to generate a unique transaction reference number')


def normalize_inventory_name_for_compare(item_name):
    return ' '.join(str(item_name or '').strip().lower().split())


def normalize_inventory_item_name(item_name):
    normalized_words = []
    for raw_word in str(item_name or '').strip().split():
        if not raw_word:
            continue
        if '-' in raw_word:
            normalized_parts = [
                part[:1].upper() + part[1:].lower() if part else ''
                for part in raw_word.split('-')
            ]
            normalized_words.append('-'.join(normalized_parts))
        else:
            normalized_words.append(raw_word[:1].upper() + raw_word[1:].lower())

    return ' '.join(normalized_words)


COMMON_INVENTORY_UNITS = {
    'capsule': 'Capsule',
    'tablet': 'Tablet',
    'bottle': 'Bottle',
    'piece': 'Piece',
    'pack': 'Pack',
    'box': 'Box',
    'vial': 'Vial',
    'tube': 'Tube',
    'sachet': 'Sachet',
    'can': 'Can',
    'bag': 'Bag',
    'ml': 'mL',
    'l': 'L',
    'gram': 'Gram',
    'kg': 'Kg',
}


def normalize_inventory_unit_name(unit_name):
    raw_value = str(unit_name or '').strip()
    if not raw_value:
        return ''

    normalized_key = ' '.join(raw_value.lower().split())
    if normalized_key in COMMON_INVENTORY_UNITS:
        return COMMON_INVENTORY_UNITS[normalized_key]

    normalized_words = []
    for raw_word in raw_value.split():
        if not raw_word:
            continue
        if raw_word.lower() in {'ml', 'l', 'kg'}:
            normalized_words.append(raw_word.upper() if raw_word.lower() != 'ml' else 'mL')
            continue
        if '-' in raw_word:
            normalized_parts = [
                part[:1].upper() + part[1:].lower() if part else ''
                for part in raw_word.split('-')
            ]
            normalized_words.append('-'.join(normalized_parts))
        else:
            normalized_words.append(raw_word[:1].upper() + raw_word[1:].lower())

    return ' '.join(normalized_words)


def resolve_inventory_unit(data, existing=None):
    primary_value = (
        data.get('unit')
        or data.get('unitName')
        or data.get('unit_name')
        or data.get('customUnit')
        or data.get('unitOther')
        or data.get('otherUnit')
        or (existing or {}).get('unit')
        or ''
    )
    unit_name = normalize_inventory_unit_name(primary_value)
    if not unit_name:
        raise ValueError('unit is required')
    if len(unit_name) > 30:
        raise ValueError('unit must be 30 characters or less')
    return unit_name


def find_inventory_duplicate(payload, exclude_item_id=None, include_archived=False):
    query = supabase_admin.table('inventory_items').select(
        'inventory_item_id,item_name,unit,category,no_expiration,expiration_date,is_archived'
    ).eq('branch_id', payload['branch_id']).eq('category', payload['category'])

    response = query.execute()
    target_name = normalize_inventory_name_for_compare(payload['item_name'])

    for row in (response.data or []):
        row_id = row.get('inventory_item_id')
        if exclude_item_id is not None and str(row_id) == str(exclude_item_id):
            continue
        if not include_archived and bool(row.get('is_archived')):
            continue

        if normalize_inventory_name_for_compare(row.get('item_name')) != target_name:
            continue

        row_unit = normalize_inventory_unit_name(row.get('unit') or '')
        payload_unit = normalize_inventory_unit_name(payload.get('unit') or '')
        if row_unit != payload_unit:
            continue

        row_no_expiration = bool(row.get('no_expiration'))
        payload_no_expiration = bool(payload['no_expiration'])
        if row_no_expiration != payload_no_expiration:
            continue

        if payload_no_expiration:
            return row

        if row.get('expiration_date') == payload['expiration_date']:
            return row

    return None


def ensure_inventory_item_is_unique(payload, exclude_item_id=None):
    duplicate = find_inventory_duplicate(payload, exclude_item_id=exclude_item_id, include_archived=False)
    if duplicate:
        raise ValueError('Product already exists with the same unit and expiration date')


def build_inventory_item_payload(data, existing=None):
    item_name = normalize_inventory_item_name(
        data.get('item') or data.get('item_name') or (existing or {}).get('item_name') or ''
    )
    category = (data.get('category') or (existing or {}).get('category') or '').strip()
    if not item_name:
        raise ValueError('item is required')
    if category not in INVENTORY_CATEGORIES:
        raise ValueError('category is invalid')
    unit_name = resolve_inventory_unit(data, existing=existing)

    branch_id = coerce_int(data.get('branch_id', data.get('branchId', (existing or {}).get('branch_id'))), 'branch_id', minimum=1)
    provided_code = (data.get('code') or data.get('item_code') or '').strip()
    existing_code = ((existing or {}).get('item_code') or '').strip()
    if existing:
        code = provided_code or existing_code
        if not code:
            code = generate_inventory_item_code(branch_id, category, item_name, exclude_item_id=existing.get('inventory_item_id'))
    else:
        code = provided_code or generate_inventory_item_code(branch_id, category, item_name)

    base_price = coerce_number(data.get('basePrice', data.get('base_price', (existing or {}).get('base_price'))), 'basePrice', minimum=0.01, maximum=999999)
    selling_price = coerce_number(data.get('sellingPrice', data.get('selling_price', (existing or {}).get('selling_price'))), 'sellingPrice', minimum=0.01, maximum=999999)
    if selling_price < base_price:
        raise ValueError('sellingPrice cannot be less than basePrice')

    no_expiration = parse_bool(data.get('expirationNA', data.get('no_expiration', (existing or {}).get('no_expiration', False))))
    use_max_quantity = parse_bool(data.get('useMaxQuantity', data.get('use_max_quantity', (existing or {}).get('use_max_quantity', False))))
    max_quantity = coerce_int(data.get('maxQuantity', data.get('max_quantity', (existing or {}).get('max_quantity'))), 'maxQuantity', minimum=1, maximum=999999, allow_none=True)
    if use_max_quantity and max_quantity is None:
        raise ValueError('maxQuantity is required when useMaxQuantity is enabled')

    current_stock = coerce_int(data.get('stockCount', data.get('current_stock', (existing or {}).get('current_stock', 0))), 'stockCount', minimum=0, maximum=999999, default=0)
    critical_stock_level = coerce_int(data.get('criticalStockLevel', data.get('critical_stock_level', (existing or {}).get('critical_stock_level', 10))), 'criticalStockLevel', minimum=1, maximum=999999, default=10)
    if use_max_quantity and max_quantity is not None and current_stock > max_quantity:
        raise ValueError('stockCount cannot exceed maxQuantity')

    payload = {
        'branch_id': branch_id,
        'item_code': code,
        'item_name': item_name,
        'unit': unit_name,
        'category': category,
        'base_price': base_price,
        'selling_price': selling_price,
        'current_stock': current_stock,
        'critical_stock_level': critical_stock_level,
        'no_expiration': no_expiration,
        'use_max_quantity': use_max_quantity,
        'max_quantity': max_quantity if use_max_quantity else None,
        'expiration_date': parse_inventory_expiration_date(data.get('expirationDate', data.get('expiration_date', (existing or {}).get('expiration_date'))), no_expiration=no_expiration),
    }

    actor_id = data.get('userId') or data.get('processedBy') or data.get('processed_by')
    if actor_id:
        payload['updated_by'] = actor_id
        if not existing:
            payload['created_by'] = actor_id

    return payload


def normalize_inventory_item(record):
    expiration_na = bool(record.get('no_expiration'))
    current_stock = int(record.get('current_stock') or 0)
    critical_stock_level = int(record.get('critical_stock_level') or 10)
    derived_stock_status = record.get('stock_status')
    if not derived_stock_status:
        if current_stock == 0 or current_stock <= critical_stock_level:
            derived_stock_status = 'Critical Stock'
        elif current_stock <= (critical_stock_level + 10):
            derived_stock_status = 'Low Stock'
        elif current_stock >= 50:
            derived_stock_status = 'High Stock'
        else:
            derived_stock_status = 'Average Stock'

    return {
        'id': record.get('inventory_item_id'),
        'pk': record.get('inventory_item_id'),
        'inventory_item_id': record.get('inventory_item_id'),
        'branchId': record.get('branch_id'),
        'branch_id': record.get('branch_id'),
        'code': record.get('item_code') or '',
        'item': record.get('item_name') or '',
        'unit': record.get('unit') or 'Piece',
        'category': record.get('category') or '',
        'basePrice': float(record.get('base_price') or 0),
        'sellingPrice': float(record.get('selling_price') or 0),
        'stockCount': current_stock,
        'stockStatus': derived_stock_status,
        'expirationDate': format_inventory_expiration_date(record.get('expiration_date'), expiration_na),
        'expirationNA': expiration_na,
        'dateAdded': format_inventory_created_date(record.get('created_at')),
        'maxQuantity': record.get('max_quantity'),
        'useMaxQuantity': bool(record.get('use_max_quantity')),
        'criticalStockLevel': critical_stock_level,
        'isArchived': bool(record.get('is_archived')),
        'archivedDate': record.get('archived_at'),
        'archivedBy': record.get('archived_by'),
        'archiveReason': record.get('archive_reason') or '',
    }


def normalize_inventory_log(record):
    return {
        'id': record.get('id'),
        'date': record.get('date'),
        'time': record.get('time'),
        'productCode': record.get('productCode'),
        'productName': record.get('productName'),
        'unit': record.get('unit') or 'Piece',
        'type': record.get('type'),
        'quantity': int(record.get('quantity') or 0),
        'referenceNumber': record.get('referenceNumber'),
        'reason': record.get('reason'),
        'supplierOrIssuedTo': record.get('supplierOrIssuedTo'),
        'user': record.get('user'),
        'notes': record.get('notes') or '',
        'unitCost': float(record.get('unitCost') or 0),
        'totalCost': float(record.get('totalCost') or 0),
        'branchId': record.get('branch_id'),
        'inventoryItemId': record.get('inventory_item_id'),
    }


def build_employee_display_name(employee_id):
    if not employee_id:
        return "An admin"

    employee = get_single_row('employee_accounts', 'id', employee_id)
    if not employee:
        return "An admin"

    full_name = f"{employee.get('first_name', '')} {employee.get('last_name', '')}".strip()
    return full_name or employee.get('username') or employee.get('email') or "An admin"


def create_admin_notification(
    *,
    branch_id,
    event_type,
    title,
    message,
    severity='info',
    module='inventory',
    link=None,
    actor_id=None,
    entity_type=None,
    entity_id=None,
    event_key=None,
    metadata=None,
):
    if module not in ADMIN_NOTIFICATION_MODULES:
        raise ValueError(f"Unsupported notification module: {module}")
    if severity not in ADMIN_NOTIFICATION_SEVERITIES:
        raise ValueError(f"Unsupported notification severity: {severity}")

    payload = {
        'branch_id': branch_id,
        'module': module,
        'event_type': event_type,
        'severity': severity,
        'title': title.strip(),
        'message': message.strip(),
        'link': link.strip() if isinstance(link, str) and link.strip() else None,
        'actor_id': actor_id,
        'entity_type': entity_type,
        'entity_id': entity_id,
        'event_key': event_key.strip() if isinstance(event_key, str) and event_key.strip() else None,
        'metadata': metadata or {},
    }

    response = supabase_admin.table('admin_notifications').insert(payload).execute()
    created = response.data[0] if response.data else None
    if not created:
        raise ValueError('Failed to create admin notification')
    return created


def normalize_admin_notification(record, admin_user_id=None):
    read_at = record.get('read_at')
    metadata = record.get('metadata') or {}

    return {
        'id': record.get('notification_id'),
        'notificationId': record.get('notification_id'),
        'branchId': record.get('branch_id'),
        'module': record.get('module') or 'inventory',
        'eventType': record.get('event_type') or '',
        'type': record.get('severity') or 'info',
        'title': record.get('title') or '',
        'message': record.get('message') or '',
        'timestamp': record.get('created_at'),
        'read': bool(read_at),
        'readAt': read_at,
        'link': record.get('link') or None,
        'actorId': record.get('actor_id'),
        'entityType': record.get('entity_type'),
        'entityId': record.get('entity_id'),
        'eventKey': record.get('event_key'),
        'metadata': metadata,
        'adminUserId': admin_user_id,
    }


def create_inventory_admin_notification(
    *,
    branch_id,
    event_type,
    title,
    message,
    severity='info',
    link='/inventory',
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
        module='inventory',
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
    severity='info',
    link='/admin/schedule',
    metadata=None,
):
    email_context = get_reschedule_email_context(table_name, id_column, record_id)
    record = email_context.get("record") or {}
    branch_id = record.get("branch_id")
    if not branch_id:
        raise ValueError("Appointment notification requires branch_id")

    entity_type = 'walkin' if table_name == 'walkin_appointments' else 'appointment'
    patient_name = email_context.get("patient_name") or "Patient"
    pet_name = email_context.get("pet_name") or "your pet"
    service_name = email_context.get("service_name") or "Appointment"
    appointment_date = record.get("appointment_date") or ""
    appointment_time = format_display_time(record.get("appointment_time"))
    schedule_text = " ".join(part for part in [str(appointment_date).strip(), f"at {appointment_time}" if appointment_time else ""] if part).strip()
    message = f"{patient_name}'s appointment for {pet_name} ({service_name}) {action_text}."
    if schedule_text:
        message = f"{message} Schedule: {schedule_text}."

    return create_admin_notification(
        branch_id=branch_id,
        event_type=event_type,
        title=title,
        message=message,
        severity=severity,
        module='appointments',
        link=link,
        entity_type=entity_type,
        entity_id=record_id,
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


def get_default_admin_notification_branch_id():
    response = execute_with_retry(
        lambda: supabase_admin.table("branches").select("*").limit(1).execute(),
        context="Fetch default notification branch"
    )
    branch = (response.data or [{}])[0]
    return branch.get("branch_id") or branch.get("id")


def resolve_emr_notification_context(medical_record_id=None, visit_id=None):
    visit = None
    if visit_id not in (None, ""):
        visit = get_single_row("medical_record_visits", "medical_record_visit_id", visit_id)
        if visit and medical_record_id in (None, ""):
            medical_record_id = visit.get("medical_record_id")

    record = get_single_row("medical_records", "medical_record_id", medical_record_id) if medical_record_id not in (None, "") else None
    if not record:
        raise ValueError("Medical record not found for EMR notification")

    pet = get_single_row("pet_profile", "pet_id", record.get("pet_id")) if record.get("pet_id") not in (None, "") else None
    owner = get_single_row("patient_account", "id", pet.get("owner_id")) if pet and pet.get("owner_id") else None
    branch_id = None

    if not visit:
        visit_res = execute_with_retry(
            lambda: supabase_admin.table("medical_record_visits")
            .select("*")
            .eq("medical_record_id", medical_record_id)
            .order("visit_date", desc=True)
            .limit(1)
            .execute(),
            context="Fetch EMR latest visit for notification"
        )
        visit = (visit_res.data or [None])[0]

    if visit:
        source_type = str(visit.get("source_type") or "").strip().lower()
        source_id = visit.get("source_id")
        if source_type == "appointment" and source_id not in (None, ""):
            appointment = get_single_row("appointments", "appointment_id", source_id)
            branch_id = (appointment or {}).get("branch_id")
        elif source_type == "walkin" and source_id not in (None, ""):
            walkin = get_single_row("walkin_appointments", "walkin_id", source_id)
            branch_id = (walkin or {}).get("branch_id")

    if not branch_id:
        branch_id = get_default_admin_notification_branch_id()
    if not branch_id:
        raise ValueError("EMR notification requires a branch_id")

    pet_name = (pet or {}).get("pet_name") or "Unknown pet"
    owner_name = get_profile_display_name(owner) or "Unknown owner"

    return {
        "record": record,
        "visit": visit or {},
        "pet": pet or {},
        "owner": owner or {},
        "branchId": branch_id,
        "petName": pet_name,
        "ownerName": owner_name,
        "medicalRecordId": medical_record_id,
    }


def create_emr_admin_notification(
    *,
    medical_record_id=None,
    visit_id=None,
    event_type,
    title,
    action_text,
    severity='info',
    link='/patient-records',
    entity_type='medical_record',
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
        module='emr',
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


def create_billing_admin_notification(
    *,
    invoice_record,
    event_type,
    title,
    action_text,
    severity='info',
    link='/billing',
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
    payment_status = invoice.get("payment_status") or derive_billing_payment_state(total_amount, amount_paid)["payment_status"]
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
        module='billing',
        link=link,
        entity_type='billing_invoice',
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


def create_account_admin_notification(
    *,
    account_record,
    account_type,
    event_type,
    title,
    action_text,
    severity='info',
    link=None,
    actor_id=None,
    metadata=None,
):
    account = account_record or {}
    branch_id = account.get("branch_id") or get_default_admin_notification_branch_id()
    if not branch_id:
        raise ValueError("Account notification requires a branch_id")

    normalized_type = (account_type or "").strip().lower()
    is_employee = normalized_type == "employee"
    account_id = account.get("id") or account.get("account_id") or account.get("pk")
    role = account.get("role") or ("Employee" if is_employee else "Patient")
    status = account.get("status") or "active"
    display_name = get_profile_display_name(account) or account.get("fullname") or account.get("fullName") or account.get("email") or "Account"
    target_link = link or ("/admin/dashboard" if is_employee else "/admin/users")

    message = f"{display_name} ({role}) {action_text}. Status: {status}."

    return create_admin_notification(
        branch_id=branch_id,
        event_type=event_type,
        title=title,
        message=message,
        severity=severity,
        module='accounts',
        link=target_link,
        actor_id=actor_id,
        entity_type='employee_account' if is_employee else 'patient_account',
        entity_id=None,
        metadata={
            "accountId": account_id,
            "accountType": "employee" if is_employee else "patient",
            "displayName": display_name,
            "email": account.get("email"),
            "role": role,
            "status": status,
            **(metadata or {}),
        },
    )


def safe_create_account_admin_notification(**kwargs):
    try:
        return create_account_admin_notification(**kwargs)
    except Exception as notification_error:
        print("Account admin notification error:", str(notification_error))
        return None


def create_availability_admin_notification(
    *,
    event_type,
    title,
    message,
    severity='info',
    link='/admin/availability',
    actor_id=None,
    entity_type=None,
    entity_id=None,
    metadata=None,
):
    branch_id = get_default_admin_notification_branch_id()
    if not branch_id:
        raise ValueError("Availability notification requires a branch_id")

    return create_admin_notification(
        branch_id=branch_id,
        event_type=event_type,
        title=title,
        message=message,
        severity=severity,
        module='availability',
        link=link,
        actor_id=actor_id,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata=metadata or {},
    )


def safe_create_availability_admin_notification(**kwargs):
    try:
        return create_availability_admin_notification(**kwargs)
    except Exception as notification_error:
        print("Availability admin notification error:", str(notification_error))
        return None


def create_audit_admin_notification(
    *,
    event_type,
    title,
    message,
    severity='info',
    link='/admin/audit',
    actor_id=None,
    metadata=None,
):
    branch_id = get_default_admin_notification_branch_id()
    if not branch_id:
        raise ValueError("Audit notification requires a branch_id")

    return create_admin_notification(
        branch_id=branch_id,
        event_type=event_type,
        title=title,
        message=message,
        severity=severity,
        module='audit',
        link=link,
        actor_id=actor_id,
        entity_type='audit_log',
        entity_id=None,
        metadata=metadata or {},
    )


def safe_create_audit_admin_notification(**kwargs):
    try:
        return create_audit_admin_notification(**kwargs)
    except Exception as notification_error:
        print("Audit admin notification error:", str(notification_error))
        return None


def admin_notification_event_exists(event_key):
    if not event_key:
        return False

    response = supabase_admin.table('admin_notifications') \
        .select('notification_id') \
        .eq('event_key', event_key) \
        .limit(1) \
        .execute()
    return bool(response.data)


def get_employee_account_or_400(user_id):
    if not user_id:
        return None, "admin_user_id is required"

    employee = get_single_row('employee_accounts', 'id', user_id)
    if not employee:
        return None, "Employee account not found"

    return employee, None


def mark_admin_notification_read(notification_id, admin_user_id):
    supabase_admin.table('admin_notification_reads').upsert({
        'notification_id': notification_id,
        'admin_user_id': admin_user_id,
        'read_at': datetime.utcnow().isoformat(),
    }).execute()


def get_admin_notification_reads_map(admin_user_id, notification_ids):
    if not admin_user_id or not notification_ids:
        return {}

    response = execute_with_retry(
        lambda: supabase_admin.table('admin_notification_reads')
        .select('notification_id,read_at')
        .eq('admin_user_id', admin_user_id)
        .in_('notification_id', notification_ids)
        .execute(),
        context='Fetch admin notification reads'
    )

    reads_map = {}
    for row in (response.data or []):
        reads_map[row.get('notification_id')] = row.get('read_at')
    return reads_map


def summarize_inventory_transaction_items(items, max_names=3):
    cleaned_names = [
        str(item.get('item_name') or item.get('productName') or '').strip()
        for item in (items or [])
        if str(item.get('item_name') or item.get('productName') or '').strip()
    ]
    if not cleaned_names:
        return 'inventory items'

    preview = cleaned_names[:max_names]
    if len(cleaned_names) <= max_names:
        return ', '.join(preview)
    return f"{', '.join(preview)} and {len(cleaned_names) - max_names} more"


def parse_iso_date(value):
    if not value:
        return None

    raw = str(value).strip()
    if not raw:
        return None

    for fmt in ('%Y-%m-%d', '%m/%d/%Y'):
        try:
            return datetime.strptime(raw[:10] if fmt == '%Y-%m-%d' else raw, fmt).date()
        except ValueError:
            continue

    return None


def coerce_expiry_windows(raw_windows=None):
    if raw_windows in (None, '', []):
        return [30, 7, 1]

    if isinstance(raw_windows, str):
        pieces = [piece.strip() for piece in raw_windows.split(',')]
        windows = [coerce_int(piece, 'expiryWindow', minimum=0, maximum=365) for piece in pieces if piece]
    elif isinstance(raw_windows, list):
        windows = [coerce_int(piece, 'expiryWindow', minimum=0, maximum=365) for piece in raw_windows]
    else:
        raise ValueError('expiry windows must be a comma-separated string or array')

    unique_windows = sorted(set(windows), reverse=True)
    if not unique_windows:
        raise ValueError('At least one expiry window is required')
    return unique_windows


def notify_inventory_item_created(item, actor_id=None):
    actor_name = build_employee_display_name(actor_id)
    item_name = item.get('item_name') or 'Unknown item'
    item_code = item.get('item_code') or ''
    branch_id = item.get('branch_id')
    item_id = item.get('inventory_item_id')

    return safe_create_inventory_admin_notification(
        branch_id=branch_id,
        event_type='inventory_item_created',
        title='Product added to inventory',
        message=f"{actor_name} added {item_name} ({item_code}) to inventory.",
        severity='success',
        link='/inventory',
        actor_id=actor_id,
        entity_type='inventory_item',
        entity_id=item_id,
        metadata={
            'itemCode': item_code,
            'itemName': item_name,
            'category': item.get('category'),
        },
    )


def notify_inventory_item_updated(before_item, after_item, actor_id=None):
    actor_name = build_employee_display_name(actor_id)
    item_name = after_item.get('item_name') or before_item.get('item_name') or 'Unknown item'
    item_code = after_item.get('item_code') or before_item.get('item_code') or ''
    branch_id = after_item.get('branch_id') or before_item.get('branch_id')
    item_id = after_item.get('inventory_item_id') or before_item.get('inventory_item_id')

    changed_fields = []
    field_labels = {
        'item_name': 'name',
        'category': 'category',
        'base_price': 'base price',
        'selling_price': 'selling price',
        'current_stock': 'stock',
        'critical_stock_level': 'critical level',
        'expiration_date': 'expiration',
        'no_expiration': 'no expiration',
        'max_quantity': 'max quantity',
        'use_max_quantity': 'use max quantity',
    }
    for field_name, label in field_labels.items():
        if before_item.get(field_name) != after_item.get(field_name):
            changed_fields.append(label)

    changes_text = ', '.join(changed_fields[:4]) if changed_fields else 'product details'
    if len(changed_fields) > 4:
        changes_text += f" and {len(changed_fields) - 4} more"

    return safe_create_inventory_admin_notification(
        branch_id=branch_id,
        event_type='inventory_item_updated',
        title='Inventory product updated',
        message=f"{actor_name} updated {item_name} ({item_code}): {changes_text}.",
        severity='info',
        link='/inventory',
        actor_id=actor_id,
        entity_type='inventory_item',
        entity_id=item_id,
        metadata={
            'itemCode': item_code,
            'itemName': item_name,
            'changedFields': changed_fields,
        },
    )


def notify_inventory_item_archived(item, actor_id=None, reason=None):
    actor_name = build_employee_display_name(actor_id)
    item_name = item.get('item_name') or 'Unknown item'
    item_code = item.get('item_code') or ''

    message = f"{actor_name} archived {item_name} ({item_code})."
    if reason:
        message += f" Reason: {reason}."

    return safe_create_inventory_admin_notification(
        branch_id=item.get('branch_id'),
        event_type='inventory_item_archived',
        title='Inventory product archived',
        message=message,
        severity='warning',
        link='/inventory-archive',
        actor_id=actor_id,
        entity_type='inventory_item',
        entity_id=item.get('inventory_item_id'),
        metadata={
            'itemCode': item_code,
            'itemName': item_name,
            'reason': reason,
        },
    )


def notify_inventory_item_restored(item, actor_id=None):
    actor_name = build_employee_display_name(actor_id)
    item_name = item.get('item_name') or 'Unknown item'
    item_code = item.get('item_code') or ''

    return safe_create_inventory_admin_notification(
        branch_id=item.get('branch_id'),
        event_type='inventory_item_restored',
        title='Archived inventory product restored',
        message=f"{actor_name} restored {item_name} ({item_code}) to active inventory.",
        severity='success',
        link='/inventory-archive',
        actor_id=actor_id,
        entity_type='inventory_item',
        entity_id=item.get('inventory_item_id'),
        metadata={
            'itemCode': item_code,
            'itemName': item_name,
        },
    )


def notify_inventory_transaction_created(result, payload):
    transaction = result.get('transaction') or {}
    items = result.get('items') or []
    actor_id = payload.get('processed_by')
    actor_name = build_employee_display_name(actor_id)
    transaction_type = payload.get('transaction_type')
    transaction_id = transaction.get('inventory_transaction_id')
    reference_number = transaction.get('reference_number') or payload.get('reference_number')
    item_count = len(items)
    item_summary = summarize_inventory_transaction_items(items)
    action_label = 'stock in' if transaction_type == 'IN' else 'stock out'
    title = 'Inventory stock received' if transaction_type == 'IN' else 'Inventory stock released'
    severity = 'success' if transaction_type == 'IN' else 'warning'
    counterparty = payload.get('counterparty_name')
    reason = payload.get('reason')

    message = f"{actor_name} recorded {action_label} for {item_count} item(s): {item_summary}. Reference: {reference_number}."
    if counterparty:
        message += f" Counterparty: {counterparty}."
    if reason:
        message += f" Reason: {reason}."

    return safe_create_inventory_admin_notification(
        branch_id=payload.get('branch_id'),
        event_type='inventory_stock_in' if transaction_type == 'IN' else 'inventory_stock_out',
        title=title,
        message=message,
        severity=severity,
        link='/inventory-logs',
        actor_id=actor_id,
        entity_type='inventory_transaction',
        entity_id=transaction_id,
        metadata={
            'referenceNumber': reference_number,
            'transactionType': transaction_type,
            'itemCount': item_count,
            'items': [
                {
                    'inventoryItemId': item.get('inventory_item_id'),
                    'itemCode': item.get('item_code'),
                    'itemName': item.get('item_name'),
                    'quantity': item.get('quantity'),
                    'previousStock': item.get('previous_stock'),
                    'newStock': item.get('new_stock'),
                }
                for item in items
            ],
        },
    )


def get_inventory_alert_state(item):
    if item is None:
        return 'none'

    raw_stock = item.get('current_stock')
    if raw_stock is None and 'new_stock' in item:
        raw_stock = item.get('new_stock')
    if raw_stock is None:
        return 'none'

    current_stock = int(raw_stock)
    critical_stock_level = int(item.get('critical_stock_level') or 10)

    if current_stock <= 0:
        return 'out_of_stock'
    if current_stock <= critical_stock_level + 10:
        return 'low_stock'
    return 'normal'


def notify_inventory_stock_state_transition(before_item, after_item, actor_id=None, source_event=None):
    before_state = get_inventory_alert_state(before_item or {})
    after_state = get_inventory_alert_state(after_item or {})

    if after_state == 'normal' or before_state == after_state:
        return None

    item_name = after_item.get('item_name') or before_item.get('item_name') or 'Unknown item'
    item_code = after_item.get('item_code') or before_item.get('item_code') or ''
    branch_id = after_item.get('branch_id') or before_item.get('branch_id')
    item_id = after_item.get('inventory_item_id') or before_item.get('inventory_item_id')
    actor_name = build_employee_display_name(actor_id)
    current_stock = int(after_item.get('current_stock') or after_item.get('new_stock') or 0)
    critical_stock_level = int(after_item.get('critical_stock_level') or before_item.get('critical_stock_level') or 10)

    if after_state == 'out_of_stock':
        return safe_create_inventory_admin_notification(
            branch_id=branch_id,
            event_type='inventory_out_of_stock',
            title='Product is out of stock',
            message=f"{item_name} ({item_code}) is now out of stock after an inventory action by {actor_name}.",
            severity='error',
            link='/inventory',
            actor_id=actor_id,
            entity_type='inventory_item',
            entity_id=item_id,
            event_key=f"inventory:out-of-stock:branch:{branch_id}:item:{item_id}:at:{current_stock}",
            metadata={
                'itemCode': item_code,
                'itemName': item_name,
                'currentStock': current_stock,
                'criticalStockLevel': critical_stock_level,
                'sourceEvent': source_event,
            },
        )

    return safe_create_inventory_admin_notification(
        branch_id=branch_id,
        event_type='inventory_low_stock',
        title='Product is running low',
        message=f"{item_name} ({item_code}) is low on stock with {current_stock} unit(s) left after an inventory action by {actor_name}.",
        severity='warning',
        link='/inventory',
        actor_id=actor_id,
        entity_type='inventory_item',
        entity_id=item_id,
        event_key=f"inventory:low-stock:branch:{branch_id}:item:{item_id}:at:{current_stock}",
        metadata={
            'itemCode': item_code,
            'itemName': item_name,
            'currentStock': current_stock,
            'criticalStockLevel': critical_stock_level,
            'sourceEvent': source_event,
        },
    )


def notify_inventory_item_expiring_soon(item, days_until_expiry):
    branch_id = item.get('branch_id')
    item_id = item.get('inventory_item_id')
    item_name = item.get('item_name') or 'Unknown item'
    item_code = item.get('item_code') or ''
    expiration_date = parse_iso_date(item.get('expiration_date'))
    if not expiration_date:
        return None

    event_key = f"inventory:expiring-soon:branch:{branch_id}:item:{item_id}:days:{days_until_expiry}"
    if admin_notification_event_exists(event_key):
        return None

    day_label = 'today' if days_until_expiry == 0 else f"in {days_until_expiry} day(s)"
    return safe_create_inventory_admin_notification(
        branch_id=branch_id,
        event_type='inventory_expiring_soon',
        title='Product expiring soon',
        message=f"{item_name} ({item_code}) will expire {day_label} on {expiration_date.isoformat()}.",
        severity='warning',
        link='/inventory',
        actor_id=None,
        entity_type='inventory_item',
        entity_id=item_id,
        event_key=event_key,
        metadata={
            'itemCode': item_code,
            'itemName': item_name,
            'expirationDate': expiration_date.isoformat(),
            'daysUntilExpiry': days_until_expiry,
            'currentStock': int(item.get('current_stock') or 0),
            'criticalStockLevel': int(item.get('critical_stock_level') or 10),
        },
    )


def reconcile_inventory_expiring_notifications(branch_id=None, expiry_windows=None, today=None):
    windows = coerce_expiry_windows(expiry_windows)
    today_date = today or date.today()

    query = supabase_admin.table('inventory_items').select('*') \
        .eq('is_archived', False) \
        .eq('no_expiration', False)

    if branch_id is not None:
        query = query.eq('branch_id', branch_id)

    response = query.execute()
    rows = response.data or []

    created_notifications = []

    for item in rows:
        expiration_date = parse_iso_date(item.get('expiration_date'))
        if not expiration_date:
            continue

        days_until_expiry = (expiration_date - today_date).days
        if days_until_expiry < 0:
            continue
        if days_until_expiry not in windows:
            continue

        created = notify_inventory_item_expiring_soon(item, days_until_expiry)
        if created:
            created_notifications.append(created)

    return {
        'createdCount': len(created_notifications),
        'createdNotifications': created_notifications,
        'windows': windows,
        'branchId': branch_id,
        'asOfDate': today_date.isoformat(),
    }


def get_inventory_item_or_404(item_id):
    item = get_single_row('inventory_items', 'inventory_item_id', item_id)
    if not item:
        return None, (jsonify({'error': 'Inventory item not found'}), 404)
    return item, None


def build_inventory_transaction_payload(data, transaction_type):
    branch_id = coerce_int(data.get('branch_id', data.get('branchId')), 'branch_id', minimum=1)
    processed_by = data.get('processed_by') or data.get('processedBy') or data.get('userId')
    reference_number = (data.get('reference_number') or data.get('referenceNumber') or '').strip()
    if not reference_number or inventory_transaction_reference_exists(branch_id, reference_number):
        reference_number = generate_inventory_transaction_reference(branch_id, transaction_type)

    reason_default = 'Stock Replenishment' if transaction_type == 'IN' else 'Sale'
    reason = (data.get('reason') or reason_default).strip()
    notes = (data.get('notes') or '').strip() or None
    counterparty_name = (data.get('counterparty_name') or data.get('counterpartyName') or data.get('supplier') or data.get('issuedTo') or data.get('supplierOrIssuedTo') or '').strip() or None

    raw_items = data.get('items') or []
    if not isinstance(raw_items, list) or not raw_items:
        raise ValueError('items must contain at least one entry')

    prepared_items = []
    total_amount = 0.0

    for raw_item in raw_items:
        item_id = raw_item.get('inventory_item_id') or raw_item.get('inventoryItemId') or raw_item.get('productId') or raw_item.get('id')
        inventory_item = get_single_row('inventory_items', 'inventory_item_id', item_id)
        if not inventory_item:
            raise ValueError(f'Inventory item {item_id} was not found')
        if inventory_item.get('branch_id') != branch_id:
            raise ValueError(f'Inventory item {item_id} does not belong to branch {branch_id}')
        if inventory_item.get('is_archived'):
            raise ValueError(f"Inventory item {inventory_item.get('item_name')} is archived")

        quantity = coerce_int(raw_item.get('quantity'), 'quantity', minimum=1, maximum=999999)
        current_stock = int(inventory_item.get('current_stock') or 0)
        max_quantity = inventory_item.get('max_quantity')

        if transaction_type == 'IN':
            unit_cost = coerce_number(raw_item.get('unitCost', raw_item.get('unit_cost', inventory_item.get('base_price'))), 'unitCost', minimum=0, maximum=999999)
            if inventory_item.get('use_max_quantity') and max_quantity is not None and current_stock + quantity > int(max_quantity):
                raise ValueError(f"{inventory_item.get('item_name')} would exceed its max quantity")
            new_stock = current_stock + quantity
            line_total = quantity * unit_cost
            prepared_items.append({
                'inventory_item_id': inventory_item.get('inventory_item_id'),
                'branch_id': inventory_item.get('branch_id'),
                'item_code': inventory_item.get('item_code'),
                'item_name': inventory_item.get('item_name'),
                'quantity': quantity,
                'unit_cost': unit_cost,
                'unit_price': None,
                'previous_stock': current_stock,
                'new_stock': new_stock,
                'critical_stock_level': inventory_item.get('critical_stock_level'),
            })
        else:
            unit_price = coerce_number(raw_item.get('unitPrice', raw_item.get('unit_price', inventory_item.get('selling_price'))), 'unitPrice', minimum=0, maximum=999999)
            if quantity > current_stock:
                raise ValueError(f"{inventory_item.get('item_name')} only has {current_stock} units available")
            new_stock = current_stock - quantity
            line_total = quantity * unit_price
            prepared_items.append({
                'inventory_item_id': inventory_item.get('inventory_item_id'),
                'branch_id': inventory_item.get('branch_id'),
                'item_code': inventory_item.get('item_code'),
                'item_name': inventory_item.get('item_name'),
                'quantity': quantity,
                'unit_cost': None,
                'unit_price': unit_price,
                'previous_stock': current_stock,
                'new_stock': new_stock,
                'critical_stock_level': inventory_item.get('critical_stock_level'),
            })

        total_amount += line_total

    return {
        'branch_id': branch_id,
        'transaction_type': transaction_type,
        'reference_number': reference_number,
        'reason': reason,
        'counterparty_name': counterparty_name,
        'notes': notes,
        'processed_by': processed_by,
        'items': prepared_items,
        'total_amount': round(total_amount, 2),
    }


def persist_inventory_transaction(payload):
    header_response = supabase_admin.table('inventory_transactions').insert({
        'branch_id': payload['branch_id'],
        'transaction_type': payload['transaction_type'],
        'reference_number': payload['reference_number'],
        'reason': payload['reason'],
        'counterparty_name': payload['counterparty_name'],
        'notes': payload['notes'],
        'processed_by': payload['processed_by'],
        'total_amount': payload['total_amount'],
    }).execute()

    transaction = header_response.data[0] if header_response.data else None
    if not transaction:
        raise ValueError('Failed to create inventory transaction')

    transaction_id = transaction.get('inventory_transaction_id')
    line_rows = []

    for item in payload['items']:
        line_rows.append({
            'inventory_transaction_id': transaction_id,
            'inventory_item_id': item['inventory_item_id'],
            'quantity': item['quantity'],
            'unit_cost': item['unit_cost'],
            'unit_price': item['unit_price'],
        })

        supabase_admin.table('inventory_items') \
            .update({
                'current_stock': item['new_stock'],
                'updated_by': payload['processed_by'],
            }) \
            .eq('inventory_item_id', item['inventory_item_id']) \
            .execute()

    line_response = supabase_admin.table('inventory_transaction_items').insert(line_rows).execute()

    return {
        'transaction': transaction,
        'lineItems': line_response.data or [],
        'items': payload['items'],
    }


def normalize_employee_setup_token(record):
    return {
        'setup_token_id': record.get('setup_token_id'),
        'employee_id': record.get('employee_id'),
        'email': record.get('email'),
        'expires_at': record.get('expires_at'),
        'used_at': record.get('used_at'),
        'created_at': record.get('created_at'),
        'created_by': record.get('created_by'),
    }


def generate_employee_setup_token():
    return secrets.token_urlsafe(32)


def hash_employee_setup_token(token):
    return hashlib.sha256((token or '').encode('utf-8')).hexdigest()


def build_employee_setup_link(token):
    separator = '&' if '?' in EMPLOYEE_SETUP_URL_BASE else '?'
    return f"{EMPLOYEE_SETUP_URL_BASE}{separator}token={token}"


def get_employee_setup_token_record(raw_token):
    token_hash = hash_employee_setup_token(raw_token)
    response = supabase_admin.table('employee_setup_tokens') \
        .select('*') \
        .eq('token_hash', token_hash) \
        .execute()

    rows = response.data or []
    if len(rows) > 1:
        raise ValueError('Multiple employee setup tokens found for the same token hash')
    return rows[0] if rows else None


def validate_employee_setup_token(raw_token):
    if not raw_token:
        raise ValueError('token is required')

    token_record = get_employee_setup_token_record(raw_token)
    if not token_record:
        raise ValueError('Invalid or unknown setup token')
    if token_record.get('used_at'):
        raise ValueError('This setup link has already been used')

    expires_at_raw = token_record.get('expires_at')
    if not expires_at_raw:
        raise ValueError('This setup link is invalid')

    expires_at = datetime.fromisoformat(str(expires_at_raw).replace('Z', '+00:00'))
    if datetime.utcnow().replace(tzinfo=expires_at.tzinfo) > expires_at:
        raise ValueError('This setup link has expired')

    employee = get_single_row('employee_accounts', 'id', token_record.get('employee_id'))
    if not employee:
        raise ValueError('Employee account linked to this setup token was not found')

    return token_record, employee


def invalidate_previous_employee_setup_tokens(employee_id):
    existing = supabase_admin.table('employee_setup_tokens') \
        .select('setup_token_id') \
        .eq('employee_id', employee_id) \
        .is_('used_at', 'null') \
        .execute()

    token_ids = [row.get('setup_token_id') for row in (existing.data or []) if row.get('setup_token_id')]
    if token_ids:
        supabase_admin.table('employee_setup_tokens') \
            .update({'used_at': datetime.utcnow().isoformat()}) \
            .in_('setup_token_id', token_ids) \
            .execute()


def issue_employee_setup_token(employee_id, email, created_by=None, expires_in_hours=24):
    invalidate_previous_employee_setup_tokens(employee_id)
    raw_token = generate_employee_setup_token()
    expires_at = datetime.utcnow() + timedelta(hours=expires_in_hours)

    response = supabase_admin.table('employee_setup_tokens').insert({
        'employee_id': employee_id,
        'email': email,
        'token_hash': hash_employee_setup_token(raw_token),
        'expires_at': expires_at.isoformat(),
        'created_by': created_by,
    }).execute()

    created = response.data[0] if response.data else None
    if not created:
        raise ValueError('Failed to create employee setup token')

    return raw_token, created


def send_employee_setup_email(to_email, employee_name, setup_link):
    safe_name = employee_name or 'there'
    html = f"""
        <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
            <h2>Set Up Your PawRang Employee Account</h2>
            <p>Hello {safe_name},</p>
            <p>Your employee account has been created. Please click the button below to set your username and password.</p>
            <p style="margin: 24px 0;">
                <a href="{setup_link}" style="background:#3d67ee;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
                    Set Up My Account
                </a>
            </p>
            <p>If the button does not work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all;">{setup_link}</p>
            <p>This link will expire in 24 hours and can only be used once.</p>
            <p>Thank you,<br/>PawRang Veterinary Clinic</p>
        </div>
    """
    return send_html_email(to_email, 'Set Up Your PawRang Employee Account', html)


def is_username_taken(username, exclude_employee_id=None):
    username = (username or '').strip()
    if not username:
        return False

    employee_match = supabase_admin.table('employee_accounts') \
        .select('id') \
        .eq('username', username) \
        .execute()
    for row in (employee_match.data or []):
        if str(row.get('id')) != str(exclude_employee_id):
            return True

    patient_match = supabase_admin.table('patient_account') \
        .select('id') \
        .eq('username', username) \
        .execute()
    return bool(patient_match.data)


# -----------------------------------------------
# HELPER — send OTP email via Gmail SMTP
# -----------------------------------------------
def send_otp_email(to_email, otp, subject='Your OTP Code', purpose='verification', expires_minutes=10):
    html = f"""
        <h2>OTP Verification</h2>
        <p>Your OTP for <strong>{purpose}</strong> is:</p>
        <p><strong style="font-size:32px; letter-spacing:8px">{otp}</strong></p>
        <p>This OTP expires in {expires_minutes} minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
    """
    return send_html_email(to_email, subject, html)


# -----------------------------------------------
# SIGNUP
# -----------------------------------------------
@app.route('/signup', methods=['POST'])
def signup():
    data           = request.get_json()
    email          = data.get('email')
    password       = data.get('password')
    firstName      = data.get('firstName')
    lastName       = data.get('lastName')
    contact_number = data.get('contactNumber')
    username       = data.get('username')

    try:
        existing_email = supabase_admin.table('patient_account') \
            .select('id').eq('email', email).execute()

        if existing_email.data:
            profile_id = existing_email.data[0]['id']
            auth_user  = supabase_admin.auth.admin.get_user_by_id(profile_id)

            if auth_user.user and not auth_user.user.email_confirmed_at:
                existing_otp = otp_store.get(email)
                if existing_otp and 'sent_at' in existing_otp:
                    elapsed = (datetime.utcnow() - existing_otp['sent_at']).total_seconds()
                    if elapsed < RESEND_COOLDOWN_SECONDS:
                        wait = int(RESEND_COOLDOWN_SECONDS - elapsed)
                        return jsonify({"error": f"Please wait {wait} second(s) before requesting a new OTP.", "redirect": "confirmOTP"}), 429

                fresh_otp  = ''.join(random.choices(string.digits, k=6))
                expires_at = datetime.utcnow() + timedelta(minutes=10)
                otp_store[email] = {"otp": fresh_otp, "expires_at": expires_at, "verified": False, "mode": "emailConfirmation", "sent_at": datetime.utcnow()}
                try:
                    send_otp_email(email, fresh_otp, subject='Confirm Your Email', purpose='email confirmation')
                except Exception as mail_err:
                    print("OTP resend error on re-registration:", str(mail_err))

                return jsonify({"error": "This email is registered but not yet confirmed. A new OTP has been sent.", "redirect": "confirmOTP"}), 403

            return jsonify({"error": "An account with this email already exists."}), 400

        existing_username = supabase_admin.table('patient_account') \
            .select('id').eq('username', username).execute()

        if existing_username.data:
            return jsonify({"error": "This username is already taken."}), 400

        auth_response = supabase.auth.sign_up({"email": email, "password": password})
        user = auth_response.user
        if not user:
            return jsonify({"error": "Signup failed"}), 400

        insert_response = supabase_admin.table('patient_account').insert({
            "id":             user.id,
            "email":          email,
            "firstName":      firstName,
            "lastName":       lastName,
            "username":       username,
            "contact_number": contact_number,
            "role":           "patient",
            "status":         "active"
        }).execute()

        if not insert_response.data:
            return jsonify({"error": "Profile insert failed"}), 400

        otp        = ''.join(random.choices(string.digits, k=6))
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        otp_store[email] = {"otp": otp, "expires_at": expires_at, "verified": False, "mode": "emailConfirmation", "sent_at": datetime.utcnow()}
        send_otp_email(email, otp, subject='Confirm Your Email', purpose='email confirmation')

        return jsonify({
            "message": "Signup successful! An OTP has been sent to your email.",
            "user": {
                "id":        user.id,
                "email":     user.email,
                "username":  username,
                "firstName": firstName,
                "lastName":  lastName,
            }
        }), 200

    except Exception as e:
        print("Signup error:", str(e))
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# LOGIN
# -----------------------------------------------
@app.route('/login', methods=['POST'])
def login():
    data       = request.get_json()
    identifier = (data.get('identifier') or '').strip()
    password   = data.get('password')
    profile = None

    if not identifier or not password:
        return jsonify({"error": "Email or username, and password are required."}), 400

    try:
        profile, source_table = find_account_by_identifier(identifier)
        if not profile:
            return jsonify({"error": "No account found for that email or username."}), 401

        lockout_response = build_lockout_response(read_login_security_state(profile, identifier))
        if lockout_response:
            return jsonify(lockout_response), 423

        email = profile.get('email')

        auth_response = supabase.auth.sign_in_with_password({"email": email, "password": password})
        user = auth_response.user
        if not user:
            failure_response, status_code = record_failed_login_attempt(profile, identifier)
            return jsonify(failure_response), status_code

        clear_login_security_state(profile, identifier)

        if not user.email_confirmed_at:
            fresh_otp  = ''.join(random.choices(string.digits, k=6))
            expires_at = datetime.utcnow() + timedelta(minutes=10)
            otp_store[email] = {"otp": fresh_otp, "expires_at": expires_at, "verified": False, "mode": "emailConfirmation", "sent_at": datetime.utcnow()}
            try:
                send_otp_email(email, fresh_otp, subject='Confirm Your Email', purpose='email confirmation')
            except Exception as mail_err:
                print("OTP resend error during login:", str(mail_err))

            return jsonify({
                "error": "Please confirm your email before logging in. A new code has been sent to your inbox.",
                "email": email
            }), 403

        fresh_profile, fresh_source_table = find_account_by_user_id(user.id)
        if not fresh_profile:
            return jsonify({"error": "Authenticated user profile was not found."}), 404

        if fresh_source_table == 'employee_accounts' and fresh_profile.get('is_initial_login'):
            return jsonify({
                "error": "Please finish setting up your employee account using the link sent to your email before logging in."
            }), 403

        return jsonify({
            "message":      "Login successful!",
            "access_token": auth_response.session.access_token,
            "user": normalize_profile(fresh_profile, fresh_source_table)
        }), 200

    except Exception as e:
        print("Login error:", str(e))
        lowered = str(e).lower()
        if "invalid login credentials" in lowered or "invalid_credentials" in lowered:
            failure_response, status_code = record_failed_login_attempt(profile, identifier)
            return jsonify(failure_response), status_code
        return jsonify({"error": "Invalid credentials. Please try again."}), 401


# -----------------------------------------------
# GET USER PROFILE
# -----------------------------------------------
@app.route('/profile/<user_id>', methods=['GET'])
def get_profile(user_id):
    try:
        profile, _ = find_account_by_user_id(user_id)
        if not profile:
            return jsonify({"error": "User not found"}), 404

        normalized = normalize_public_profile(profile)
        return jsonify({**normalized, "user": normalized}), 200

    except Exception as e:
        print("Get profile error:", str(e))
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# UPDATE USER PROFILE
# -----------------------------------------------
@app.route('/profile/<user_id>', methods=['PATCH'])
def update_profile(user_id):
    data = request.get_json() or {}

    try:
        profile = get_single_row('patient_account', 'id', user_id)
        table_name = 'patient_account'

        if not profile:
            profile = get_single_row('employee_accounts', 'id', user_id)
            table_name = 'employee_accounts'

        if not profile:
            return jsonify({"error": "Profile not found"}), 404

        username = (data.get('username') or profile.get('username') or '').strip()
        existing_first_name = (profile.get('firstName') or profile.get('first_name') or '').strip()
        existing_last_name = (profile.get('lastName') or profile.get('last_name') or '').strip()

        first_name_key_present = 'firstName' in data or 'first_name' in data
        last_name_key_present = 'lastName' in data or 'last_name' in data
        full_name_key_present = any(key in data for key in ('fullName', 'fullname', 'full_name'))

        provided_first_name = (
            data.get('firstName')
            if 'firstName' in data else
            data.get('first_name')
            if 'first_name' in data else
            None
        )
        provided_last_name = (
            data.get('lastName')
            if 'lastName' in data else
            data.get('last_name')
            if 'last_name' in data else
            None
        )
        provided_full_name = (
            data.get('fullName')
            if 'fullName' in data else
            data.get('fullname')
            if 'fullname' in data else
            data.get('full_name')
            if 'full_name' in data else
            None
        )

        first_name = (
            provided_first_name.strip()
            if isinstance(provided_first_name, str) else
            existing_first_name
        )
        last_name = (
            provided_last_name.strip()
            if isinstance(provided_last_name, str) else
            existing_last_name
        )

        full_name = (
            (provided_full_name or '').strip()
            if isinstance(provided_full_name, str) else
            f"{first_name} {last_name}".strip()
        ) or profile.get('full_name') or profile.get('fullname') or get_profile_display_name(profile)
        contact_number = (
            data.get('contactNumber')
            if 'contactNumber' in data else
            data.get('contact_number')
            if 'contact_number' in data else
            data.get('contactnumber')
        )
        user_image = (
            data.get('userImage')
            if 'userImage' in data else
            data.get('userimage')
            if 'userimage' in data else
            data.get('user_image')
            if 'user_image' in data else
            data.get('profileImage')
        )

        base_update = {}
        if 'username' in data:
            base_update['username'] = username
        if any(key in data for key in ('contactNumber', 'contact_number', 'contactnumber')):
            base_update['contact_number'] = (contact_number or '').strip()

        has_name_update = any(key in data for key in ('firstName', 'first_name', 'lastName', 'last_name', 'fullName', 'fullname', 'full_name'))
        has_image_update = any(key in data for key in ('userImage', 'userimage', 'user_image', 'profileImage'))

        if not base_update and not has_name_update and not has_image_update:
            return jsonify({"error": "No valid profile fields to update"}), 400

        if first_name_key_present or last_name_key_present:
            split_first_name = first_name
            split_last_name = last_name
        else:
            split_first_name, split_last_name = split_full_name(full_name)
        name_variants = [{}]
        if has_name_update:
            if table_name == 'patient_account':
                name_variants = [
                    {"firstName": split_first_name, "lastName": split_last_name},
                    {"full_name": full_name, "firstName": split_first_name, "lastName": split_last_name},
                    {"fullname": full_name, "firstName": split_first_name, "lastName": split_last_name},
                    {"full_name": full_name},
                    {"fullname": full_name},
                ]
            else:
                name_variants = [
                    {"first_name": split_first_name, "last_name": split_last_name},
                    {"full_name": full_name, "first_name": split_first_name, "last_name": split_last_name},
                    {"fullname": full_name, "first_name": split_first_name, "last_name": split_last_name},
                    {"full_name": full_name},
                    {"fullname": full_name},
                ]

        image_variants = [{}]
        if has_image_update:
            if table_name == 'patient_account':
                image_variants = [{"userImage": user_image}, {"userimage": user_image}, {"user_image": user_image}, {}]
            else:
                image_variants = [{"employee_image": user_image}, {"userImage": user_image}, {}]

        response = None
        last_error = None
        attempted_payloads = set()

        for name_variant in name_variants:
            for image_variant in image_variants:
                update_payload = {**base_update, **name_variant, **image_variant}
                if not update_payload:
                    continue

                payload_signature = tuple(sorted(update_payload.keys()))
                if payload_signature in attempted_payloads:
                    continue
                attempted_payloads.add(payload_signature)

                try:
                    response = supabase_admin.table(table_name).update(update_payload).eq('id', user_id).execute()
                    last_error = None
                    break
                except Exception as update_error:
                    last_error = update_error
                    print("Profile update fallback attempt failed:", update_error)
            if response is not None:
                break

        if response is None:
            raise last_error if last_error else Exception("Unable to update profile")

        updated_profile = response.data[0] if response.data else get_single_row(table_name, 'id', user_id)
        normalized = normalize_public_profile(updated_profile or profile)
        return jsonify({"message": "Profile updated successfully", **normalized, "user": normalized}), 200

    except Exception as e:
        print("Update profile error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/profile/<user_id>/change-email/request-otp', methods=['POST'])
def request_profile_email_change_otp(user_id):
    data = request.get_json() or {}
    new_email = normalize_email_address(
        data.get('newEmail') or data.get('new_email') or data.get('email')
    )

    if not new_email:
        return jsonify({"error": "New email is required"}), 400
    if not is_valid_email_address(new_email):
        return jsonify({"error": "Please enter a valid email address"}), 400

    try:
        profile, _ = find_account_by_user_id(user_id)
        if not profile:
            return jsonify({"error": "Profile not found"}), 404

        current_email = normalize_email_address(profile.get('email'))
        if new_email == current_email:
            return jsonify({"error": "New email must be different from your current email"}), 400

        existing_account = find_account_by_email(new_email)
        if existing_account and str(existing_account.get('user_id')) != str(user_id):
            return jsonify({"error": "This email is already in use by another account"}), 400

        otp_key = build_email_change_otp_key(user_id, new_email)
        existing_otp = otp_store.get(otp_key)
        if existing_otp and existing_otp.get('sent_at'):
            elapsed = (datetime.utcnow() - existing_otp['sent_at']).total_seconds()
            if elapsed < RESEND_COOLDOWN_SECONDS:
                wait = max(int(RESEND_COOLDOWN_SECONDS - elapsed), 1)
                return jsonify({
                    "error": f"Please wait {wait} second(s) before requesting a new OTP.",
                    "resendCooldownSeconds": wait,
                }), 429

        otp = ''.join(random.choices(string.digits, k=6))
        expires_at = datetime.utcnow() + timedelta(seconds=EMAIL_CHANGE_OTP_EXPIRY_SECONDS)
        otp_store[otp_key] = {
            "otp": otp,
            "expires_at": expires_at,
            "verified": False,
            "mode": "emailChange",
            "user_id": user_id,
            "new_email": new_email,
            "sent_at": datetime.utcnow(),
        }

        send_otp_email(
            new_email,
            otp,
            subject='Verify Your New Email',
            purpose='email change',
            expires_minutes=max(EMAIL_CHANGE_OTP_EXPIRY_SECONDS // 60, 1),
        )

        return jsonify({
            "message": "OTP sent successfully.",
            "otpSent": True,
            "expiresInSeconds": EMAIL_CHANGE_OTP_EXPIRY_SECONDS,
            "resendCooldownSeconds": RESEND_COOLDOWN_SECONDS,
        }), 200

    except Exception as e:
        print("Request email change OTP error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/profile/<user_id>/change-email/verify', methods=['POST'])
def verify_profile_email_change(user_id):
    data = request.get_json() or {}
    new_email = normalize_email_address(
        data.get('newEmail') or data.get('new_email') or data.get('email')
    )
    otp = str(data.get('otp') or '').strip()

    if not new_email or not otp:
        return jsonify({"error": "New email and OTP are required"}), 400
    if not is_valid_email_address(new_email):
        return jsonify({"error": "Please enter a valid email address"}), 400
    if not re.fullmatch(r"\d{6}", otp):
        return jsonify({"error": "Please enter a valid 6-digit OTP"}), 400

    try:
        profile, table_name = find_account_by_user_id(user_id)
        if not profile:
            return jsonify({"error": "Profile not found"}), 404

        current_email = normalize_email_address(profile.get('email'))
        if new_email == current_email:
            return jsonify({"error": "New email must be different from your current email"}), 400

        otp_key = build_email_change_otp_key(user_id, new_email)
        stored = otp_store.get(otp_key)
        if not stored:
            return jsonify({"error": "No OTP found. Please request a new one."}), 400
        if stored.get("mode") != "emailChange" or str(stored.get("user_id")) != str(user_id):
            return jsonify({"error": "Invalid OTP request. Please request a new one."}), 400
        if datetime.utcnow() > stored['expires_at']:
            del otp_store[otp_key]
            return jsonify({"error": "OTP has expired. Please request a new one."}), 400
        if stored['otp'] != otp:
            return jsonify({"error": "Invalid OTP. Please try again."}), 400

        existing_account = find_account_by_email(new_email)
        if existing_account and str(existing_account.get('user_id')) != str(user_id):
            return jsonify({"error": "This email is already in use by another account"}), 400

        try:
            supabase_admin.auth.admin.update_user_by_id(
                user_id,
                {"email": new_email, "email_confirm": True}
            )
        except Exception as auth_error:
            print("Change email auth update error:", str(auth_error))
            return jsonify({"error": "Unable to update the login email. Please try again."}), 400

        try:
            response = supabase_admin.table(table_name).update({"email": new_email}).eq('id', user_id).execute()
        except Exception as db_error:
            if current_email:
                try:
                    supabase_admin.auth.admin.update_user_by_id(
                        user_id,
                        {"email": current_email, "email_confirm": True}
                    )
                except Exception as revert_error:
                    print("Change email auth revert error:", str(revert_error))
            raise db_error

        updated_profile = response.data[0] if response.data else get_single_row(table_name, 'id', user_id)
        normalized = normalize_public_profile(updated_profile or {**profile, "email": new_email})
        del otp_store[otp_key]

        return jsonify({
            "message": "Email updated successfully.",
            **normalized,
            "user": normalized,
        }), 200

    except Exception as e:
        print("Verify email change error:", str(e))
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# UPLOAD PET PHOTO TO SUPABASE STORAGE
# -----------------------------------------------
@app.route('/upload-pet-photo', methods=['POST'])
def upload_pet_photo():
    import base64

    data      = request.get_json() or {}
    file_b64  = data.get('file')
    file_name = data.get('file_name', f"pet_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}.jpg")
    mime_type = data.get('mime_type', 'image/jpeg')

    if not file_b64:
        return jsonify({"error": "No file provided"}), 400

    try:
        file_data = base64.b64decode(file_b64)
        original_name = os.path.basename(str(file_name or '').strip()) or f"pet_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}.jpg"
        safe_name = ''.join(ch if ch.isalnum() or ch in ('-', '_', '.') else '_' for ch in original_name)
        unique_folder = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}_{uuid.uuid4().hex[:8]}"
        file_path = f"photos/{unique_folder}/{safe_name}"

        supabase_admin.storage.from_("pet-photos").upload(
            path=file_path,
            file=file_data,
            file_options={"content-type": mime_type}
        )

        public_url = f"{SUPABASE_URL}/storage/v1/object/public/pet-photos/{file_path}"
        return jsonify({"photoUrl": public_url}), 200

    except Exception as e:
        print("Upload pet photo error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/upload-profile-photo', methods=['POST'])
def upload_profile_photo():
    import base64

    data = request.get_json() or {}
    file_b64 = data.get('file')
    file_name = data.get('file_name', f"profile_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}.jpg")
    mime_type = data.get('mime_type', 'image/jpeg')

    if not file_b64:
        return jsonify({"error": "No file provided"}), 400

    try:
        file_data = base64.b64decode(file_b64)
        original_name = os.path.basename(str(file_name or '').strip()) or f"profile_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}.jpg"
        safe_name = ''.join(ch if ch.isalnum() or ch in ('-', '_', '.') else '_' for ch in original_name)
        unique_folder = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}_{uuid.uuid4().hex[:8]}"
        file_path = f"profile-photos/{unique_folder}/{safe_name}"

        supabase_admin.storage.from_("pet-photos").upload(
            path=file_path,
            file=file_data,
            file_options={"content-type": mime_type}
        )

        public_url = f"{SUPABASE_URL}/storage/v1/object/public/pet-photos/{file_path}"
        return jsonify({"photoUrl": public_url}), 200
    except Exception as e:
        print("Upload profile photo error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/profile/<user_id>/change-password', methods=['POST'])
def change_authenticated_user_password(user_id):
    data = request.get_json() or {}
    current_password = data.get('current_password') or ''
    new_password = data.get('new_password') or ''

    if not current_password or not new_password:
        return jsonify({"error": "Current password and new password are required"}), 400

    if len(new_password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    if not any(char.islower() for char in new_password) or not any(char.isupper() for char in new_password) or not any(char.isdigit() for char in new_password):
        return jsonify({"error": "Password must contain at least one uppercase letter, one lowercase letter, and one number"}), 400

    if current_password == new_password:
        return jsonify({"error": "New password must be different from your current password"}), 400

    try:
        profile = get_single_row('patient_account', 'id', user_id) or get_single_row('employee_accounts', 'id', user_id)
        if not profile:
            return jsonify({"error": "Profile not found"}), 404

        email = normalize_email_address(profile.get('email'))
        if not email:
            return jsonify({"error": "This account does not have a valid email address"}), 400

        auth_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        auth_result = auth_client.auth.sign_in_with_password({"email": email, "password": current_password})
        session = getattr(auth_result, 'session', None)
        if not session:
            return jsonify({"error": "Current password is incorrect"}), 400

        supabase_admin.auth.admin.update_user_by_id(user_id, {"password": new_password})
        return jsonify({"message": "Password changed successfully"}), 200
    except Exception as e:
        print("Change authenticated password error:", str(e))
        lowered = str(e).lower()
        if 'invalid login credentials' in lowered or 'invalid_credentials' in lowered:
            return jsonify({"error": "Current password is incorrect"}), 400
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# ADD PET PROFILE
# -----------------------------------------------
@app.route('/pets', methods=['POST'])
def add_pet():
    data             = request.get_json() or {}
    owner_id         = data.get('owner_id')
    pet_name         = data.get('pet_name')
    pet_type         = data.get('pet_type')
    breed            = data.get('breed')
    pet_size         = data.get('pet_size')
    gender           = data.get('gender')
    birthday         = data.get('birthday')
    age              = data.get('age')
    weight           = data.get('weight_kg')
    pet_photo_url    = data.get('pet_photo_url')
    is_vaccinated    = data.get('is_vaccinated')
    vaccination_urls = data.get('vaccination_urls')

    if not all([owner_id, pet_name, pet_type, breed, pet_size, gender]):
        missing = [k for k, v in {
            "owner_id": owner_id, "pet_name": pet_name, "pet_type": pet_type,
            "breed": breed, "pet_size": pet_size, "gender": gender
        }.items() if not v]
        return jsonify({"error": f"Missing required fields: {missing}"}), 400

    try:
        response = supabase_admin.table('pet_profile').insert({
            "owner_id":         owner_id,
            "pet_name":         pet_name,
            "pet_species":      pet_type,
            "pet_breed":        breed,
            "pet_size":         pet_size,
            "pet_gender":       gender,
            "birthday":         birthday,
            "age":              age,
            "weight_kg":        weight,
            "pet_photo_url":    pet_photo_url,
            "is_vaccinated":    is_vaccinated,
            "vaccination_urls": vaccination_urls if vaccination_urls else None,
        }).execute()

        pet = response.data[0] if response.data else None
        return jsonify({"message": "Pet added successfully", "pet": pet}), 200

    except Exception as e:
        print("Add pet error:", str(e))
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# GET ALL PETS FOR A USER
# -----------------------------------------------
@app.route('/pets/user/<user_id>', methods=['GET'])
def get_user_pets(user_id):
    try:
        response = supabase_admin.table('pet_profile') \
            .select('*') \
            .eq('owner_id', user_id) \
            .execute()

        return jsonify({"pets": response.data}), 200

    except Exception as e:
        print("Fetch pets error:", str(e))
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# UPDATE PET
# -----------------------------------------------
@app.route('/pets/<int:pet_id>', methods=['PATCH'])
def update_pet(pet_id):
    data    = request.get_json() or {}
    allowed = [
        'pet_name', 'pet_species', 'pet_breed', 'pet_gender',
        'pet_size', 'birthday', 'age', 'weight_kg',
        'pet_photo_url', 'is_vaccinated', 'vaccination_urls',
    ]
    update_data = {k: v for k, v in data.items() if k in allowed}

    if not update_data:
        return jsonify({"error": "No valid fields to update"}), 400

    try:
        response = supabase_admin.table('pet_profile') \
            .update(update_data) \
            .eq('pet_id', pet_id) \
            .execute()

        pet = response.data[0] if response.data else None
        return jsonify({"message": "Pet updated successfully", "pet": pet}), 200

    except Exception as e:
        print("Update pet error:", str(e))
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# DELETE PET
# -----------------------------------------------
@app.route('/pets/<int:pet_id>', methods=['DELETE'])
def delete_pet(pet_id):
    try:
        supabase_admin.table('pet_profile') \
            .delete() \
            .eq('pet_id', pet_id) \
            .execute()

        return jsonify({"message": "Pet deleted successfully"}), 200

    except Exception as e:
        print("Delete pet error:", str(e))
        return jsonify({"error": str(e)}), 400


def create_appointment_record(data, allow_walk_in=False, branch_scope=None):
    data = data or {}
    owner_id = data.get('owner_id')
    pet_id = data.get('pet_id')
    is_walk_in = bool(data.get('is_walk_in', False))
    branch_id = data.get('branch_id') or data.get('branchId')

    try:
        branch_id = int(branch_id) if branch_id not in (None, '', 'null') else None
    except (TypeError, ValueError):
        branch_id = None

    if branch_scope is not None:
        branch_id, branch_error = validate_branch_scope_access(branch_scope, branch_id)
        if branch_error:
            raise ValueError(branch_error)

    if allow_walk_in and (owner_id == 'WALK_IN' or pet_id == 'WALK_IN') and is_walk_in:
        guest_required_fields = {
            "First name": data.get('walk_in_first_name'),
            "Last name": data.get('walk_in_last_name'),
            "Pet name": data.get('walk_in_pet_name'),
            "Pet type": data.get('walk_in_pet_type'),
            "Breed": data.get('walk_in_breed'),
            "Gender": data.get('walk_in_gender'),
            "Appointment service": data.get('appointment_type') or data.get('service'),
            "Appointment date": data.get('appointment_date') or data.get('date'),
            "Appointment time": data.get('appointment_time') or data.get('time'),
            "Branch": branch_id,
        }
        missing_guest_fields = [label for label, value in guest_required_fields.items() if value in (None, "")]
        if missing_guest_fields:
            raise ValueError(format_missing_required_fields(missing_guest_fields))

        walk_in_email = data.get('walk_in_email') or ''
        walk_in_phone = data.get('walk_in_phone') or ''
        response = supabase_admin.table('walkin_appointments').insert({
            "first_name": (data.get('walk_in_first_name') or 'Walk-In').strip(),
            "last_name": (data.get('walk_in_last_name') or 'Guest').strip(),
            "email": walk_in_email,
            "contact_number": walk_in_phone,
            "pet_name": data.get('walk_in_pet_name') or 'Unknown Pet',
            "pet_species": data.get('walk_in_pet_type') or 'Other',
            "pet_breed": data.get('walk_in_breed') or 'Unknown',
            "pet_gender": data.get('walk_in_gender') or 'Unknown',
            "pet_dob": data.get('walk_in_dob') or None,
            "appointment_type": data.get('appointment_type') or data.get('service'),
            "appointment_date": data.get('appointment_date') or data.get('date'),
            "appointment_time": data.get('appointment_time') or data.get('time'),
            "patient_reason": data.get('patient_reason') or data.get('reason') or '',
            "branch_id": branch_id,
            "status": "pending",
        }).execute()

        created_row = (response.data or [{}])[0]
        created_id = created_row.get('walkin_id') or created_row.get('id')
        email_sent = False

        try:
            email_context = get_reschedule_email_context('walkin_appointments', 'walkin_id', created_id)
            existing_record = email_context.get("record") or created_row
            email_sent = send_appointment_email_safely(
                send_booking_confirmation_email,
                email_context.get("email"),
                email_context.get("patient_name"),
                email_context.get("pet_name"),
                email_context.get("service_name"),
                existing_record.get("appointment_date"),
                format_display_time(existing_record.get("appointment_time")),
                existing_record.get("status") or "pending",
                context="Booking confirmation preparation (walk-in)"
            )
        except Exception as email_error:
            print(f"Booking confirmation preparation error (walk-in): {email_error}")

        safe_create_appointment_admin_notification(
            table_name='walkin_appointments',
            id_column='walkin_id',
            record_id=created_id,
            event_type='appointment_created',
            title='Clinic-created appointment added',
            action_text='was added by the clinic',
            severity='info',
            link='/admin/schedule',
        )

        return {
            "message": "Clinic-created appointment created!",
            "data": response.data,
            "appointment_id": None,
            "walkin_id": created_id,
            "target_id": created_id,
            "recordType": "walkin",
            "emailSent": email_sent,
        }

    appointment_type = data.get('appointment_type') or data.get('service')
    appointment_date = data.get('appointment_date') or data.get('date')
    appointment_time = data.get('appointment_time') or data.get('time')

    required_fields = {
        "Owner": owner_id,
        "Pet": pet_id,
        "Appointment service": appointment_type,
        "Appointment date": appointment_date,
        "Appointment time": appointment_time,
        "Branch": branch_id,
    }
    missing = [label for label, value in required_fields.items() if value in (None, "")]
    if owner_id == 'WALK_IN' or pet_id == 'WALK_IN' or is_walk_in:
        raise ValueError("Select an existing owner and pet before booking an appointment.")
    if missing:
        raise ValueError(format_missing_required_fields(missing))

    response = supabase_admin.table('appointments').insert({
        "owner_id": owner_id,
        "pet_id": pet_id,
        "appointment_type": appointment_type,
        "appointment_date": appointment_date,
        "appointment_time": appointment_time,
        "patient_reason": data.get('patient_reason') or data.get('reason') or '',
        "branch_id": branch_id,
        "status": "pending",
    }).execute()

    created_row = (response.data or [{}])[0]
    created_id = created_row.get('appointment_id') or created_row.get('id')
    email_sent = False

    try:
        email_context = get_reschedule_email_context('appointments', 'appointment_id', created_id)
        existing_record = email_context.get("record") or created_row
        email_sent = send_appointment_email_safely(
            send_booking_confirmation_email,
            email_context.get("email"),
            email_context.get("patient_name"),
            email_context.get("pet_name"),
            email_context.get("service_name"),
            existing_record.get("appointment_date"),
            format_display_time(existing_record.get("appointment_time")),
            existing_record.get("status") or "pending",
            context="Booking confirmation preparation"
        )
    except Exception as email_error:
        print(f"Booking confirmation preparation error: {email_error}")

    safe_create_appointment_admin_notification(
        table_name='appointments',
        id_column='appointment_id',
        record_id=created_id,
        event_type='appointment_created',
        title='New appointment booked',
        action_text='was booked',
        severity='info',
        link='/admin/schedule',
    )

    return {
        "message": "Appointment created!",
        "data": response.data,
        "appointment_id": created_id,
        "walkin_id": None,
        "target_id": created_id,
        "recordType": "appointment",
        "emailSent": email_sent,
    }


# -----------------------------------------------
# BOOK APPOINTMENT
# -----------------------------------------------
@app.route('/appointments', methods=['POST'])
def book_appointment():
    try:
        created = create_appointment_record(request.get_json() or {}, allow_walk_in=False)
        return jsonify(created), 200
    except ValueError as value_error:
        return jsonify({"error": str(value_error)}), 400
    except Exception as e:
        print("Appointment error:", str(e))
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# CANCEL APPOINTMENT
# -----------------------------------------------
@app.route('/appointments/<int:appointment_id>/cancel', methods=['PATCH'])
def cancel_appointment(appointment_id):
    data          = request.get_json()
    cancel_reason = data.get('cancel_reason', '')

    try:
        check = supabase_admin.table('appointments') \
            .select('status') \
            .eq('appointment_id', appointment_id) \
            .single() \
            .execute()

        if not check.data:
            return jsonify({"error": "Appointment not found"}), 404

        if check.data['status'] in ('cancelled', 'completed'):
            return jsonify({"error": f"Cannot cancel an appointment with status '{check.data['status']}'"}), 400

        supabase_admin.table('appointments').update({
            "status":         "cancelled",
            "patient_reason": cancel_reason,
        }).eq('appointment_id', appointment_id).execute()

        safe_create_appointment_admin_notification(
            table_name='appointments',
            id_column='appointment_id',
            record_id=appointment_id,
            event_type='appointment_cancelled',
            title='Appointment cancelled',
            action_text='was cancelled',
            severity='warning',
            link='/admin/history',
            metadata={"reason": cancel_reason},
        )

        return jsonify({"message": "Appointment cancelled successfully"}), 200

    except Exception as e:
        print("Cancel appointment error:", str(e))
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# RESCHEDULE APPOINTMENT
# -----------------------------------------------
@app.route('/appointments/<int:appointment_id>/reschedule', methods=['PATCH'])
def reschedule_appointment(appointment_id):
    data              = request.get_json()
    new_date          = data.get('new_date')
    new_time          = data.get('new_time')
    reschedule_reason = data.get('reschedule_reason', '')

    if not new_date or not new_time:
        return jsonify({"error": "new_date and new_time are required"}), 400

    try:
        check = supabase_admin.table('appointments') \
            .select('status') \
            .eq('appointment_id', appointment_id) \
            .single() \
            .execute()

        if not check.data:
            return jsonify({"error": "Appointment not found"}), 404

        if check.data['status'] in ('cancelled', 'completed'):
            return jsonify({"error": f"Cannot reschedule an appointment with status '{check.data['status']}'"}), 400

        supabase_admin.table('appointments').update({
            "appointment_date": new_date,
            "appointment_time": new_time,
            "patient_reason":   reschedule_reason,
            "status":           "pending",
        }).eq('appointment_id', appointment_id).execute()

        safe_create_appointment_admin_notification(
            table_name='appointments',
            id_column='appointment_id',
            record_id=appointment_id,
            event_type='appointment_rescheduled',
            title='Appointment rescheduled',
            action_text='was rescheduled',
            severity='info',
            link='/admin/schedule',
            metadata={"reason": reschedule_reason},
        )

        return jsonify({"message": "Reschedule request submitted successfully"}), 200

    except Exception as e:
        print("Reschedule appointment error:", str(e))
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# SAVE GROOMING DETAILS
# -----------------------------------------------
@app.route('/grooming-details', methods=['POST'])
def save_grooming_details():
    data                  = request.get_json()
    appointment_id        = data.get('appointment_id')
    haircut_style         = data.get('haircut_style')
    haircut_description   = data.get('haircut_description')
    haircut_reference_url = data.get('haircut_reference_url')

    if not appointment_id or not haircut_style:
        return jsonify({"error": "appointment_id and haircut_style are required"}), 400

    try:
        supabase_admin.table('grooming_details').insert({
            "appointment_id":        appointment_id,
            "haircut_style":         haircut_style,
            "haircut_description":   haircut_description,
            "haircut_reference_url": haircut_reference_url,
        }).execute()

        return jsonify({"message": "Grooming details saved successfully!"}), 200

    except Exception as e:
        print("Grooming details error:", str(e))
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# SAVE MEDICAL INFORMATION
# -----------------------------------------------
@app.route('/medical-information', methods=['GET', 'POST'])
@app.route('/api/medical-information', methods=['GET', 'POST'])
def medical_information_collection():
    if request.method == 'GET':
        try:
            appointment_ids_raw = (request.args.get('appointmentIds') or '').strip()
            query = supabase_admin.table('medical_information').select('*')

            if appointment_ids_raw:
                parsed_ids = [item.strip() for item in appointment_ids_raw.split(',') if item.strip()]
                query = query.in_('appointment_id', parsed_ids)

            response = query.execute()
            rows = [normalize_medical_information_record(item) for item in (response.data or [])]
            rows = [item for item in rows if item]
            return jsonify({"medicalInformation": rows}), 200
        except Exception as e:
            print("Medical information list error:", str(e))
            return jsonify({"error": str(e)}), 400

    data = request.get_json() or {}
    record_type = (data.get('record_type') or ('walkin' if data.get('walkin_id') else 'appointment')).strip().lower()
    appointment_id = data.get('appointment_id')
    walkin_id = data.get('walkin_id')

    if record_type not in {'appointment', 'walkin'}:
        return jsonify({"error": "record_type must be either 'appointment' or 'walkin'"}), 400

    if record_type == 'walkin' and not walkin_id:
        return jsonify({"error": "walkin_id is required for walkin medical information"}), 400
    if record_type != 'walkin' and not appointment_id:
        return jsonify({"error": "appointment_id is required"}), 400

    on_medication = coerce_optional_bool(data.get('on_medication'))
    flea_tick_prevention = coerce_optional_bool(data.get('flea_tick_prevention'))
    is_vaccinated = coerce_optional_bool(data.get('is_vaccinated'))
    is_pregnant = coerce_optional_bool(data.get('is_pregnant'))
    has_allergies = coerce_optional_bool(data.get('has_allergies'))
    has_skin_condition = coerce_optional_bool(data.get('has_skin_condition'))
    been_groomed_before = coerce_optional_bool(data.get('been_groomed_before'))
    medication_details = str(data.get('medication_details') or '').strip()
    allergy_details = str(data.get('allergy_details') or '').strip()
    skin_condition_details = str(data.get('skin_condition_details') or '').strip()

    missing_fields = []
    if on_medication is None:
        missing_fields.append("Medication question")
    if flea_tick_prevention is None:
        missing_fields.append("Flea and tick prevention")
    if is_vaccinated is None:
        missing_fields.append("Vaccination status")
    if is_pregnant is None:
        missing_fields.append("Pregnancy status")
    if on_medication is True and not medication_details:
        missing_fields.append("Medication details")
    if has_allergies is True and not allergy_details:
        missing_fields.append("Allergy details")
    if has_skin_condition is True and not skin_condition_details:
        missing_fields.append("Skin condition details")

    if missing_fields:
        return jsonify({"error": format_missing_required_fields(missing_fields)}), 400

    try:
        payload = {
            "record_type": record_type,
            "appointment_id": appointment_id if record_type != 'walkin' else None,
            "walkin_id": walkin_id if record_type == 'walkin' else None,
            "is_pregnant": is_pregnant,
            "is_vaccinated": is_vaccinated,
            "has_allergies": has_allergies,
            "allergy_details": allergy_details,
            "has_skin_condition": has_skin_condition,
            "been_groomed_before": been_groomed_before,
            "on_medication": on_medication,
            "medication_details": medication_details,
            "skin_condition_details": skin_condition_details,
            "flea_tick_prevention": flea_tick_prevention,
            "additional_notes": str(data.get('additional_notes') or '').strip(),
            "reported_symptoms": data.get('reported_symptoms') or [],
            "owner_symptom_notes": str(data.get('owner_symptom_notes') or '').strip(),
            "symptom_duration": str(data.get('symptom_duration') or '').strip(),
            "eating_status": str(data.get('eating_status') or '').strip(),
            "drinking_status": str(data.get('drinking_status') or '').strip(),
            "worsening_status": str(data.get('worsening_status') or '').strip(),
            "ai_symptom_summary": str(data.get('ai_symptom_summary') or '').strip(),
        }

        lookup_column = 'walkin_id' if record_type == 'walkin' else 'appointment_id'
        lookup_value = walkin_id if record_type == 'walkin' else appointment_id
        existing = supabase_admin.table('medical_information').select('*').eq(lookup_column, lookup_value).execute().data or []

        if existing:
            response = supabase_admin.table('medical_information').update(payload).eq(lookup_column, lookup_value).execute()
        else:
            response = supabase_admin.table('medical_information').insert(payload).execute()

        normalized = normalize_medical_information_record((response.data or [{}])[0])
        return jsonify({"message": "Medical information saved successfully!", "medicalInformation": normalized}), 200
    except Exception as e:
        print("Medical information error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/medical-information/<appointment_id>', methods=['GET'])
@app.route('/api/medical-information/<appointment_id>', methods=['GET'])
def get_medical_information_by_target(appointment_id):
    record_type = (request.args.get('recordType') or request.args.get('record_type') or 'appointment').strip().lower()
    lookup_column = 'walkin_id' if record_type == 'walkin' else 'appointment_id'

    try:
        response = supabase_admin.table('medical_information').select('*').eq(lookup_column, appointment_id).single().execute()
        normalized = normalize_medical_information_record(response.data or {})
        return jsonify({"medicalInformation": normalized}), 200
    except Exception as e:
        print("Medical information fetch error:", str(e))
        return jsonify({"medicalInformation": None}), 200


@app.route('/api/ai/symptom-summary', methods=['POST'])
def generate_user_symptom_summary():
    payload = request.get_json() or {}
    if not payload:
        return jsonify({"error": "Symptom intake context is required"}), 400

    try:
        prompt = build_user_symptom_summary_prompt(payload)
        ai_result = call_gemini_with_structured_output(prompt, USER_SYMPTOM_SUMMARY_SCHEMA)
        summary = str(ai_result.get("summary") or "").strip()
        if not summary:
            return jsonify({"error": "AI summary could not be generated"}), 502

        return jsonify({
            "summary": summary,
            "model": ai_result.get("model"),
            "support_metadata": {
                "label": "AI-generated clinical support",
                "review_required": True,
                "reliability": "Moderate",
                "reasons": ["Generated from owner-provided booking symptom intake."],
                "sources": ["owner symptom intake"],
                "missing_context": [],
                "generated_at": _generated_at_manila_iso(),
                "disclaimer": "Review and verify before use. This output does not diagnose, prescribe, or replace veterinary judgment.",
            },
        }), 200
    except ValueError as value_error:
        return build_ai_error_response(value_error, "Unable to generate the symptom summary right now.")
    except Exception as e:
        print("Symptom summary AI error:", str(e))
        return build_ai_error_response(e, "Unable to generate the symptom summary right now.")


@app.route('/api/ai/admin-appointment-summary', methods=['POST'])
def generate_admin_appointment_summary():
    payload = request.get_json() or {}
    if not payload:
        return jsonify({"error": "Appointment context is required"}), 400

    try:
        case_context = build_admin_ai_case_context(payload)
        prompt = build_admin_ai_prompt(case_context)
        ai_result = call_gemini_with_structured_output(prompt, ADMIN_AI_SUMMARY_SCHEMA)
        return jsonify({
            "summary": attach_ai_support_metadata(ai_result, case_context, "admin"),
            "caseContext": case_context
        }), 200
    except ValueError as e:
        return build_ai_error_response(e, "Unable to generate the AI summary right now.")
    except Exception as e:
        print("Admin AI summary error:", str(e))
        return build_ai_error_response(e, "Unable to generate the AI summary right now.")


@app.route('/api/ai/admin-appointment-summary/saved', methods=['GET'])
def get_saved_admin_appointment_summary():
    record_type = (request.args.get('recordType') or request.args.get('record_type') or 'appointment').strip().lower()
    target_id = request.args.get('targetId') or request.args.get('target_id')

    if record_type not in {'appointment', 'walkin'}:
        return jsonify({"error": "recordType must be appointment or walkin"}), 400
    if target_id in (None, ''):
        return jsonify({"error": "targetId is required"}), 400

    try:
        response = (
            supabase_admin.table('ai_generated_summaries')
            .select('*')
            .eq('record_type', record_type)
            .eq('target_id', int(target_id))
            .eq('summary_type', 'admin_appointment')
            .order('updated_at', desc=True)
            .limit(1)
            .execute()
        )
        row = (response.data or [None])[0]
        return jsonify({"summary": row.get("summary_payload") if row else None, "savedSummary": row}), 200
    except Exception as e:
        print("Saved admin AI summary lookup error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/ai/admin-appointment-summary/saved', methods=['POST'])
def save_admin_appointment_summary():
    data = request.get_json() or {}
    record_type = (data.get('recordType') or data.get('record_type') or 'appointment').strip().lower()
    target_id = data.get('targetId') or data.get('target_id')
    summary_payload = data.get('summary') or data.get('summary_payload')

    if record_type not in {'appointment', 'walkin'}:
        return jsonify({"error": "recordType must be appointment or walkin"}), 400
    if target_id in (None, ''):
        return jsonify({"error": "targetId is required"}), 400
    if not isinstance(summary_payload, dict):
        return jsonify({"error": "summary is required"}), 400

    try:
        row_payload = {
            "record_type": record_type,
            "target_id": int(target_id),
            "summary_type": "admin_appointment",
            "summary_payload": summary_payload,
            "model": summary_payload.get("model"),
            "updated_at": get_current_manila_datetime().isoformat(),
        }
        response = (
            supabase_admin.table('ai_generated_summaries')
            .upsert(row_payload, on_conflict='record_type,target_id,summary_type')
            .execute()
        )
        row = (response.data or [row_payload])[0]
        return jsonify({"summary": row.get("summary_payload") or summary_payload, "savedSummary": row}), 200
    except Exception as e:
        print("Save admin AI summary error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/ai/doctor-emr-brief', methods=['POST'])
def generate_doctor_emr_brief():
    payload = request.get_json() or {}
    if not payload:
        return jsonify({"error": "EMR context is required"}), 400

    try:
        case_context = build_doctor_emr_case_context(payload)
        prompt = build_doctor_emr_prompt(case_context)
        ai_result = call_gemini_with_structured_output(prompt, DOCTOR_EMR_BRIEF_SCHEMA)
        return jsonify({
            "summary": attach_ai_support_metadata(ai_result, case_context, "doctor"),
            "caseContext": case_context
        }), 200
    except ValueError as e:
        return build_ai_error_response(e, "Unable to generate the EMR prep brief right now.")
    except Exception as e:
        print("Doctor EMR AI brief error:", str(e))
        return build_ai_error_response(e, "Unable to generate the EMR prep brief right now.")


@app.route('/api/ai/clinical-risk-flags', methods=['POST'])
def generate_clinical_risk_flags():
    payload = request.get_json() or {}
    if not payload:
        return jsonify({"error": "Clinical risk context is required"}), 400

    try:
        risk_result, case_context = build_clinical_risk_flags(payload)
        return jsonify({
            "riskFlags": attach_ai_support_metadata(risk_result, case_context, "doctor"),
            "caseContext": case_context
        }), 200
    except Exception as e:
        print("Clinical risk flag error:", str(e))
        return build_ai_error_response(e, "Unable to generate clinical risk flags right now.")


@app.route('/api/ai/follow-up-reminders', methods=['POST'])
def generate_follow_up_reminders():
    payload = request.get_json() or {}
    if not payload:
        return jsonify({"error": "Follow-up reminder context is required"}), 400

    try:
        reminder_result, case_context = build_follow_up_reminders(payload)
        return jsonify({
            "followUpReminders": attach_ai_support_metadata(reminder_result, case_context, "doctor"),
            "caseContext": case_context
        }), 200
    except Exception as e:
        print("Follow-up reminder error:", str(e))
        return build_ai_error_response(e, "Unable to generate follow-up reminders right now.")


@app.route('/api/ai/client-care-summary', methods=['POST'])
def generate_client_care_summary():
    payload = request.get_json() or {}
    if not payload:
        return jsonify({"error": "Client care summary context is required"}), 400

    try:
        case_context = build_current_visit_ai_case_context(payload)
        prompt = build_client_care_summary_prompt(case_context)
        ai_result = call_gemini_with_structured_output(prompt, CLIENT_CARE_SUMMARY_SCHEMA)
        return jsonify({
            "careSummary": attach_ai_support_metadata(ai_result, case_context, "doctor"),
            "caseContext": case_context
        }), 200
    except ValueError as e:
        return build_ai_error_response(e, "Unable to generate the client care summary right now.")
    except Exception as e:
        print("Client care summary AI error:", str(e))
        return build_ai_error_response(e, "Unable to generate the client care summary right now.")


# -----------------------------------------------
# EMR SEARCH / RECORDS
# -----------------------------------------------
@app.route('/api/emr/search-pets', methods=['GET'])
def get_emr_search_pets():
    try:
        branch_scope, branch_error = require_actor_branch_scope()
        if branch_error:
            return jsonify({"error": branch_error}), 400
        return jsonify({"pets": get_emr_search_results(branch_scope=branch_scope)}), 200
    except Exception as e:
        print("EMR pet search error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/emr/records', methods=['GET', 'POST'])
def emr_records_collection():
    if request.method == 'GET':
        try:
            branch_scope, branch_error = require_actor_branch_scope()
            if branch_error:
                return jsonify({"error": branch_error}), 400
            return jsonify({"records": get_emr_records(include_details=False, branch_scope=branch_scope)}), 200
        except Exception as e:
            print("EMR records fetch error:", str(e))
            return jsonify({"error": str(e)}), 400

    try:
        payload = request.get_json() or {}
        branch_scope, branch_error = require_actor_branch_scope(payload)
        if branch_error:
            return jsonify({"error": branch_error}), 400
        pet_id = payload.get("petId") or payload.get("pet_id")
        existing_record = get_single_row("medical_records", "pet_id", int(pet_id)) if pet_id not in (None, "") else None
        saved_record = save_emr_record_payload(payload, branch_scope=branch_scope)
        saved_record_id = (saved_record.get("id") or saved_record.get("medicalRecordId")) if saved_record else None
        safe_create_emr_admin_notification(
            medical_record_id=saved_record_id,
            event_type='medical_record_updated' if existing_record else 'medical_record_created',
            title='Medical record updated' if existing_record else 'Medical record created',
            action_text='had a medical record updated' if existing_record else 'had a medical record created',
            severity='info',
            link='/patient-records',
        )
        return jsonify({
            "message": "Medical record saved successfully!",
            "record": saved_record,
        }), 200
    except ValueError as value_error:
        return jsonify({"error": str(value_error)}), 400
    except Exception as e:
        print("EMR create error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/emr/records/<int:record_id>', methods=['GET', 'PUT', 'DELETE'])
def emr_record_detail(record_id):
    if request.method == 'GET':
        try:
            branch_scope, branch_error = require_actor_branch_scope()
            if branch_error:
                return jsonify({"error": branch_error}), 400
            records = get_emr_records([record_id], include_billing=True, branch_scope=branch_scope)
            if not records:
                return jsonify({"error": "Medical record not found."}), 404
            return jsonify({"record": records[0]}), 200
        except Exception as e:
            print("EMR record detail error:", str(e))
            return jsonify({"error": str(e)}), 400

    if request.method == 'PUT':
        try:
            payload = request.get_json() or {}
            branch_scope, branch_error = require_actor_branch_scope(payload)
            if branch_error:
                return jsonify({"error": branch_error}), 400
            saved_record = save_emr_record_payload(payload, existing_record_id=record_id, branch_scope=branch_scope)
            safe_create_emr_admin_notification(
                medical_record_id=record_id,
                event_type='medical_record_updated',
                title='Medical record updated',
                action_text='had a medical record updated',
                severity='info',
                link='/patient-records',
            )
            return jsonify({
                "message": "Medical record updated successfully!",
                "record": saved_record,
            }), 200
        except ValueError as value_error:
            return jsonify({"error": str(value_error)}), 400
        except Exception as e:
            print("EMR update error:", str(e))
            return jsonify({"error": str(e)}), 400

    try:
        branch_scope, branch_error = require_actor_branch_scope()
        if branch_error:
            return jsonify({"error": branch_error}), 400
        existing_record = get_single_row("medical_records", "medical_record_id", record_id)
        if not existing_record:
            return jsonify({"error": "Medical record not found."}), 404
        if not get_emr_records([record_id], include_details=False, branch_scope=branch_scope):
            return jsonify({"error": "Medical record not found."}), 404

        safe_create_emr_admin_notification(
            medical_record_id=record_id,
            event_type='medical_record_deleted',
            title='Medical record deleted',
            action_text='had a medical record deleted',
            severity='warning',
            link='/patient-records',
        )
        supabase_admin.table("medical_records").delete().eq("medical_record_id", record_id).execute()
        return jsonify({"message": "Medical record deleted successfully."}), 200
    except Exception as e:
        print("EMR delete error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/emr/pets/<int:pet_id>/appointments', methods=['GET'])
def get_emr_pet_appointment_history(pet_id):
    try:
        branch_scope, branch_error = require_actor_branch_scope()
        if branch_error:
            return jsonify({"error": branch_error}), 400
        return jsonify({"appointments": get_emr_pet_appointments(pet_id, branch_scope=branch_scope)}), 200
    except Exception as e:
        print("EMR pet appointments error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/emr/lab-results/<int:lab_result_id>/owner-visibility', methods=['PUT'])
def update_emr_lab_result_owner_visibility(lab_result_id):
    try:
        data = request.get_json() or {}
        branch_scope, branch_error = require_actor_branch_scope(data)
        if branch_error:
            return jsonify({"error": branch_error}), 400
        visible_to_owner = coerce_optional_bool(data.get("visibleToOwner"))
        if visible_to_owner is None:
            return jsonify({"error": "visibleToOwner is required."}), 400

        existing_row = get_single_row("medical_record_lab_results", "medical_record_lab_result_id", lab_result_id)
        if not existing_row:
            return jsonify({"error": "Lab result not found."}), 404
        existing_visit = get_single_row("medical_record_visits", "medical_record_visit_id", existing_row.get("medical_record_visit_id"))
        visit_branch_id = resolve_emr_visit_branch_id(
            (existing_visit or {}).get("source_type"),
            (existing_visit or {}).get("source_id"),
            fallback_branch_id=(existing_visit or {}).get("branch_id"),
        )
        _, branch_access_error = validate_branch_scope_access(branch_scope, visit_branch_id)
        if branch_access_error:
            return jsonify({"error": branch_access_error}), 403

        payload = build_owner_visibility_payload(
            {"visibleToOwner": visible_to_owner, **data},
            existing_row=existing_row,
        )
        response = supabase_admin.table("medical_record_lab_results").update(payload).eq(
            "medical_record_lab_result_id", lab_result_id
        ).execute().data or []
        updated_row = response[0] if response else get_single_row("medical_record_lab_results", "medical_record_lab_result_id", lab_result_id)
        visit_id = updated_row.get("medical_record_visit_id") or existing_row.get("medical_record_visit_id")

        safe_create_emr_admin_notification(
            visit_id=visit_id,
            event_type='lab_result_shared' if visible_to_owner else 'lab_result_hidden',
            title='Lab result shared' if visible_to_owner else 'Lab result hidden',
            action_text='had a lab result shared to the owner portal' if visible_to_owner else 'had a lab result hidden from the owner portal',
            severity='success' if visible_to_owner else 'info',
            link='/patient-records',
            entity_type='lab_result',
            entity_id=lab_result_id,
            metadata={
                "labResultId": lab_result_id,
                "visibleToOwner": visible_to_owner,
                "testType": updated_row.get("test_type") or existing_row.get("test_type"),
            },
        )

        return jsonify({
            "message": "Lab result owner visibility updated successfully.",
            "labResult": {
                "id": str(updated_row.get("medical_record_lab_result_id") or lab_result_id),
                "visibleToOwner": bool(updated_row.get("visible_to_owner")),
                "visibleToOwnerAt": updated_row.get("visible_to_owner_at") or "",
                "visibleToOwnerBy": updated_row.get("visible_to_owner_by") or "",
            }
        }), 200
    except Exception as e:
        print("EMR lab result visibility update error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/emr/vaccinations/<int:vaccination_id>/owner-visibility', methods=['PUT'])
def update_emr_vaccination_owner_visibility(vaccination_id):
    try:
        data = request.get_json() or {}
        branch_scope, branch_error = require_actor_branch_scope(data)
        if branch_error:
            return jsonify({"error": branch_error}), 400
        visible_to_owner = coerce_optional_bool(data.get("visibleToOwner"))
        if visible_to_owner is None:
            return jsonify({"error": "visibleToOwner is required."}), 400

        existing_row = get_single_row("medical_record_vaccinations", "medical_record_vaccination_id", vaccination_id)
        if not existing_row:
            return jsonify({"error": "Vaccination record not found."}), 404
        existing_visit = get_single_row("medical_record_visits", "medical_record_visit_id", existing_row.get("medical_record_visit_id"))
        visit_branch_id = resolve_emr_visit_branch_id(
            (existing_visit or {}).get("source_type"),
            (existing_visit or {}).get("source_id"),
            fallback_branch_id=(existing_visit or {}).get("branch_id"),
        )
        _, branch_access_error = validate_branch_scope_access(branch_scope, visit_branch_id)
        if branch_access_error:
            return jsonify({"error": branch_access_error}), 403

        payload = build_owner_visibility_payload(
            {"visibleToOwner": visible_to_owner, **data},
            existing_row=existing_row,
        )
        response = supabase_admin.table("medical_record_vaccinations").update(payload).eq(
            "medical_record_vaccination_id", vaccination_id
        ).execute().data or []
        updated_row = response[0] if response else get_single_row("medical_record_vaccinations", "medical_record_vaccination_id", vaccination_id)
        visit_id = updated_row.get("medical_record_visit_id") or existing_row.get("medical_record_visit_id")

        safe_create_emr_admin_notification(
            visit_id=visit_id,
            event_type='vaccination_shared' if visible_to_owner else 'vaccination_hidden',
            title='Vaccination shared' if visible_to_owner else 'Vaccination hidden',
            action_text='had a vaccination record shared to the owner portal' if visible_to_owner else 'had a vaccination record hidden from the owner portal',
            severity='success' if visible_to_owner else 'info',
            link='/patient-records',
            entity_type='vaccination',
            entity_id=vaccination_id,
            metadata={
                "vaccinationId": vaccination_id,
                "visibleToOwner": visible_to_owner,
                "vaccineName": updated_row.get("vaccine_name") or existing_row.get("vaccine_name"),
            },
        )

        return jsonify({
            "message": "Vaccination owner visibility updated successfully.",
            "vaccination": {
                "id": str(updated_row.get("medical_record_vaccination_id") or vaccination_id),
                "visibleToOwner": bool(updated_row.get("visible_to_owner")),
                "visibleToOwnerAt": updated_row.get("visible_to_owner_at") or "",
                "visibleToOwnerBy": updated_row.get("visible_to_owner_by") or "",
            }
        }), 200
    except Exception as e:
        print("EMR vaccination visibility update error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/pets/<int:pet_id>/shared-records', methods=['GET'])
def get_pet_shared_records(pet_id):
    try:
        medical_record_rows = execute_with_retry(
            lambda: supabase_admin.table("medical_records").select("medical_record_id").eq("pet_id", pet_id).execute(),
            context="Fetch shared records medical record ids"
        ).data or []
        medical_record_ids = [
            item.get("medical_record_id")
            for item in medical_record_rows
            if item.get("medical_record_id") not in (None, "")
        ]
        if not medical_record_ids:
            return jsonify({"labResults": [], "vaccinations": []}), 200

        visit_rows = execute_with_retry(
            lambda: supabase_admin.table("medical_record_visits").select("*").in_("medical_record_id", medical_record_ids).execute(),
            context="Fetch shared records visits"
        ).data or []
        visit_ids = [
            item.get("medical_record_visit_id")
            for item in visit_rows
            if item.get("medical_record_visit_id") not in (None, "")
        ]
        if not visit_ids:
            return jsonify({"labResults": [], "vaccinations": []}), 200

        visits_by_id = {
            str(item.get("medical_record_visit_id")): item
            for item in visit_rows
            if item.get("medical_record_visit_id") not in (None, "")
        }

        shared_lab_rows = execute_with_retry(
            lambda: supabase_admin.table("medical_record_lab_results")
            .select("*")
            .in_("medical_record_visit_id", visit_ids)
            .eq("visible_to_owner", True)
            .execute(),
            context="Fetch shared lab results"
        ).data or []
        shared_vaccination_rows = execute_with_retry(
            lambda: supabase_admin.table("medical_record_vaccinations")
            .select("*")
            .in_("medical_record_visit_id", visit_ids)
            .eq("visible_to_owner", True)
            .execute(),
            context="Fetch shared vaccinations"
        ).data or []

        def shared_record_sort_key(row, visit_lookup):
            visit = visit_lookup.get(str(row.get("medical_record_visit_id")), {})
            parsed_date = parse_emr_date(
                visit.get("visit_date")
                or row.get("date_administered")
                or row.get("visible_to_owner_at")
            ) or date.min
            normalized_time = normalize_db_time(visit.get("visit_time")) or "00:00:00"
            return (
                parsed_date.isoformat(),
                normalized_time,
                int(row.get("sort_order") or 0),
                int(row.get("medical_record_lab_result_id") or row.get("medical_record_vaccination_id") or 0),
            )

        lab_results = []
        for row in sorted(shared_lab_rows, key=lambda item: shared_record_sort_key(item, visits_by_id), reverse=True):
            visit = visits_by_id.get(str(row.get("medical_record_visit_id")), {})
            lab_results.append({
                "id": str(row.get("medical_record_lab_result_id") or ""),
                "visitId": str(row.get("medical_record_visit_id") or ""),
                "testType": row.get("test_type") or "",
                "fileName": row.get("file_name") or "",
                "fileUrl": row.get("file_url") or "",
                "interpretation": row.get("interpretation") or "",
                "visitDate": normalize_emr_date(visit.get("visit_date")) or "",
                "veterinarian": visit.get("veterinarian_name") or "",
                "sharedAt": row.get("visible_to_owner_at") or "",
                "sharedBy": row.get("visible_to_owner_by") or "",
            })

        vaccinations = []
        for row in sorted(shared_vaccination_rows, key=lambda item: shared_record_sort_key(item, visits_by_id), reverse=True):
            visit = visits_by_id.get(str(row.get("medical_record_visit_id")), {})
            vaccinations.append({
                "id": str(row.get("medical_record_vaccination_id") or ""),
                "visitId": str(row.get("medical_record_visit_id") or ""),
                "vaccineName": row.get("vaccine_name") or "",
                "doseVolume": row.get("dose_volume") or "",
                "injectionSite": row.get("injection_site") or "",
                "manufacturer": row.get("manufacturer") or "",
                "dateAdministered": normalize_emr_date(row.get("date_administered")) or "",
                "nextDueDate": normalize_emr_date(row.get("next_due_date")) or "",
                "veterinarian": visit.get("veterinarian_name") or "",
                "sharedAt": row.get("visible_to_owner_at") or "",
                "sharedBy": row.get("visible_to_owner_by") or "",
            })

        return jsonify({
            "labResults": lab_results,
            "vaccinations": vaccinations,
        }), 200
    except Exception as e:
        print("Shared records fetch error:", str(e))
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# GET ALL APPOINTMENTS FOR A USER
# -----------------------------------------------
@app.route('/appointments/user/<user_id>', methods=['GET'])
def get_user_appointments(user_id):
    try:
        appointments = supabase_admin.table('appointments').select('*').eq('owner_id', user_id).order('appointment_date', desc=True).execute().data or []
        pets = supabase_admin.table('pet_profile').select('*').eq('owner_id', user_id).execute().data or []
        branches = supabase_admin.table('branches').select('*').execute().data or []
        reschedule_requests = supabase_admin.table('reschedule_requests').select('*').order('created_at', desc=True).execute().data or []
        medical_information_rows = supabase_admin.table('medical_information').select('*').execute().data or []

        pets_by_id = {str(pet.get('pet_id')): pet for pet in pets}
        branches_by_id = {str(branch.get('branch_id') or branch.get('id')): branch for branch in branches}
        medical_information_by_target = {}
        latest_request_by_target = {}

        for medical_row in medical_information_rows:
            normalized = normalize_medical_information_record(medical_row)
            if not normalized:
                continue
            key = f"{normalized.get('record_type')}-{normalized.get('target_id')}"
            if normalized.get('target_id') not in (None, "") and key not in medical_information_by_target:
                medical_information_by_target[key] = normalized

        for request_item in reschedule_requests:
            key = f"{request_item.get('target_type')}-{request_item.get('target_id')}"
            if key not in latest_request_by_target:
                latest_request_by_target[key] = request_item

        formatted = []
        for appointment in appointments:
            pet = pets_by_id.get(str(appointment.get('pet_id')), {})
            branch = branches_by_id.get(str(appointment.get('branch_id')), {})
            medical_information = medical_information_by_target.get(f"appointment-{appointment.get('appointment_id')}")
            latest_request = latest_request_by_target.get(f"appointment-{appointment.get('appointment_id')}")
            branch_name = branch.get('branch_name') or branch.get('name') or 'Not specified'

            formatted.append({
                **appointment,
                "id": appointment.get('appointment_id'),
                "recordType": "appointment",
                "pet_profile": pet,
                "pet_name": pet.get('pet_name') or appointment.get('pet_name'),
                "pet_species": pet.get('pet_species'),
                "pet_breed": pet.get('pet_breed'),
                "pet_gender": pet.get('pet_gender'),
                "pet_photo_url": pet.get('pet_photo_url'),
                "date_display": str(appointment.get('appointment_date') or ''),
                "time_display": format_display_time(appointment.get('appointment_time')),
                "time_range_display": format_display_time_range(appointment.get('appointment_time')),
                "branch": branch_name,
                "branchName": branch_name,
                "medicalInformation": medical_information,
                "latestRescheduleRequest": latest_request,
            })

        return jsonify({"appointments": formatted}), 200
    except Exception as e:
        print("Fetch appointments error:", str(e))
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# GET ALL BRANCHES
# -----------------------------------------------
@app.route('/branches', methods=['GET'])
def get_branches():
    try:
        res = execute_with_retry(
            lambda: supabase.table('branches').select('*').order('branch_id').execute(),
            context='Fetch branches'
        )
        return jsonify({'branches': res.data}), 200

    except Exception as e:
        print("Fetch branches error:", str(e))
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# ADMIN COMPATIBILITY ROUTES
# -----------------------------------------------
@app.route('/accounts', methods=['GET'])
@app.route('/api/doctors', methods=['GET'])
def get_accounts():
    try:
        actor_id = request.args.get("userId") or request.args.get("user_id") or request.args.get("adminUserId")
        branch_scope = None
        if actor_id:
            branch_scope, branch_error = get_actor_branch_scope(actor_id)
            if branch_error:
                return jsonify({"error": branch_error}), 400

        branches = execute_with_retry(
            lambda: supabase_admin.table('branches').select('*').execute(),
            context='Fetch employee account branches'
        ).data or []
        branch_names_by_id = {
            str(branch.get('branch_id') or branch.get('id')): branch.get('branch_name') or branch.get('name') or ''
            for branch in branches
        }
        res = execute_with_retry(
            lambda: apply_branch_scope_to_query(
                supabase_admin.table('employee_accounts').select('*'),
                branch_scope,
            ).execute(),
            context='Fetch employee accounts'
        )
        accounts = [
            normalize_employee_admin_account({
                **item,
                "branch_name": branch_names_by_id.get(str(item.get('branch_id') or '')),
            })
            for item in (res.data or [])
        ]
        if request.path == '/api/doctors':
            veterinarian_roles = {'veterinarian', 'vet'}
            accounts = [
                account for account in accounts
                if (account.get('role') or '').strip().lower() in veterinarian_roles
            ]
        return jsonify(accounts), 200
    except Exception as e:
        print("Fetch accounts error:", str(e))
        return jsonify({"error": str(e)}), 400


def normalize_branch_text(value):
    return re.sub(r'\s+', ' ', str(value or '').strip().lower())


def is_both_branches_label(value):
    normalized = normalize_branch_text(value)
    return normalized in {'both branches', 'all branches', 'main branch'} or 'both' in normalized


def parse_branch_id(value):
    if value in (None, ''):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def get_branch_by_id(branch_id):
    normalized_branch_id = parse_branch_id(branch_id)
    if normalized_branch_id is None:
        return None
    try:
        return supabase_admin.table('branches').select('*').eq('branch_id', normalized_branch_id).single().execute().data
    except Exception:
        return None


def get_account_branch_context(account_id):
    if not account_id:
        return None, "userId is required to validate branch permissions"

    actor = get_single_row('employee_accounts', 'id', account_id)
    if not actor:
        return None, "Current admin account was not found"

    branch = get_branch_by_id(actor.get('branch_id'))
    branch_name = (branch or {}).get('branch_name') or (branch or {}).get('name') or actor.get('branch_name')
    return {
        "account": actor,
        "branch_id": parse_branch_id(actor.get('branch_id')),
        "branch_name": branch_name,
        "is_both_branches": is_both_branches_label(branch_name),
    }, None


def validate_employee_branch_assignment(actor_id, target_branch_id, target_role):
    branch_id = parse_branch_id(target_branch_id)
    if branch_id is None:
        return None, "Branch is required"

    target_branch = get_branch_by_id(branch_id)
    if not target_branch:
        return None, "Selected branch was not found"

    actor_context, actor_error = get_account_branch_context(actor_id)
    if actor_error:
        return None, actor_error

    target_branch_name = target_branch.get('branch_name') or target_branch.get('name') or ''
    target_is_both = is_both_branches_label(target_branch_name)
    actor_can_manage_all = actor_context.get('is_both_branches')

    if target_is_both and not actor_can_manage_all:
        return None, "Only a Both Branches admin can assign Both Branches accounts"

    if not actor_can_manage_all and actor_context.get('branch_id') != branch_id:
        return None, "You can only assign employees to your own branch"

    if target_is_both and normalize_branch_text(target_role) != 'admin':
        return None, "Both Branches can only be assigned to Admin accounts"

    return {
        "branch_id": branch_id,
        "branch_name": target_branch_name,
    }, None


def get_actor_branch_scope(actor_id):
    actor_context, actor_error = get_account_branch_context(actor_id)
    if actor_error:
        return None, actor_error
    if actor_context.get("is_both_branches"):
        return {"can_access_all": True, "branch_id": None}, None
    branch_id = actor_context.get("branch_id")
    if branch_id is None:
        return None, "Current admin account does not have a branch assigned"
    return {"can_access_all": False, "branch_id": branch_id}, None


def apply_branch_scope_to_query(query, scope, column="branch_id"):
    if not scope or scope.get("can_access_all"):
        return query
    return query.eq(column, scope.get("branch_id"))


def get_actor_id_from_request(data=None):
    data = data or {}
    return (
        request.args.get("userId")
        or request.args.get("user_id")
        or request.args.get("adminUserId")
        or data.get("userId")
        or data.get("user_id")
        or data.get("adminUserId")
        or data.get("processedBy")
        or data.get("processed_by")
        or data.get("created_by")
        or data.get("updated_by")
        or data.get("createdBy")
        or data.get("updatedBy")
        or data.get("handledByUserId")
        or data.get("handled_by_user_id")
    )


def require_actor_branch_scope(data=None):
    actor_id = get_actor_id_from_request(data)
    if not actor_id:
        return None, "userId is required to validate branch access"
    return get_actor_branch_scope(actor_id)


def validate_branch_scope_access(scope, branch_id):
    normalized_branch_id = parse_branch_id(branch_id)
    if normalized_branch_id is None:
        return None, "Branch is required"
    if scope and not scope.get("can_access_all") and scope.get("branch_id") != normalized_branch_id:
        return None, "You can only access records from your assigned branch"
    return normalized_branch_id, None


def resolve_emr_visit_branch_id(source_type=None, source_id=None, branch_scope=None, fallback_branch_id=None):
    normalized_source_type = str(source_type or "").strip().lower()
    if normalized_source_type == "appointment" and source_id not in (None, ""):
        appointment = get_single_row("appointments", "appointment_id", source_id)
        if appointment and appointment.get("branch_id") not in (None, ""):
            return parse_branch_id(appointment.get("branch_id"))
    if normalized_source_type == "walkin" and source_id not in (None, ""):
        walkin = get_single_row("walkin_appointments", "walkin_id", source_id)
        if walkin and walkin.get("branch_id") not in (None, ""):
            return parse_branch_id(walkin.get("branch_id"))

    fallback = parse_branch_id(fallback_branch_id)
    if fallback is not None:
        return fallback
    if branch_scope and not branch_scope.get("can_access_all"):
        return parse_branch_id(branch_scope.get("branch_id"))
    return None


@app.route('/api/admin/appointment-search-data', methods=['GET'])
def get_admin_appointment_search_data():
    try:
        pets = execute_with_retry(
            lambda: supabase_admin.table('pet_profile').select('*').execute(),
            context='Fetch admin appointment search pets'
        ).data or []
        patients = execute_with_retry(
            lambda: supabase_admin.table('patient_account').select('*').execute(),
            context='Fetch admin appointment search patients'
        ).data or []
        return jsonify({
            "pets": pets,
            "patients": patients,
        }), 200
    except Exception as e:
        print("Appointment search data error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/accounts', methods=['POST'])
def create_employee_account():
    data = request.get_json() or {}

    first_name = (data.get('first_name') or '').strip()
    last_name = (data.get('last_name') or '').strip()
    contact_number = (data.get('contact_number') or '').strip()
    email = (data.get('email') or '').strip().lower()
    role = (data.get('role') or 'Admin').strip()
    status_value = (data.get('status') or 'Active').strip().lower()
    employee_image = data.get('employee_image')
    actor_id = data.get('created_by') or data.get('userId') or data.get('user_id')
    branch_assignment, branch_error = validate_employee_branch_assignment(actor_id, data.get('branch_id'), role)
    if branch_error:
        return jsonify({"error": branch_error}), 400

    if not all([first_name, last_name, contact_number, email]):
        return jsonify({"error": "first_name, last_name, contact_number, and email are required"}), 400

    try:
        existing_email = supabase_admin.table('employee_accounts').select('id').eq('email', email).execute()
        if existing_email.data:
            return jsonify({"error": "An employee account with this email already exists."}), 400

        temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
        auth_user = supabase_admin.auth.admin.create_user({
            "email": email,
            "password": temp_password,
            "email_confirm": True,
        })

        user = getattr(auth_user, 'user', None)
        if not user:
            return jsonify({"error": "Failed to create auth user"}), 400

        insert_response = supabase_admin.table('employee_accounts').insert({
            "id": user.id,
            "username": None,
            "first_name": first_name,
            "last_name": last_name,
            "contact_number": contact_number,
            "email": email,
            "role": role,
            "status": 'disabled' if status_value in ('disabled', 'inactive') else 'active',
            "employee_image": employee_image,
            "is_initial_login": True,
            "branch_id": branch_assignment.get('branch_id'),
        }).execute()

        created = insert_response.data[0] if insert_response.data else None
        employee_name = f"{first_name} {last_name}".strip()
        setup_token, _ = issue_employee_setup_token(user.id, email, created_by=actor_id)
        email_sent = False
        try:
            send_employee_setup_email(email, employee_name, build_employee_setup_link(setup_token))
            email_sent = True
        except Exception as mail_error:
            print("Employee setup email error:", str(mail_error))

        safe_create_account_admin_notification(
            account_record=created or {
                "id": user.id,
                "username": '',
                "first_name": first_name,
                "last_name": last_name,
                "contact_number": contact_number,
                "email": email,
                "role": role,
                "status": status_value,
                "employee_image": employee_image,
                "is_initial_login": True,
                "branch_id": branch_assignment.get('branch_id'),
                "branch_name": branch_assignment.get('branch_name'),
            },
            account_type='employee',
            event_type='employee_account_created',
            title='Employee account created',
            action_text='was created',
            severity='success',
            link='/admin/dashboard',
            actor_id=actor_id,
            metadata={"setupEmailSent": email_sent},
        )

        return jsonify({
            "message": "Employee account created successfully",
            "account": normalize_employee_admin_account(created or {
                "id": user.id,
                "username": '',
                "first_name": first_name,
                "last_name": last_name,
                "contact_number": contact_number,
                "email": email,
                "role": role,
                "status": status_value,
                "employee_image": employee_image,
                "is_initial_login": True,
                "branch_id": branch_assignment.get('branch_id'),
                "branch_name": branch_assignment.get('branch_name'),
            }),
            "setup_email_sent": email_sent,
        }), 200
    except Exception as e:
        print("Create employee account error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/accounts/<account_id>', methods=['PUT'])
def update_employee_account(account_id):
    data = request.get_json() or {}

    try:
        existing = get_single_row('employee_accounts', 'id', account_id)
        if not existing:
            return jsonify({"error": "Employee account not found"}), 404

        update_data = {}
        auth_updates = {}
        actor_id = data.get('updated_by') or data.get('userId') or data.get('user_id')

        if 'username' in data:
            update_data['username'] = data.get('username')
        if 'first_name' in data:
            update_data['first_name'] = data.get('first_name')
        if 'last_name' in data:
            update_data['last_name'] = data.get('last_name')
        if 'contact_number' in data:
            update_data['contact_number'] = data.get('contact_number')
        if 'email' in data:
            update_data['email'] = data.get('email')
            auth_updates['email'] = data.get('email')
        if 'role' in data:
            update_data['role'] = data.get('role')
        if 'status' in data:
            raw_status = (data.get('status') or '').strip().lower()
            update_data['status'] = 'disabled' if raw_status in ('disabled', 'inactive') else 'active'
        if 'employee_image' in data:
            update_data['employee_image'] = data.get('employee_image')
        if 'branch_id' in data or 'role' in data:
            target_role = update_data.get('role') or existing.get('role') or 'Admin'
            target_branch_id = data.get('branch_id') if 'branch_id' in data else existing.get('branch_id')
            branch_assignment, branch_error = validate_employee_branch_assignment(actor_id, target_branch_id, target_role)
            if branch_error:
                return jsonify({"error": branch_error}), 400
            if 'branch_id' in data:
                update_data['branch_id'] = branch_assignment.get('branch_id')

        if not update_data:
            return jsonify({"error": "No valid fields to update"}), 400

        if auth_updates:
            supabase_admin.auth.admin.update_user_by_id(account_id, auth_updates)

        response = supabase_admin.table('employee_accounts') \
            .update(update_data) \
            .eq('id', account_id) \
            .execute()

        updated = response.data[0] if response.data else get_single_row('employee_accounts', 'id', account_id)
        previous_status = (existing.get('status') or 'active').strip().lower()
        next_status = ((updated or {}).get('status') or update_data.get('status') or previous_status).strip().lower()
        status_changed = 'status' in update_data and previous_status != next_status
        if status_changed:
            active = next_status == 'active'
            safe_create_account_admin_notification(
                account_record=updated or {**existing, **update_data},
                account_type='employee',
                event_type='employee_account_activated' if active else 'employee_account_disabled',
                title='Employee account activated' if active else 'Employee account disabled',
                action_text='was activated' if active else 'was disabled',
                severity='success' if active else 'warning',
                link='/admin/dashboard',
                actor_id=actor_id,
                metadata={"changedFields": list(update_data.keys())},
            )
        else:
            safe_create_account_admin_notification(
                account_record=updated or {**existing, **update_data},
                account_type='employee',
                event_type='employee_account_updated',
                title='Employee account updated',
                action_text='was updated',
                severity='info',
                link='/admin/dashboard',
                actor_id=actor_id,
                metadata={"changedFields": list(update_data.keys())},
            )
        return jsonify({
            "message": "Employee account updated successfully",
            "account": normalize_employee_admin_account(updated or existing)
        }), 200
    except Exception as e:
        print("Update employee account error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/accounts/<account_id>/send-setup-link', methods=['POST'])
def resend_employee_setup_link(account_id):
    data = request.get_json() or {}
    try:
        employee = get_single_row('employee_accounts', 'id', account_id)
        if not employee:
            return jsonify({"error": "Employee account not found"}), 404

        raw_token, token_record = issue_employee_setup_token(
            employee.get('id'),
            employee.get('email'),
            created_by=data.get('created_by') or data.get('userId')
        )
        send_employee_setup_email(
            employee.get('email'),
            f"{employee.get('first_name') or ''} {employee.get('last_name') or ''}".strip(),
            build_employee_setup_link(raw_token)
        )

        safe_create_account_admin_notification(
            account_record=employee,
            account_type='employee',
            event_type='employee_setup_link_sent',
            title='Employee setup link sent',
            action_text='was sent a setup link',
            severity='info',
            link='/admin/dashboard',
            actor_id=data.get('created_by') or data.get('userId') or data.get('user_id'),
            metadata={"setupTokenId": token_record.get('setup_token_id')},
        )

        return jsonify({
            "message": "Employee setup link sent successfully",
            "token": normalize_employee_setup_token(token_record),
        }), 200
    except Exception as e:
        print("Resend employee setup link error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/employee-setup/validate', methods=['GET'])
def validate_employee_setup():
    raw_token = (request.args.get('token') or '').strip()
    try:
        token_record, employee = validate_employee_setup_token(raw_token)
        return jsonify({
            "message": "Setup token is valid",
            "token": normalize_employee_setup_token(token_record),
            "employee": {
                "id": employee.get('id'),
                "email": employee.get('email'),
                "first_name": employee.get('first_name'),
                "last_name": employee.get('last_name'),
                "username": employee.get('username'),
                "is_initial_login": bool(employee.get('is_initial_login')),
            }
        }), 200
    except Exception as e:
        print("Validate employee setup token error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/employee-setup/complete', methods=['POST'])
def complete_employee_setup():
    data = request.get_json() or {}
    raw_token = (data.get('token') or '').strip()
    username = (data.get('username') or '').strip()
    password = data.get('password')

    if not raw_token or not username or not password:
        return jsonify({"error": "token, username, and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long"}), 400

    try:
        token_record, employee = validate_employee_setup_token(raw_token)

        if is_username_taken(username, exclude_employee_id=employee.get('id')):
            return jsonify({"error": "This username is already taken"}), 400

        supabase_admin.auth.admin.update_user_by_id(employee.get('id'), {"password": password})
        supabase_admin.table('employee_accounts') \
            .update({
                'username': username,
                'is_initial_login': False,
            }) \
            .eq('id', employee.get('id')) \
            .execute()

        supabase_admin.table('employee_setup_tokens') \
            .update({'used_at': datetime.utcnow().isoformat()}) \
            .eq('setup_token_id', token_record.get('setup_token_id')) \
            .execute()

        updated = get_single_row('employee_accounts', 'id', employee.get('id')) or employee
        return jsonify({
            "message": "Employee credentials set successfully",
            "employee": normalize_employee_admin_account(updated),
        }), 200
    except Exception as e:
        print("Complete employee setup error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/patients', methods=['GET'])
def get_patients():
    try:
        res = supabase_admin.table('patient_account').select('*').execute()
        patients = [normalize_patient_admin_account(item) for item in (res.data or [])]
        return jsonify(patients), 200
    except Exception as e:
        print("Fetch patients error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/patients/<account_id>', methods=['PUT'])
def update_patient_account(account_id):
    data = request.get_json() or {}

    try:
        existing = get_single_row('patient_account', 'id', account_id)
        if not existing:
            return jsonify({"error": "Patient account not found"}), 404

        full_name = data.get('fullName') or data.get('fullname')
        first_name = None
        last_name = None
        if full_name is not None:
            first_name, last_name = split_full_name(full_name)

        update_data = {}
        if 'username' in data:
            update_data['username'] = data.get('username')
        if full_name is not None:
            update_data['firstName'] = first_name
            update_data['lastName'] = last_name
        if 'contactNumber' in data or 'contactnumber' in data:
            update_data['contact_number'] = data.get('contactNumber') or data.get('contactnumber')
        if 'email' in data:
            update_data['email'] = data.get('email')
        if 'userImage' in data or 'userimage' in data:
            update_data['userImage'] = data.get('userImage') or data.get('userimage')
        if 'status' in data:
            raw_status = (data.get('status') or '').strip().lower()
            update_data['status'] = 'disabled' if raw_status in ('disabled', 'inactive') else 'active'

        if not update_data:
            return jsonify({"error": "No valid fields to update"}), 400

        response = supabase_admin.table('patient_account') \
            .update(update_data) \
            .eq('id', account_id) \
            .execute()

        updated = response.data[0] if response.data else get_single_row('patient_account', 'id', account_id)
        previous_status = (existing.get('status') or 'active').strip().lower()
        next_status = ((updated or {}).get('status') or update_data.get('status') or previous_status).strip().lower()
        status_changed = 'status' in update_data and previous_status != next_status
        if status_changed:
            active = next_status == 'active'
            safe_create_account_admin_notification(
                account_record=updated or {**existing, **update_data},
                account_type='patient',
                event_type='patient_account_activated' if active else 'patient_account_disabled',
                title='Patient account activated' if active else 'Patient account disabled',
                action_text='was activated' if active else 'was disabled',
                severity='success' if active else 'warning',
                link='/admin/users',
                actor_id=data.get('updated_by') or data.get('userId') or data.get('user_id'),
                metadata={"changedFields": list(update_data.keys())},
            )
        else:
            safe_create_account_admin_notification(
                account_record=updated or {**existing, **update_data},
                account_type='patient',
                event_type='patient_account_updated',
                title='Patient account updated',
                action_text='was updated',
                severity='info',
                link='/admin/users',
                actor_id=data.get('updated_by') or data.get('userId') or data.get('user_id'),
                metadata={"changedFields": list(update_data.keys())},
            )
        return jsonify({
            "message": "Patient updated successfully",
            "account": normalize_patient_admin_account(updated or existing)
        }), 200
    except Exception as e:
        print("Update patient account error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/patient-register', methods=['POST'])
def patient_register():
    data = request.get_json() or {}

    full_name = (data.get('fullName') or data.get('fullname') or '').strip()
    email = (data.get('email') or '').strip().lower()
    contact_number = (data.get('contactNumber') or data.get('contactnumber') or '').strip()
    user_image = data.get('userImage') or data.get('userimage')
    status_value = (data.get('status') or 'active').strip().lower()

    if not full_name or not email:
        return jsonify({"error": "fullName and email are required"}), 400

    try:
        existing_email = supabase_admin.table('patient_account').select('id').eq('email', email).execute()
        if existing_email.data:
            return jsonify({"error": "An account with this email already exists."}), 400

        first_name, last_name = split_full_name(full_name)
        username_seed = (data.get('username') or email.split('@')[0] or 'patient').strip()
        username = username_seed
        suffix = 1
        while get_single_row('patient_account', 'username', username):
            username = f"{username_seed}{suffix}"
            suffix += 1

        temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
        auth_user = supabase_admin.auth.admin.create_user({
            "email": email,
            "password": temp_password,
            "email_confirm": True,
        })

        user = getattr(auth_user, 'user', None)
        if not user:
            return jsonify({"error": "Failed to create auth user"}), 400

        insert_response = supabase_admin.table('patient_account').insert({
            "id": user.id,
            "email": email,
            "username": username,
            "firstName": first_name,
            "lastName": last_name,
            "contact_number": contact_number,
            "role": "patient",
            "status": 'disabled' if status_value in ('disabled', 'inactive') else 'active',
            "userImage": user_image,
        }).execute()

        created = insert_response.data[0] if insert_response.data else None
        safe_create_account_admin_notification(
            account_record=created or {
                "id": user.id,
                "email": email,
                "username": username,
                "firstName": first_name,
                "lastName": last_name,
                "contact_number": contact_number,
                "role": "patient",
                "status": status_value,
                "userImage": user_image,
            },
            account_type='patient',
            event_type='patient_account_created',
            title='Patient account created',
            action_text='was created',
            severity='success',
            link='/admin/users',
            actor_id=data.get('created_by') or data.get('userId') or data.get('user_id'),
        )
        return jsonify({
            "message": "Patient account created successfully",
            "account": normalize_patient_admin_account(created or {
                "id": user.id,
                "email": email,
                "username": username,
                "firstName": first_name,
                "lastName": last_name,
                "contact_number": contact_number,
                "status": status_value,
                "userImage": user_image,
            })
        }), 200
    except Exception as e:
        print("Patient register error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/logout', methods=['POST'])
def logout():
    return jsonify({"message": "Logout acknowledged"}), 200


@app.route('/api/billing/services', methods=['GET'])
def get_billing_services():
    try:
        return jsonify({"services": build_billing_service_lookups()["services"]}), 200
    except Exception as e:
        print("Fetch billing services error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/billing/products', methods=['GET'])
def get_billing_products():
    try:
        branch_scope, branch_error = require_actor_branch_scope()
        if branch_error:
            return jsonify({"error": branch_error}), 400
        return jsonify({"products": build_billing_product_catalog(branch_scope=branch_scope)}), 200
    except Exception as e:
        print("Fetch billing products error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/billing/source-records', methods=['GET'])
def get_billing_source_records():
    try:
        actor_id = get_actor_id_from_request()
        if not actor_id:
            return jsonify({"error": "userId is required to load branch-scoped billing records"}), 400
        return jsonify(build_billing_source_records(actor_id=actor_id)), 200
    except Exception as e:
        print("Fetch billing source records error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/billing/invoices', methods=['GET'])
def get_billing_invoices():
    try:
        branch_scope, branch_error = require_actor_branch_scope()
        if branch_error:
            return jsonify({"error": branch_error}), 400
        invoice_response = execute_with_retry(
            lambda: apply_branch_scope_to_query(
                supabase_admin.table("billing_invoices").select("*"),
                branch_scope,
            ).order("invoice_date", desc=True).order("invoice_time", desc=True).execute(),
            context="Fetch billing invoices"
        )
        invoices = invoice_response.data or []
    except Exception as e:
        if is_missing_relation_error(e, "billing_invoices"):
            return jsonify({"invoices": [], "warning": BILLING_TABLES_SETUP_MESSAGE}), 200
        print("Fetch billing invoices error:", str(e))
        return jsonify({"error": str(e)}), 400

    invoice_ids = [invoice.get("billing_invoice_id") for invoice in invoices if invoice.get("billing_invoice_id") not in (None, "")]
    service_items_by_invoice = {}
    product_items_by_invoice = {}
    payments_by_invoice = {}
    payment_handler_lookup = {}

    if invoice_ids:
        try:
            service_response = execute_with_retry(
                lambda: supabase_admin.table("billing_invoice_service_items").select("*").in_("billing_invoice_id", invoice_ids).order("billing_invoice_id").order("sort_order").execute(),
                context="Fetch billing invoice service items"
            )
            for record in (service_response.data or []):
                service_items_by_invoice.setdefault(record.get("billing_invoice_id"), []).append(record)

            product_response = execute_with_retry(
                lambda: supabase_admin.table("billing_invoice_product_items").select("*").in_("billing_invoice_id", invoice_ids).order("billing_invoice_id").order("sort_order").execute(),
                context="Fetch billing invoice product items"
            )
            for record in (product_response.data or []):
                product_items_by_invoice.setdefault(record.get("billing_invoice_id"), []).append(record)

            payment_response = execute_with_retry(
                lambda: supabase_admin.table("billing_invoice_payments").select("*").in_("billing_invoice_id", invoice_ids).order("billing_invoice_id").order("payment_date", desc=True).order("payment_time", desc=True).execute(),
                context="Fetch billing invoice payments"
            )
            payment_records = payment_response.data or []
            payment_handler_lookup = build_billing_payment_handler_lookup(payment_records)
            for record in payment_records:
                payments_by_invoice.setdefault(record.get("billing_invoice_id"), []).append(record)
        except Exception as e:
            if (
                is_missing_relation_error(e, "billing_invoice_service_items")
                or is_missing_relation_error(e, "billing_invoice_product_items")
                or is_missing_relation_error(e, "billing_invoice_payments")
            ):
                return jsonify({"invoices": [], "warning": BILLING_TABLES_SETUP_MESSAGE}), 200
            print("Fetch billing invoice line items error:", str(e))
            return jsonify({"error": str(e)}), 400

    normalized_invoices = [
        normalize_billing_invoice_record(
            invoice,
            service_items=service_items_by_invoice.get(invoice.get("billing_invoice_id"), []),
            product_items=product_items_by_invoice.get(invoice.get("billing_invoice_id"), []),
            payment_history=payments_by_invoice.get(invoice.get("billing_invoice_id"), []),
            payment_handler_lookup=payment_handler_lookup,
        )
        for invoice in invoices
    ]
    return jsonify({"invoices": normalized_invoices}), 200


@app.route('/api/billing/invoices', methods=['POST'])
def create_billing_invoice():
    data = request.get_json() or {}

    try:
        branch_scope, branch_error = require_actor_branch_scope(data)
        if branch_error:
            return jsonify({"error": branch_error}), 400

        invoice_type = str(data.get("invoiceType") or data.get("invoice_type") or "").strip().lower()
        if invoice_type not in {"appointment", "walkin"}:
            raise ValueError("invoiceType is invalid")

        source_record_type_raw = data.get("sourceRecordType") or data.get("source_record_type")
        if source_record_type_raw in (None, ""):
            raise ValueError("sourceRecordType is required")

        source_record_type = str(source_record_type_raw).strip().lower()
        if source_record_type not in {"appointment", "walkin", "visit"}:
            raise ValueError("sourceRecordType is invalid")

        source_record_id = coerce_int(
            data.get("sourceRecordId", data.get("source_record_id")),
            "sourceRecordId",
            minimum=1,
            allow_none=True,
        )
        if (invoice_type == "appointment" or source_record_type in {"appointment", "visit"}) and source_record_id is None:
            raise ValueError("sourceRecordId is required for appointment invoices")

        customer_name = str(data.get("customerName") or data.get("customer_name") or "").strip()
        pet_name = str(data.get("petName") or data.get("pet_name") or "").strip()
        if not customer_name:
            raise ValueError("customerName is required")
        if not pet_name:
            raise ValueError("petName is required")

        customer_email = str(data.get("customerEmail") or data.get("customer_email") or "").strip()
        customer_phone = str(data.get("customerPhone") or data.get("customer_phone") or "").strip()
        payment_method = str(data.get("paymentMethod") or data.get("payment_method") or "cash").strip().lower()
        if payment_method not in {"cash", "card", "gcash", "bank", "installment"}:
            raise ValueError("paymentMethod is invalid")
        initial_payment_method = str(
            data.get("initialPaymentMethod")
            or data.get("initial_payment_method")
            or ("cash" if payment_method == "installment" else payment_method)
        ).strip().lower()
        if initial_payment_method not in {"cash", "card", "gcash", "bank"}:
            raise ValueError("initialPaymentMethod is invalid")
        payment_actor_id = resolve_billing_payment_actor_id(
            data.get("handledByUserId")
            or data.get("handled_by_user_id")
            or data.get("createdBy")
            or data.get("created_by")
            or data.get("userId")
            or data.get("user_id")
        )

        discount_type = str(data.get("discountType") or data.get("discount_type") or "none").strip().lower()
        if discount_type not in {"none", "senior", "pwd", "promo", "custom"}:
            raise ValueError("discountType is invalid")

        discount_value = None
        discount_is_percentage = False
        if discount_type == "custom":
            discount_value = coerce_number(
                data.get("discountValue", data.get("discount_value", 0)),
                "discountValue",
                minimum=0,
                default=0,
            )
            discount_is_percentage = parse_bool(data.get("discountIsPercentage", data.get("discount_is_percentage", False)))

        branch_id = coerce_int(
            data.get("branchId", data.get("branch_id")),
            "branchId",
            minimum=1,
            allow_none=True,
        )
        if branch_id is None and branch_scope and not branch_scope.get("can_access_all"):
            branch_id = branch_scope.get("branch_id")
        branch_id, branch_access_error = validate_branch_scope_access(branch_scope, branch_id)
        if branch_access_error:
            return jsonify({"error": branch_access_error}), 403

        existing_invoice = get_active_billing_invoice_for_source(source_record_type, source_record_id)
        if existing_invoice:
            normalized_existing_invoice = fetch_billing_invoice_with_details(existing_invoice.get("billing_invoice_id"))
            return jsonify({
                "error": "An active invoice already exists for this billing source.",
                "invoice": normalized_existing_invoice,
            }), 409

        service_lookups = build_billing_service_lookups()
        product_lookup = build_billing_product_lookup(branch_scope=branch_scope)

        raw_service_items = data.get("items", data.get("services")) or []
        raw_product_items = data.get("products") or []
        if not isinstance(raw_service_items, list):
            raise ValueError("items must be a list")
        if not isinstance(raw_product_items, list):
            raise ValueError("products must be a list")

        service_payloads = []
        for index, item in enumerate(raw_service_items, start=1):
            if not isinstance(item, dict):
                continue

            service_name = str(item.get("name") or "").strip()
            if not service_name:
                continue

            quantity = coerce_int(item.get("quantity", 1), "service quantity", minimum=1, default=1)
            matched_service = resolve_billing_service_match(
                raw_name=service_name,
                service_id=item.get("serviceId"),
                service_code=item.get("serviceCode"),
                lookups=service_lookups,
            )
            unit_price = coerce_number(
                item.get("unitPrice", item.get("unit_price", (matched_service or {}).get("price", 0))),
                "service unitPrice",
                minimum=0,
                default=0,
            )

            service_payloads.append({
                "billing_service_id": (matched_service or {}).get("serviceId"),
                "item_name": (matched_service or {}).get("name") or service_name,
                "item_description": str(item.get("description") or (matched_service or {}).get("description") or "").strip(),
                "item_category": str(item.get("category") or (matched_service or {}).get("category") or "Other").strip(),
                "item_subcategory": str(item.get("subcategory") or (matched_service or {}).get("subcategory") or "").strip(),
                "quantity": quantity,
                "unit_price": unit_price,
                "line_total": round(quantity * unit_price, 2),
                "sort_order": coerce_int(item.get("sortOrder", item.get("sort_order", index)), "service sortOrder", minimum=1, default=index),
            })

        product_payloads = []
        for index, item in enumerate(raw_product_items, start=1):
            if not isinstance(item, dict):
                continue

            product_id_raw = item.get("inventoryItemId", item.get("inventory_item_id", item.get("id")))
            matched_product = product_lookup.get(str(product_id_raw)) if product_id_raw not in (None, "") else None
            if product_id_raw not in (None, "") and not matched_product:
                raise ValueError("Selected product is not available for your branch")

            product_name = str(item.get("name") or (matched_product or {}).get("name") or "").strip()
            if not product_name:
                continue

            quantity = coerce_int(item.get("quantity", 1), "product quantity", minimum=1, default=1)
            unit_price = coerce_number(
                item.get("unitPrice", item.get("unit_price", (matched_product or {}).get("price", 0))),
                "product unitPrice",
                minimum=0,
                default=0,
            )

            inventory_item_id = None
            if product_id_raw not in (None, ""):
                try:
                    inventory_item_id = coerce_int(product_id_raw, "inventoryItemId", minimum=1, allow_none=True)
                except ValueError:
                    inventory_item_id = None

            product_payloads.append({
                "inventory_item_id": inventory_item_id,
                "item_name": product_name,
                "sku": str(item.get("sku") or (matched_product or {}).get("sku") or "").strip(),
                "item_description": str(item.get("description") or (matched_product or {}).get("description") or "").strip(),
                "item_category": str(item.get("category") or (matched_product or {}).get("category") or "other").strip().lower(),
                "quantity": quantity,
                "unit_price": unit_price,
                "line_total": round(quantity * unit_price, 2),
                "sort_order": coerce_int(item.get("sortOrder", item.get("sort_order", index)), "product sortOrder", minimum=1, default=index),
            })

        if not service_payloads and not product_payloads:
            raise ValueError("At least one service or product is required")

        subtotal = round(
            sum(item.get("line_total", 0) for item in service_payloads)
            + sum(item.get("line_total", 0) for item in product_payloads),
            2,
        )
        tax_amount = round(subtotal * BILLING_TAX_RATE, 2)
        discount_amount = calculate_billing_discount_amount(
            subtotal,
            discount_type,
            discount_value=discount_value,
            discount_is_percentage=discount_is_percentage,
        )
        total_amount = round(subtotal + tax_amount - discount_amount, 2)
        initial_payment_amount = 0.0
        if payment_method == "installment":
            initial_payment_amount = coerce_number(
                data.get("initialPaymentAmount", data.get("initial_payment_amount", 0)),
                "initialPaymentAmount",
                minimum=0,
                default=0,
            )
            if initial_payment_amount > total_amount:
                raise ValueError("initialPaymentAmount cannot be greater than the total amount")
        else:
            initial_payment_amount = total_amount

        payment_state = derive_billing_payment_state(total_amount, initial_payment_amount)
        manila_now = get_current_manila_datetime()

        invoice_payload = {
            "invoice_number": generate_billing_invoice_number(),
            "invoice_type": invoice_type,
            "source_record_type": source_record_type or invoice_type,
            "source_record_id": source_record_id,
            "branch_id": branch_id,
            "customer_name": customer_name,
            "customer_email": customer_email or None,
            "customer_phone": customer_phone or None,
            "pet_name": pet_name,
            "subtotal": subtotal,
            "tax_rate": BILLING_TAX_RATE,
            "tax_amount": tax_amount,
            "discount_amount": discount_amount,
            "discount_type": discount_type,
            "discount_value": discount_value,
            "discount_is_percentage": discount_is_percentage if discount_type == "custom" else None,
            "total_amount": total_amount,
            "amount_paid": payment_state["amount_paid"],
            "remaining_balance": payment_state["remaining_balance"],
            "payment_method": payment_method,
            "payment_status": payment_state["payment_status"],
            "status": "completed",
            "notes": str(data.get("notes") or "").strip() or None,
            "invoice_date": manila_now.date().isoformat(),
            "invoice_time": manila_now.strftime("%H:%M:%S"),
        }

        prepared_inventory_stock_out_payloads = []
        if payment_state["payment_status"] == "paid":
            prepared_inventory_stock_out_payloads = prepare_billing_invoice_inventory_stock_out_payloads(
                invoice_payload,
                product_items=product_payloads,
                processed_by=payment_actor_id,
            )

        invoice_response = supabase_admin.table("billing_invoices").insert(invoice_payload).execute()
        created_invoice = invoice_response.data[0] if invoice_response.data else get_single_row("billing_invoices", "invoice_number", invoice_payload["invoice_number"])
        if not created_invoice:
            raise ValueError("Invoice could not be created")

        invoice_id = created_invoice.get("billing_invoice_id")

        created_service_items = []
        if service_payloads:
            service_insert_payload = [
                {
                    **item,
                    "billing_invoice_id": invoice_id,
                }
                for item in service_payloads
            ]
            service_insert_response = supabase_admin.table("billing_invoice_service_items").insert(service_insert_payload).execute()
            created_service_items = service_insert_response.data or service_insert_payload

        created_product_items = []
        if product_payloads:
            product_insert_payload = [
                {
                    **item,
                    "billing_invoice_id": invoice_id,
                }
                for item in product_payloads
            ]
            product_insert_response = supabase_admin.table("billing_invoice_product_items").insert(product_insert_payload).execute()
            created_product_items = product_insert_response.data or product_insert_payload

        created_payment_history = []
        if payment_state["amount_paid"] > 0:
            payment_payload = {
                "billing_invoice_id": invoice_id,
                "payment_amount": payment_state["amount_paid"],
                "payment_method": initial_payment_method,
                "payment_date": manila_now.date().isoformat(),
                "payment_time": manila_now.strftime("%H:%M:%S"),
                "notes": "Initial payment" if payment_method == "installment" else "Invoice payment",
                "created_by": payment_actor_id,
            }
            payment_response = supabase_admin.table("billing_invoice_payments").insert(payment_payload).execute()
            created_payment_history = payment_response.data or [payment_payload]

        if payment_state["payment_status"] == "paid":
            sync_billing_invoice_inventory_stock_out(
                created_invoice,
                product_items=created_product_items,
                processed_by=payment_actor_id,
                prepared_payloads=prepared_inventory_stock_out_payloads,
            )

        normalized_invoice = fetch_billing_invoice_with_details(invoice_id)
        if not normalized_invoice:
            normalized_invoice = normalize_billing_invoice_record(
                created_invoice,
                service_items=created_service_items,
                product_items=created_product_items,
                payment_history=created_payment_history,
                payment_handler_lookup=build_billing_payment_handler_lookup(created_payment_history),
            )

        notification_invoice = get_single_row("billing_invoices", "billing_invoice_id", invoice_id) or created_invoice
        safe_create_billing_admin_notification(
            invoice_record=notification_invoice,
            event_type='invoice_created',
            title='Invoice created',
            action_text='was created',
            severity='success' if payment_state["payment_status"] == "paid" else 'info',
            link='/billing',
            metadata={
                "serviceItemCount": len(created_service_items),
                "productItemCount": len(created_product_items),
                "initialPaymentAmount": payment_state["amount_paid"],
            },
        )

        return jsonify({
            "message": "Invoice created successfully",
            "invoice": normalized_invoice,
        }), 201
    except Exception as e:
        if (
            is_missing_relation_error(e, "billing_invoices")
            or is_missing_relation_error(e, "billing_invoice_service_items")
            or is_missing_relation_error(e, "billing_invoice_product_items")
            or is_missing_relation_error(e, "billing_invoice_payments")
        ):
            return jsonify({"error": BILLING_TABLES_SETUP_MESSAGE}), 400
        print("Create billing invoice error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/billing/invoices/<int:invoice_id>/payments', methods=['POST'])
def record_billing_invoice_payment(invoice_id):
    data = request.get_json() or {}

    try:
        branch_scope, branch_error = require_actor_branch_scope(data)
        if branch_error:
            return jsonify({"error": branch_error}), 400

        invoice_record = get_single_row("billing_invoices", "billing_invoice_id", invoice_id)
        if not invoice_record:
            return jsonify({"error": "Invoice not found"}), 404
        _, branch_access_error = validate_branch_scope_access(branch_scope, invoice_record.get("branch_id"))
        if branch_access_error:
            return jsonify({"error": branch_access_error}), 403

        total_amount = round(float(invoice_record.get("total_amount") or 0), 2)
        current_amount_paid = round(float(invoice_record.get("amount_paid") or 0), 2)
        current_state = derive_billing_payment_state(total_amount, current_amount_paid)
        if current_state["remaining_balance"] <= 0:
            raise ValueError("This invoice is already fully paid")

        payment_amount = coerce_number(
            data.get("amount", data.get("payment_amount")),
            "amount",
            minimum=0.01,
        )
        if payment_amount > current_state["remaining_balance"]:
            raise ValueError("Payment amount cannot be greater than the remaining balance")

        payment_method = str(data.get("paymentMethod") or data.get("payment_method") or "").strip().lower()
        if payment_method not in {"cash", "card", "gcash", "bank"}:
            raise ValueError("paymentMethod is invalid")

        payment_note = str(data.get("notes") or "").strip()
        payment_actor_id = resolve_billing_payment_actor_id(
            data.get("handledByUserId")
            or data.get("handled_by_user_id")
            or data.get("createdBy")
            or data.get("created_by")
            or data.get("userId")
            or data.get("user_id")
        )
        manila_now = get_current_manila_datetime()
        updated_state = derive_billing_payment_state(total_amount, current_amount_paid + payment_amount)

        supabase_admin.table("billing_invoices").update({
            "amount_paid": updated_state["amount_paid"],
            "remaining_balance": updated_state["remaining_balance"],
            "payment_status": updated_state["payment_status"],
        }).eq("billing_invoice_id", invoice_id).execute()

        payment_payload = {
            "billing_invoice_id": invoice_id,
            "payment_amount": payment_amount,
            "payment_method": payment_method,
            "payment_date": manila_now.date().isoformat(),
            "payment_time": manila_now.strftime("%H:%M:%S"),
            "notes": payment_note or None,
            "created_by": payment_actor_id,
        }
        supabase_admin.table("billing_invoice_payments").insert(payment_payload).execute()

        if updated_state["payment_status"] == "paid":
            product_items = execute_with_retry(
                lambda: supabase_admin.table("billing_invoice_product_items").select("*").eq("billing_invoice_id", invoice_id).order("sort_order").execute(),
                context="Fetch billing invoice product items for stock sync",
            ).data or []
            sync_billing_invoice_inventory_stock_out(
                invoice_record,
                product_items=product_items,
                processed_by=payment_actor_id,
            )

        normalized_invoice = fetch_billing_invoice_with_details(invoice_id)
        if not normalized_invoice:
            raise ValueError("Updated invoice could not be loaded")

        notification_invoice = get_single_row("billing_invoices", "billing_invoice_id", invoice_id) or invoice_record
        safe_create_billing_admin_notification(
            invoice_record=notification_invoice,
            event_type='payment_recorded',
            title='Payment recorded',
            action_text=f"received a payment of PHP {payment_amount:,.2f}",
            severity='success' if updated_state["payment_status"] == "paid" else 'info',
            link='/billing',
            metadata={
                "paymentAmount": payment_amount,
                "paymentMethod": payment_method,
                "previousAmountPaid": current_amount_paid,
                "amountPaid": updated_state["amount_paid"],
                "remainingBalance": updated_state["remaining_balance"],
            },
        )

        return jsonify({
            "message": "Payment recorded successfully",
            "invoice": normalized_invoice,
        }), 200
    except Exception as e:
        if (
            is_missing_relation_error(e, "billing_invoices")
            or is_missing_relation_error(e, "billing_invoice_payments")
        ):
            return jsonify({"error": BILLING_TABLES_SETUP_MESSAGE}), 400
        print("Record billing payment error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/billing/invoices/bulk', methods=['DELETE'])
def delete_billing_invoices():
    data = request.get_json(silent=True) or {}

    try:
        branch_scope, branch_error = require_actor_branch_scope(data)
        if branch_error:
            return jsonify({"error": branch_error}), 400

        invoice_ids_raw = data.get("invoiceIds", data.get("invoice_ids")) or []
        if not isinstance(invoice_ids_raw, list) or not invoice_ids_raw:
            raise ValueError("invoiceIds is required")

        parsed_ids = [
            coerce_int(invoice_id, "invoiceId", minimum=1)
            for invoice_id in invoice_ids_raw
        ]

        existing_invoices = execute_with_retry(
            lambda: supabase_admin.table("billing_invoices").select("*").in_("billing_invoice_id", parsed_ids).execute(),
            context="Fetch billing invoices before delete"
        ).data or []

        for invoice in existing_invoices:
            _, branch_access_error = validate_branch_scope_access(branch_scope, invoice.get("branch_id"))
            if branch_access_error:
                return jsonify({"error": branch_access_error}), 403

        supabase_admin.table("billing_invoices").delete().in_("billing_invoice_id", parsed_ids).execute()

        for invoice in existing_invoices:
            safe_create_billing_admin_notification(
                invoice_record=invoice,
                event_type='invoice_deleted',
                title='Invoice deleted',
                action_text='was deleted',
                severity='warning',
                link='/billing',
            )

        return jsonify({"message": "Invoices deleted successfully"}), 200
    except Exception as e:
        if is_missing_relation_error(e, "billing_invoices"):
            return jsonify({"error": BILLING_TABLES_SETUP_MESSAGE}), 400
        print("Delete billing invoices error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/inventory/items', methods=['GET'])
def get_inventory_items():
    try:
        branch_id = request.args.get('branch_id', request.args.get('branchId'))
        branch_scope, branch_error = require_actor_branch_scope()
        if branch_error:
            return jsonify({"error": branch_error}), 400
        archived_raw = request.args.get('archived')
        category = (request.args.get('category') or '').strip()
        stock_status = (request.args.get('stock_status', request.args.get('stockStatus')) or '').strip()
        search = (request.args.get('search') or '').strip()

        query = supabase_admin.table('inventory_items').select('*')
        if branch_id:
            requested_branch_id, branch_access_error = validate_branch_scope_access(branch_scope, branch_id)
            if branch_access_error:
                return jsonify({"error": branch_access_error}), 403
            query = query.eq('branch_id', requested_branch_id)
        else:
            query = apply_branch_scope_to_query(query, branch_scope)
        if category:
            query = query.eq('category', category)
        if search:
            escaped = search.replace(',', '\\,')
            query = query.or_(f"item_name.ilike.%{escaped}%,item_code.ilike.%{escaped}%")

        response = query.order('item_name').execute()
        items = [normalize_inventory_item(item) for item in (response.data or [])]

        if archived_raw is None:
            items = [item for item in items if not item.get('isArchived')]
        else:
            archived_flag = parse_bool(archived_raw)
            items = [item for item in items if bool(item.get('isArchived')) == archived_flag]

        if stock_status:
            items = [item for item in items if item.get('stockStatus') == stock_status]

        return jsonify({'items': items}), 200
    except Exception as e:
        print("Fetch inventory items error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/inventory/items/<int:item_id>', methods=['GET'])
def get_inventory_item(item_id):
    try:
        branch_scope, branch_error = require_actor_branch_scope()
        if branch_error:
            return jsonify({"error": branch_error}), 400
        item, error_response = get_inventory_item_or_404(item_id)
        if error_response:
            return error_response
        _, branch_access_error = validate_branch_scope_access(branch_scope, item.get('branch_id'))
        if branch_access_error:
            return jsonify({"error": branch_access_error}), 403
        return jsonify({'item': normalize_inventory_item(item)}), 200
    except Exception as e:
        print("Fetch inventory item error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/inventory/items', methods=['POST'])
def create_inventory_item():
    data = request.get_json() or {}
    try:
        branch_scope, branch_error = require_actor_branch_scope(data)
        if branch_error:
            return jsonify({"error": branch_error}), 400
        payload = build_inventory_item_payload(data)
        _, branch_access_error = validate_branch_scope_access(branch_scope, payload.get('branch_id'))
        if branch_access_error:
            return jsonify({"error": branch_access_error}), 403
        ensure_inventory_item_is_unique(payload)
        response = supabase_admin.table('inventory_items').insert(payload).execute()
        created = response.data[0] if response.data else None
        item_record = created or payload
        notify_inventory_item_created(item_record, actor_id=payload.get('created_by') or payload.get('updated_by'))
        notify_inventory_stock_state_transition(
            {
                'inventory_item_id': item_record.get('inventory_item_id'),
                'branch_id': item_record.get('branch_id'),
                'item_code': item_record.get('item_code'),
                'item_name': item_record.get('item_name'),
                'current_stock': None,
                'critical_stock_level': item_record.get('critical_stock_level'),
            },
            item_record,
            actor_id=payload.get('created_by') or payload.get('updated_by'),
            source_event='inventory_item_created',
        )
        return jsonify({
            'message': 'Inventory item created successfully',
            'item': normalize_inventory_item(item_record)
        }), 201
    except Exception as e:
        print("Create inventory item error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/inventory/items/<int:item_id>', methods=['PUT'])
def update_inventory_item(item_id):
    data = request.get_json() or {}
    try:
        branch_scope, branch_error = require_actor_branch_scope(data)
        if branch_error:
            return jsonify({"error": branch_error}), 400
        existing, error_response = get_inventory_item_or_404(item_id)
        if error_response:
            return error_response
        _, existing_access_error = validate_branch_scope_access(branch_scope, existing.get('branch_id'))
        if existing_access_error:
            return jsonify({"error": existing_access_error}), 403

        payload = build_inventory_item_payload(data, existing=existing)
        _, payload_access_error = validate_branch_scope_access(branch_scope, payload.get('branch_id'))
        if payload_access_error:
            return jsonify({"error": payload_access_error}), 403
        ensure_inventory_item_is_unique(payload, exclude_item_id=item_id)
        response = supabase_admin.table('inventory_items') \
            .update(payload) \
            .eq('inventory_item_id', item_id) \
            .execute()
        updated = response.data[0] if response.data else get_single_row('inventory_items', 'inventory_item_id', item_id)
        updated_record = updated or existing
        notify_inventory_item_updated(existing, updated_record, actor_id=payload.get('updated_by'))
        notify_inventory_stock_state_transition(
            existing,
            updated_record,
            actor_id=payload.get('updated_by'),
            source_event='inventory_item_updated',
        )
        return jsonify({
            'message': 'Inventory item updated successfully',
            'item': normalize_inventory_item(updated_record)
        }), 200
    except Exception as e:
        print("Update inventory item error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/inventory/items/<int:item_id>/archive', methods=['POST'])
def archive_inventory_item(item_id):
    data = request.get_json() or {}
    try:
        branch_scope, branch_error = require_actor_branch_scope(data)
        if branch_error:
            return jsonify({"error": branch_error}), 400
        item, error_response = get_inventory_item_or_404(item_id)
        if error_response:
            return error_response
        _, branch_access_error = validate_branch_scope_access(branch_scope, item.get('branch_id'))
        if branch_access_error:
            return jsonify({"error": branch_access_error}), 403

        if item.get('is_archived'):
            return jsonify({'message': 'Inventory item is already archived', 'item': normalize_inventory_item(item)}), 200

        update_data = {
            'is_archived': True,
            'archived_at': datetime.utcnow().isoformat(),
            'archived_by': data.get('userId') or data.get('processedBy') or data.get('processed_by'),
            'archive_reason': (data.get('reason') or data.get('archiveReason') or '').strip() or None,
            'updated_by': data.get('userId') or data.get('processedBy') or data.get('processed_by'),
        }
        response = supabase_admin.table('inventory_items') \
            .update(update_data) \
            .eq('inventory_item_id', item_id) \
            .execute()
        archived = response.data[0] if response.data else get_single_row('inventory_items', 'inventory_item_id', item_id)
        notify_inventory_item_archived(
            archived or item,
            actor_id=update_data.get('archived_by'),
            reason=update_data.get('archive_reason'),
        )
        return jsonify({'message': 'Inventory item archived successfully', 'item': normalize_inventory_item(archived or item)}), 200
    except Exception as e:
        print("Archive inventory item error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/inventory/items/<int:item_id>/restore', methods=['POST'])
def restore_inventory_item(item_id):
    data = request.get_json() or {}
    try:
        branch_scope, branch_error = require_actor_branch_scope(data)
        if branch_error:
            return jsonify({"error": branch_error}), 400
        item, error_response = get_inventory_item_or_404(item_id)
        if error_response:
            return error_response
        _, branch_access_error = validate_branch_scope_access(branch_scope, item.get('branch_id'))
        if branch_access_error:
            return jsonify({"error": branch_access_error}), 403

        duplicate_payload = {
            'branch_id': item.get('branch_id'),
            'item_name': item.get('item_name'),
            'unit': item.get('unit'),
            'category': item.get('category'),
            'no_expiration': bool(item.get('no_expiration')),
            'expiration_date': item.get('expiration_date'),
        }
        duplicate = find_inventory_duplicate(duplicate_payload, exclude_item_id=item_id, include_archived=False)
        if duplicate:
            return jsonify({'error': 'Cannot restore product because an active product with the same unit and expiration date already exists'}), 400

        response = supabase_admin.table('inventory_items') \
            .update({
                'is_archived': False,
                'archived_at': None,
                'archived_by': None,
                'archive_reason': None,
                'updated_by': data.get('userId') or data.get('processedBy') or data.get('processed_by'),
            }) \
            .eq('inventory_item_id', item_id) \
            .execute()
        restored = response.data[0] if response.data else get_single_row('inventory_items', 'inventory_item_id', item_id)
        notify_inventory_item_restored(restored or item, actor_id=data.get('userId') or data.get('processedBy') or data.get('processed_by'))
        return jsonify({'message': 'Inventory item restored successfully', 'item': normalize_inventory_item(restored or item)}), 200
    except Exception as e:
        print("Restore inventory item error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/inventory/stock-in', methods=['POST'])
def create_inventory_stock_in():
    data = request.get_json() or {}
    try:
        branch_scope, branch_error = require_actor_branch_scope(data)
        if branch_error:
            return jsonify({"error": branch_error}), 400
        payload = build_inventory_transaction_payload(data, 'IN')
        _, branch_access_error = validate_branch_scope_access(branch_scope, payload.get('branch_id'))
        if branch_access_error:
            return jsonify({"error": branch_access_error}), 403
        result = persist_inventory_transaction(payload)
        notify_inventory_transaction_created(result, payload)
        for item in (result.get('items') or []):
            notify_inventory_stock_state_transition(
                {
                    'inventory_item_id': item.get('inventory_item_id'),
                    'branch_id': item.get('branch_id'),
                    'item_code': item.get('item_code'),
                    'item_name': item.get('item_name'),
                    'current_stock': item.get('previous_stock'),
                    'critical_stock_level': item.get('critical_stock_level'),
                },
                {
                    'inventory_item_id': item.get('inventory_item_id'),
                    'branch_id': item.get('branch_id'),
                    'item_code': item.get('item_code'),
                    'item_name': item.get('item_name'),
                    'current_stock': item.get('new_stock'),
                    'critical_stock_level': item.get('critical_stock_level'),
                },
                actor_id=payload.get('processed_by'),
                source_event='inventory_stock_in',
            )
        return jsonify({
            'message': 'Stock received successfully',
            'transaction': result['transaction'],
            'lineItems': result['lineItems'],
        }), 201
    except Exception as e:
        print("Inventory stock-in error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/inventory/stock-out', methods=['POST'])
def create_inventory_stock_out():
    data = request.get_json() or {}
    try:
        branch_scope, branch_error = require_actor_branch_scope(data)
        if branch_error:
            return jsonify({"error": branch_error}), 400
        payload = build_inventory_transaction_payload(data, 'OUT')
        _, branch_access_error = validate_branch_scope_access(branch_scope, payload.get('branch_id'))
        if branch_access_error:
            return jsonify({"error": branch_access_error}), 403
        result = persist_inventory_transaction(payload)
        notify_inventory_transaction_created(result, payload)
        for item in (result.get('items') or []):
            notify_inventory_stock_state_transition(
                {
                    'inventory_item_id': item.get('inventory_item_id'),
                    'branch_id': item.get('branch_id'),
                    'item_code': item.get('item_code'),
                    'item_name': item.get('item_name'),
                    'current_stock': item.get('previous_stock'),
                    'critical_stock_level': item.get('critical_stock_level'),
                },
                {
                    'inventory_item_id': item.get('inventory_item_id'),
                    'branch_id': item.get('branch_id'),
                    'item_code': item.get('item_code'),
                    'item_name': item.get('item_name'),
                    'current_stock': item.get('new_stock'),
                    'critical_stock_level': item.get('critical_stock_level'),
                },
                actor_id=payload.get('processed_by'),
                source_event='inventory_stock_out',
            )
        return jsonify({
            'message': 'Stock out recorded successfully',
            'transaction': result['transaction'],
            'lineItems': result['lineItems'],
        }), 201
    except Exception as e:
        print("Inventory stock-out error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/inventory/logs', methods=['GET'])
def get_inventory_logs():
    try:
        branch_id = request.args.get('branch_id', request.args.get('branchId'))
        branch_scope, branch_error = require_actor_branch_scope()
        if branch_error:
            return jsonify({"error": branch_error}), 400
        log_type = (request.args.get('type') or '').strip()
        product_name = (request.args.get('product') or request.args.get('productName') or '').strip()
        search = (request.args.get('search') or '').strip()
        start_date = (request.args.get('start_date') or request.args.get('startDate') or '').strip()
        end_date = (request.args.get('end_date') or request.args.get('endDate') or '').strip()

        query = supabase_admin.table('inventory_logs_view').select('*')
        if branch_id:
            requested_branch_id, branch_access_error = validate_branch_scope_access(branch_scope, branch_id)
            if branch_access_error:
                return jsonify({"error": branch_access_error}), 403
            query = query.eq('branch_id', requested_branch_id)
        else:
            query = apply_branch_scope_to_query(query, branch_scope)
        if log_type:
            query = query.eq('type', log_type)
        if product_name:
            query = query.eq('productName', product_name)
        if start_date:
            query = query.gte('date', start_date)
        if end_date:
            query = query.lte('date', end_date)
        if search:
            escaped = search.replace(',', '\\,')
            query = query.or_(
                f"productCode.ilike.%{escaped}%,productName.ilike.%{escaped}%,referenceNumber.ilike.%{escaped}%,user.ilike.%{escaped}%"
            )

        response = query.order('id', desc=True).execute()
        logs = [normalize_inventory_log(item) for item in (response.data or [])]
        return jsonify({'logs': logs}), 200
    except Exception as e:
        print("Fetch inventory logs error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/admin-notifications', methods=['GET'])
def get_admin_notifications():
    try:
        admin_user_id = (request.args.get('admin_user_id') or request.args.get('adminUserId') or '').strip()
        branch_id_raw = request.args.get('branch_id', request.args.get('branchId'))
        module = (request.args.get('module') or '').strip()
        unread_only = parse_bool(request.args.get('unread_only', request.args.get('unreadOnly')), default=False)
        limit_raw = request.args.get('limit')

        _, employee_error = get_employee_account_or_400(admin_user_id)
        if employee_error:
            return jsonify({'error': employee_error}), 400
        branch_scope, branch_error = get_actor_branch_scope(admin_user_id)
        if branch_error:
            return jsonify({'error': branch_error}), 400

        query = supabase_admin.table('admin_notifications').select('*')
        if branch_id_raw not in (None, '', 'all', 'All'):
            branch_id, branch_error = validate_branch_scope_access(branch_scope, branch_id_raw)
            if branch_error:
                return jsonify({'error': branch_error}), 403
            query = query.eq('branch_id', branch_id)
        else:
            query = apply_branch_scope_to_query(query, branch_scope)
        if module:
            query = query.eq('module', module)

        limit_value = None
        if limit_raw not in (None, ''):
            limit_value = coerce_int(limit_raw, 'limit', minimum=1, maximum=200)

        query = query.order('created_at', desc=True)
        if limit_value:
            query = query.limit(limit_value)

        response = execute_with_retry(
            lambda: query.execute(),
            context='Fetch admin notifications'
        )
        rows = response.data or []
        notification_ids = [row.get('notification_id') for row in rows if row.get('notification_id') is not None]
        reads_map = get_admin_notification_reads_map(admin_user_id, notification_ids)

        notifications = []
        unread_count = 0

        for row in rows:
            enriched = dict(row)
            enriched['read_at'] = reads_map.get(row.get('notification_id'))
            normalized = normalize_admin_notification(enriched, admin_user_id=admin_user_id)
            if not normalized['read']:
                unread_count += 1
            if unread_only and normalized['read']:
                continue
            notifications.append(normalized)

        return jsonify({
            'notifications': notifications,
            'unreadCount': unread_count,
            'totalCount': len(notifications),
        }), 200
    except Exception as e:
        print("Fetch admin notifications error:", str(e))
        return jsonify({"error": str(e)}), 400


def ensure_admin_notification_access(notification, branch_scope):
    if not notification:
        return 'Notification not found', 404
    if branch_scope and branch_scope.get('can_access_all'):
        return None, None
    _, branch_error = validate_branch_scope_access(branch_scope, notification.get('branch_id'))
    if branch_error:
        return branch_error, 403
    return None, None


def get_accessible_admin_notifications(notification_ids, branch_scope):
    response = supabase_admin.table('admin_notifications') \
        .select('notification_id, branch_id') \
        .in_('notification_id', notification_ids) \
        .execute()
    notifications = response.data or []
    found_ids = {int(row.get('notification_id')) for row in notifications if row.get('notification_id') is not None}
    missing_ids = [notification_id for notification_id in notification_ids if notification_id not in found_ids]
    if missing_ids:
        return notifications, f"Notification not found: {missing_ids[0]}", 404

    if branch_scope and branch_scope.get('can_access_all'):
        return notifications, None, None

    for notification in notifications:
        _, branch_error = validate_branch_scope_access(branch_scope, notification.get('branch_id'))
        if branch_error:
            return notifications, branch_error, 403

    return notifications, None, None


@app.route('/api/admin-notifications/<int:notification_id>/read', methods=['POST'])
def read_admin_notification(notification_id):
    data = request.get_json() or {}
    try:
        admin_user_id = (data.get('admin_user_id') or data.get('adminUserId') or '').strip()
        _, employee_error = get_employee_account_or_400(admin_user_id)
        if employee_error:
            return jsonify({'error': employee_error}), 400
        branch_scope, branch_error = get_actor_branch_scope(admin_user_id)
        if branch_error:
            return jsonify({'error': branch_error}), 400

        notification = get_single_row('admin_notifications', 'notification_id', notification_id)
        access_error, status_code = ensure_admin_notification_access(notification, branch_scope)
        if access_error:
            return jsonify({'error': access_error}), status_code

        mark_admin_notification_read(notification_id, admin_user_id)

        enriched = dict(notification)
        enriched['read_at'] = datetime.utcnow().isoformat()
        return jsonify({
            'message': 'Notification marked as read',
            'notification': normalize_admin_notification(enriched, admin_user_id=admin_user_id),
        }), 200
    except Exception as e:
        print("Mark admin notification read error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/admin-notifications/<int:notification_id>', methods=['DELETE'])
def delete_admin_notification(notification_id):
    data = request.get_json(silent=True) or {}
    try:
        admin_user_id = (data.get('admin_user_id') or data.get('adminUserId') or '').strip()
        _, employee_error = get_employee_account_or_400(admin_user_id)
        if employee_error:
            return jsonify({'error': employee_error}), 400
        branch_scope, branch_error = get_actor_branch_scope(admin_user_id)
        if branch_error:
            return jsonify({'error': branch_error}), 400

        notification = get_single_row('admin_notifications', 'notification_id', notification_id)
        access_error, status_code = ensure_admin_notification_access(notification, branch_scope)
        if access_error:
            return jsonify({'error': access_error}), status_code

        supabase_admin.table('admin_notification_reads').delete().eq('notification_id', notification_id).execute()
        supabase_admin.table('admin_notifications').delete().eq('notification_id', notification_id).execute()

        return jsonify({'message': 'Notification deleted', 'deletedCount': 1}), 200
    except Exception as e:
        print("Delete admin notification error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/admin-notifications', methods=['DELETE'])
def delete_admin_notifications():
    data = request.get_json(silent=True) or {}
    try:
        admin_user_id = (data.get('admin_user_id') or data.get('adminUserId') or '').strip()
        raw_ids = data.get('notificationIds') or data.get('notification_ids') or []
        _, employee_error = get_employee_account_or_400(admin_user_id)
        if employee_error:
            return jsonify({'error': employee_error}), 400
        branch_scope, branch_error = get_actor_branch_scope(admin_user_id)
        if branch_error:
            return jsonify({'error': branch_error}), 400

        notification_ids = []
        for raw_id in raw_ids:
            try:
                notification_ids.append(int(raw_id))
            except (TypeError, ValueError):
                continue
        notification_ids = list(dict.fromkeys(notification_ids))

        if not notification_ids:
            return jsonify({'error': 'notificationIds is required'}), 400

        _, access_error, status_code = get_accessible_admin_notifications(notification_ids, branch_scope)
        if access_error:
            return jsonify({'error': access_error}), status_code

        supabase_admin.table('admin_notification_reads').delete().in_('notification_id', notification_ids).execute()
        supabase_admin.table('admin_notifications').delete().in_('notification_id', notification_ids).execute()

        return jsonify({'message': 'Notifications deleted', 'deletedCount': len(notification_ids)}), 200
    except Exception as e:
        print("Bulk delete admin notifications error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/admin-notifications/read-all', methods=['POST'])
def read_all_admin_notifications():
    data = request.get_json() or {}
    try:
        admin_user_id = (data.get('admin_user_id') or data.get('adminUserId') or '').strip()
        branch_id_raw = data.get('branch_id', data.get('branchId'))
        module = (data.get('module') or '').strip()

        _, employee_error = get_employee_account_or_400(admin_user_id)
        if employee_error:
            return jsonify({'error': employee_error}), 400
        branch_scope, branch_error = get_actor_branch_scope(admin_user_id)
        if branch_error:
            return jsonify({'error': branch_error}), 400

        query = supabase_admin.table('admin_notifications').select('notification_id')
        if branch_id_raw not in (None, '', 'all', 'All'):
            branch_id, branch_error = validate_branch_scope_access(branch_scope, branch_id_raw)
            if branch_error:
                return jsonify({'error': branch_error}), 403
            query = query.eq('branch_id', branch_id)
        else:
            query = apply_branch_scope_to_query(query, branch_scope)
        if module:
            query = query.eq('module', module)

        notifications_response = query.execute()
        notifications = notifications_response.data or []
        notification_ids = [
            row.get('notification_id')
            for row in notifications
            if row.get('notification_id') is not None
        ]

        if not notification_ids:
            return jsonify({'message': 'No notifications to mark as read', 'updatedCount': 0}), 200

        read_at = datetime.utcnow().isoformat()
        read_rows = [
            {
                'notification_id': notification_id,
                'admin_user_id': admin_user_id,
                'read_at': read_at,
            }
            for notification_id in notification_ids
        ]
        supabase_admin.table('admin_notification_reads').upsert(read_rows).execute()

        return jsonify({
            'message': 'Notifications marked as read',
            'updatedCount': len(notification_ids),
        }), 200
    except Exception as e:
        print("Mark all admin notifications read error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/audit-notifications', methods=['POST'])
def create_audit_notification_from_client():
    data = request.get_json() or {}
    try:
        audit_status = (data.get('status') or 'Success').strip().lower()
        severity = {
            'success': 'success',
            'warning': 'warning',
            'failed': 'error',
            'error': 'error',
        }.get(audit_status, 'info')
        module_name = (data.get('module') or 'Audit').strip()
        event_name = (data.get('event') or 'Audit event').strip()
        target = (data.get('target') or '').strip()
        summary = (data.get('summary') or '').strip()
        actor = (data.get('actor') or 'System').strip()
        role = (data.get('role') or '').strip()

        message_parts = [
            f"{actor}{f' ({role})' if role else ''} recorded {event_name}",
            f"for {target}" if target else "",
            f"in {module_name}.",
            summary,
        ]
        message = " ".join(part for part in message_parts if part).strip()

        notification = safe_create_audit_admin_notification(
            event_type='audit_log_recorded',
            title=f"Audit: {event_name}",
            message=message,
            severity=severity,
            actor_id=data.get('actorId') or data.get('actor_id') or data.get('userId') or data.get('user_id'),
            metadata={
                "auditId": data.get('id'),
                "module": module_name,
                "event": event_name,
                "actor": actor,
                "role": role,
                "target": target,
                "summary": summary,
                "status": data.get('status') or 'Success',
                "dateTime": data.get('dateTime'),
            },
        )

        return jsonify({
            "message": "Audit notification recorded" if notification else "Audit notification skipped",
            "notification": normalize_admin_notification(notification) if notification else None,
        }), 200
    except Exception as e:
        print("Create audit notification error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/admin-notifications/reconcile/inventory-expiring-soon', methods=['POST'])
def reconcile_inventory_expiring_soon_notifications():
    data = request.get_json() or {}
    try:
        branch_id_raw = data.get('branch_id', data.get('branchId'))
        branch_id = None
        if branch_id_raw not in (None, ''):
            branch_id = coerce_int(branch_id_raw, 'branch_id', minimum=1)

        expiry_windows = data.get('windows', data.get('expiryWindows'))
        result = reconcile_inventory_expiring_notifications(
            branch_id=branch_id,
            expiry_windows=expiry_windows,
        )

        return jsonify({
            'message': 'Inventory expiring-soon reconciliation completed',
            **result,
        }), 200
    except Exception as e:
        print("Reconcile inventory expiring notifications error:", str(e))
        return jsonify({"error": str(e)}), 400


def build_admin_appointment_rows(include_history=False, actor_id=None):
    branch_scope = None
    if actor_id:
        branch_scope, branch_error = get_actor_branch_scope(actor_id)
        if branch_error:
            raise ValueError(branch_error)

    appointments = execute_with_retry(
        lambda: apply_branch_scope_to_query(
            supabase_admin.table("appointments").select("*"),
            branch_scope,
        ).execute(),
        context="Fetch appointments for admin schedule"
    ).data or []
    walkins = execute_with_retry(
        lambda: apply_branch_scope_to_query(
            supabase_admin.table("walkin_appointments").select("*"),
            branch_scope,
        ).execute(),
        context="Fetch walk-in appointments for admin schedule"
    ).data or []
    patients = execute_with_retry(
        lambda: supabase_admin.table("patient_account").select("*").execute(),
        context="Fetch patients for admin schedule"
    ).data or []
    pets = execute_with_retry(
        lambda: supabase_admin.table("pet_profile").select("*").execute(),
        context="Fetch pets for admin schedule"
    ).data or []
    doctors = execute_with_retry(
        lambda: supabase_admin.table("employee_accounts").select("*").execute(),
        context="Fetch employees for admin schedule"
    ).data or []
    branches = execute_with_retry(
        lambda: supabase_admin.table("branches").select("*").execute(),
        context="Fetch branches for admin schedule"
    ).data or []
    reschedule_requests = execute_with_retry(
        lambda: supabase_admin.table("reschedule_requests").select("*").order("created_at", desc=True).execute(),
        context="Fetch reschedule requests for admin schedule"
    ).data or []
    medical_information_rows = execute_with_retry(
        lambda: supabase_admin.table("medical_information").select("*").execute(),
        context="Fetch medical information for admin schedule"
    ).data or []
    linked_visits_by_source = get_latest_emr_visit_links_by_source()
    billing_invoice_index = fetch_billing_source_invoice_index()

    patients_by_id = {str(patient.get("id")): patient for patient in patients}
    pets_by_id = {str(pet.get("pet_id")): pet for pet in pets}
    doctors_by_id = {str(doctor.get("id")): doctor for doctor in doctors}
    branches_by_id = {str(branch.get("branch_id") or branch.get("id")): branch for branch in branches}
    latest_request_by_target = {}
    medical_information_by_target = {}

    for request_item in reschedule_requests:
        map_key = f"{request_item.get('target_type')}-{request_item.get('target_id')}"
        if map_key not in latest_request_by_target:
            latest_request_by_target[map_key] = request_item

    for medical_row in medical_information_rows:
        normalized_medical = normalize_medical_information_record(medical_row)
        if not normalized_medical:
            continue
        medical_key = f"{normalized_medical.get('record_type')}-{normalized_medical.get('target_id')}"
        if normalized_medical.get("target_id") not in (None, "") and medical_key not in medical_information_by_target:
            medical_information_by_target[medical_key] = normalized_medical

    history_statuses = {"completed", "cancelled", "no_show", "expired"}
    formatted = []
    today_in_manila = get_current_manila_date()

    def derive_schedule_status(status_value, appointment_date_value, latest_reschedule_request=None):
        normalized_status = (status_value or "pending").strip().lower()
        request_status = ((latest_reschedule_request or {}).get("status") or "").strip().lower()
        effective_status = (
            "pending"
            if request_status in {"pending", "needs_new_schedule"} and normalized_status not in {"completed", "cancelled"}
            else normalized_status
        )

        appointment_date = parse_emr_date(appointment_date_value)
        if appointment_date and appointment_date < today_in_manila:
            if effective_status in {"confirmed", "scheduled"}:
                return "no_show"
            if effective_status == "pending":
                return "expired"

        return effective_status

    def should_include(status_value):
        normalized = (status_value or "").lower()
        return normalized in history_statuses if include_history else normalized not in history_statuses

    for app in appointments:
        owner = patients_by_id.get(str(app.get("owner_id")), {})
        pet = pets_by_id.get(str(app.get("pet_id")), {})
        doctor_id = app.get("doctor_id") or app.get("assigned_doctor_id")
        doctor = doctors_by_id.get(str(doctor_id), {}) if doctor_id else {}
        branch = branches_by_id.get(str(app.get("branch_id")), {}) if app.get("branch_id") is not None else {}
        latest_reschedule_request = latest_request_by_target.get(f"appointment-{app.get('appointment_id')}")
        medical_information = medical_information_by_target.get(f"appointment-{app.get('appointment_id')}")
        status = derive_schedule_status(app.get("status"), app.get("appointment_date"), latest_reschedule_request)
        if not should_include(status):
            continue

        owner_name = get_profile_display_name(owner) or "Unknown Owner"
        pet_name = pet.get("pet_name") or "Unknown Pet"
        pet_type = (pet.get("pet_species") or "Unknown").title()
        pet_breed = (pet.get("pet_breed") or "Unknown").title()
        pet_gender = (pet.get("pet_gender") or "Unknown").title()
        time_range = format_display_time_range(app.get("appointment_time"))
        date_display = str(app.get("appointment_date") or "")
        branch_name = branch.get("branch_name") or branch.get("name") or "Not specified"
        linked_visit = linked_visits_by_source.get(f"appointment-{app.get('appointment_id')}")
        direct_visit_invoice = get_billing_invoice_from_index(
            billing_invoice_index,
            "visit",
            linked_visit.get("visitId") if linked_visit else None,
        )
        legacy_appointment_invoice = get_billing_invoice_from_index(
            billing_invoice_index,
            "appointment",
            app.get("appointment_id"),
        )
        if direct_visit_invoice:
            billing_source_type = "visit"
            billing_source_id = linked_visit.get("visitId") if linked_visit else None
            billing_invoice = direct_visit_invoice
        elif legacy_appointment_invoice:
            billing_source_type = "appointment"
            billing_source_id = app.get("appointment_id")
            billing_invoice = legacy_appointment_invoice
        else:
            billing_source_type = "visit" if linked_visit else "appointment"
            billing_source_id = linked_visit.get("visitId") if linked_visit else app.get("appointment_id")
            billing_invoice = None

        formatted.append({
            **app,
            "id": f"appointment-{app.get('appointment_id')}",
            "dbId": app.get("appointment_id"),
            "recordType": "appointment",
            "recordLabel": "Appointment",
            "ownerName": owner_name,
            "name": owner_name,
            "patient_name": owner_name,
            "email": owner.get("email") or "Not provided",
            "patientEmail": owner.get("email") or "Not provided",
            "patient_email": owner.get("email") or "Not provided",
            "phone": owner.get("contact_number") or "Not provided",
            "patientPhone": owner.get("contact_number") or "Not provided",
            "patient_phone": owner.get("contact_number") or "Not provided",
            "contact_number": owner.get("contact_number") or "Not provided",
            "reasonForVisit": app.get("patient_reason") or "Not provided",
            "patient_reason": app.get("patient_reason") or "Not provided",
            "reason": app.get("patient_reason") or "Not provided",
            "rescheduleReason": (latest_reschedule_request or {}).get("reason") or app.get("reschedule_reason") or "Not provided",
            "reschedule_reason": app.get("reschedule_reason"),
            "pet_name": pet_name,
            "petName": pet_name,
            "type": pet_type,
            "petType": pet_type,
            "pet_type": pet_type,
            "pet_species": pet_type,
            "breed": pet_breed,
            "petBreed": pet_breed,
            "pet_breed": pet_breed,
            "gender": pet_gender,
            "petGender": pet_gender,
            "pet_gender": pet_gender,
            "pet_photo_url": pet.get("pet_photo_url"),
            "service": app.get("appointment_type") or "General",
            "date_time": f"{date_display} {time_range}".strip(),
            "date_display": date_display,
            "time_display": time_range,
            "time_range_display": time_range,
            "date_only": date_display,
            "doctor": get_profile_display_name(doctor) or "Not Assigned",
            "assignedDoctor": doctor_id,
            "branch": branch_name,
            "branchName": branch_name,
            "branch_id": app.get("branch_id"),
            "status": status,
            "displayStatus": status,
            "rawStatus": (app.get("status") or "pending").lower(),
            "medicalInformation": medical_information,
            "medical_information": medical_information,
            "latestRescheduleRequest": latest_reschedule_request,
            "is_walk_in": False,
            "linkedVisitId": str(linked_visit.get("visitId")) if linked_visit else None,
            "billingSourceType": billing_source_type,
            "billingSourceId": str(billing_source_id) if billing_source_id not in (None, "") else None,
            "hasBillingInvoice": bool(billing_invoice),
            "billingInvoiceId": str(billing_invoice.get("billingInvoiceId") or "") if billing_invoice else None,
            "billingInvoiceNumber": billing_invoice.get("billingInvoiceNumber") if billing_invoice else None,
            "canProceedToBilling": status == "completed" and bool(billing_source_id) and not billing_invoice,
            "sort_date": date_display,
            "sort_time": str(app.get("appointment_time") or ""),
        })

    for walkin in walkins:
        doctor_id = walkin.get("doctor_id") or walkin.get("assigned_doctor_id")
        doctor = doctors_by_id.get(str(doctor_id), {}) if doctor_id else {}
        branch = branches_by_id.get(str(walkin.get("branch_id")), {}) if walkin.get("branch_id") is not None else {}
        latest_reschedule_request = latest_request_by_target.get(f"walkin-{walkin.get('walkin_id')}")
        medical_information = medical_information_by_target.get(f"walkin-{walkin.get('walkin_id')}")
        status = derive_schedule_status(walkin.get("status"), walkin.get("appointment_date"), latest_reschedule_request)
        if not should_include(status):
            continue
        patient_name = f"{walkin.get('first_name', '')} {walkin.get('last_name', '')}".strip() or "Guest Patient"
        pet_name = walkin.get("pet_name") or "Unknown Pet"
        time_range = format_display_time_range(walkin.get("appointment_time"))
        date_display = str(walkin.get("appointment_date") or "")
        pet_type = (walkin.get("pet_species") or "Unknown").title()
        pet_breed = (walkin.get("pet_breed") or "Unknown").title()
        pet_gender = (walkin.get("pet_gender") or "Unknown").title()
        branch_name = branch.get("branch_name") or branch.get("name") or "Not specified"
        linked_visit = linked_visits_by_source.get(f"walkin-{walkin.get('walkin_id')}")
        direct_visit_invoice = get_billing_invoice_from_index(
            billing_invoice_index,
            "visit",
            linked_visit.get("visitId") if linked_visit else None,
        )
        legacy_walkin_invoice = get_billing_invoice_from_index(
            billing_invoice_index,
            "walkin",
            walkin.get("walkin_id"),
        )
        if direct_visit_invoice:
            billing_source_type = "visit"
            billing_source_id = linked_visit.get("visitId") if linked_visit else None
            billing_invoice = direct_visit_invoice
        elif legacy_walkin_invoice:
            billing_source_type = "walkin"
            billing_source_id = walkin.get("walkin_id")
            billing_invoice = legacy_walkin_invoice
        else:
            billing_source_type = "visit" if linked_visit else "walkin"
            billing_source_id = linked_visit.get("visitId") if linked_visit else walkin.get("walkin_id")
            billing_invoice = None

        formatted.append({
            **walkin,
            "id": f"walkin-{walkin.get('walkin_id')}",
            "dbId": walkin.get("walkin_id"),
            "recordType": "walkin",
            "recordLabel": "Clinic-Created Appointment",
            "ownerName": patient_name,
            "name": patient_name,
            "patient_name": patient_name,
            "email": walkin.get("email") or "Not provided",
            "patientEmail": walkin.get("email") or "Not provided",
            "patient_email": walkin.get("email") or "Not provided",
            "walk_in_email": walkin.get("email") or "Not provided",
            "phone": walkin.get("contact_number") or "Not provided",
            "patientPhone": walkin.get("contact_number") or "Not provided",
            "patient_phone": walkin.get("contact_number") or "Not provided",
            "contact_number": walkin.get("contact_number") or "Not provided",
            "walk_in_phone": walkin.get("contact_number") or "Not provided",
            "reasonForVisit": walkin.get("patient_reason") or "Not provided",
            "patient_reason": walkin.get("patient_reason") or "Not provided",
            "reason": walkin.get("patient_reason") or "Not provided",
            "rescheduleReason": (latest_reschedule_request or {}).get("reason") or walkin.get("reschedule_reason") or "Not provided",
            "reschedule_reason": walkin.get("reschedule_reason"),
            "pet_name": pet_name,
            "petName": pet_name,
            "type": pet_type,
            "petType": pet_type,
            "pet_type": pet_type,
            "pet_species": pet_type,
            "breed": pet_breed,
            "petBreed": pet_breed,
            "pet_breed": pet_breed,
            "gender": pet_gender,
            "petGender": pet_gender,
            "pet_gender": pet_gender,
            "service": walkin.get("appointment_type") or "General",
            "date_time": f"{date_display} {time_range}".strip(),
            "date_display": date_display,
            "time_display": time_range,
            "time_range_display": time_range,
            "date_only": date_display,
            "doctor": get_profile_display_name(doctor) or "Not Assigned",
            "assignedDoctor": doctor_id,
            "branch": branch_name,
            "branchName": branch_name,
            "branch_id": walkin.get("branch_id"),
            "status": status,
            "displayStatus": status,
            "rawStatus": (walkin.get("status") or "pending").lower(),
            "medicalInformation": medical_information,
            "medical_information": medical_information,
            "latestRescheduleRequest": latest_reschedule_request,
            "is_walk_in": True,
            "linkedVisitId": str(linked_visit.get("visitId")) if linked_visit else None,
            "billingSourceType": billing_source_type,
            "billingSourceId": str(billing_source_id) if billing_source_id not in (None, "") else None,
            "hasBillingInvoice": bool(billing_invoice),
            "billingInvoiceId": str(billing_invoice.get("billingInvoiceId") or "") if billing_invoice else None,
            "billingInvoiceNumber": billing_invoice.get("billingInvoiceNumber") if billing_invoice else None,
            "canProceedToBilling": status == "completed" and bool(billing_source_id) and not billing_invoice,
            "sort_date": date_display,
            "sort_time": str(walkin.get("appointment_time") or ""),
        })

    formatted.sort(
        key=lambda item: (item.get("sort_date") or "", item.get("sort_time") or "", item.get("id") or ""),
        reverse=include_history
    )

    for item in formatted:
        item.pop("sort_date", None)
        item.pop("sort_time", None)

    return formatted


def is_missing_relation_error(error, relation_name):
    message = str(error or "")
    normalized_message = message.lower()
    normalized_relation = str(relation_name or "").lower()
    return (
        normalized_relation in normalized_message
        and (
            "schema cache" in normalized_message
            or "does not exist" in normalized_message
            or "pgrst205" in normalized_message
            or "42p01" in normalized_message
        )
    )


def normalize_billing_service_name(value):
    raw_value = (
        str(value or "")
        .strip()
        .lower()
        .replace("&", " and ")
        .replace("check-up", "checkup")
    )
    cleaned_value = "".join(character if character.isalnum() else " " for character in raw_value)
    tokens = [
        token
        for token in cleaned_value.split()
        if token and token not in {"and", "or"}
    ]
    return " ".join(sorted(tokens))


BILLING_GENERIC_SERVICE_PRICE_FALLBACKS = {
    normalize_billing_service_name("Consultation"): 500.00,
    normalize_billing_service_name("Vaccination"): 1200.00,
    normalize_billing_service_name("Laboratory"): 800.00,
    normalize_billing_service_name("Laboratory Test"): 800.00,
    normalize_billing_service_name("Laboratory Tests"): 800.00,
    normalize_billing_service_name("Lab Test"): 800.00,
    normalize_billing_service_name("X-Ray"): 1500.00,
    normalize_billing_service_name("Xray"): 1500.00,
    normalize_billing_service_name("Radiology X-Ray"): 1500.00,
    normalize_billing_service_name("Ultrasound"): 2000.00,
    normalize_billing_service_name("Surgery"): 3000.00,
    normalize_billing_service_name("Dental Cleaning"): 800.00,
    normalize_billing_service_name("Grooming"): 500.00,
    normalize_billing_service_name("Pet Grooming"): 500.00,
    normalize_billing_service_name("Boarding"): 1200.00,
    normalize_billing_service_name("Pet Boarding"): 1200.00,
    normalize_billing_service_name("Confinement"): 2500.00,
}


BILLING_GENERIC_SERVICE_METADATA_FALLBACKS = {
    normalize_billing_service_name("Consultation"): {
        "category": "Consultation",
        "subcategory": "Consultation & Check-Up",
        "description": "Standard veterinary consultation",
    },
    normalize_billing_service_name("Vaccination"): {
        "category": "Vaccinations",
        "subcategory": "Vaccinations",
        "description": "Annual vaccination",
    },
    normalize_billing_service_name("Laboratory"): {
        "category": "Diagnostics",
        "subcategory": "Laboratory Tests",
        "description": "Blood work and lab tests",
    },
    normalize_billing_service_name("Laboratory Test"): {
        "category": "Diagnostics",
        "subcategory": "Laboratory Tests",
        "description": "Blood work and lab tests",
    },
    normalize_billing_service_name("Laboratory Tests"): {
        "category": "Diagnostics",
        "subcategory": "Laboratory Tests",
        "description": "Blood work and lab tests",
    },
    normalize_billing_service_name("Lab Test"): {
        "category": "Diagnostics",
        "subcategory": "Laboratory Tests",
        "description": "Blood work and lab tests",
    },
    normalize_billing_service_name("X-Ray"): {
        "category": "Diagnostics",
        "subcategory": "Imaging",
        "description": "Radiology services",
    },
    normalize_billing_service_name("Xray"): {
        "category": "Diagnostics",
        "subcategory": "Imaging",
        "description": "Radiology services",
    },
    normalize_billing_service_name("Radiology X-Ray"): {
        "category": "Diagnostics",
        "subcategory": "Imaging",
        "description": "Radiology services",
    },
    normalize_billing_service_name("Ultrasound"): {
        "category": "Diagnostics",
        "subcategory": "Imaging",
        "description": "Ultrasound examination",
    },
    normalize_billing_service_name("Surgery"): {
        "category": "Surgery",
        "subcategory": "Surgery",
        "description": "Surgical procedure",
    },
    normalize_billing_service_name("Dental Cleaning"): {
        "category": "Dental",
        "subcategory": "Dental Prophylaxis",
        "description": "Professional dental cleaning",
    },
    normalize_billing_service_name("Grooming"): {
        "category": "Grooming",
        "subcategory": "Pet Grooming",
        "description": "Basic grooming services",
    },
    normalize_billing_service_name("Pet Grooming"): {
        "category": "Grooming",
        "subcategory": "Pet Grooming",
        "description": "Basic grooming services",
    },
    normalize_billing_service_name("Boarding"): {
        "category": "Boarding",
        "subcategory": "Pet Boarding",
        "description": "Overnight stay, feeding, supervision",
    },
    normalize_billing_service_name("Confinement"): {
        "category": "Confinement",
        "subcategory": "Confinement",
        "description": "Medical care, monitoring, IV fluids, medication",
    },
}


def normalize_billing_service_record(record):
    service_id = (
        record.get("billing_service_id")
        or record.get("service_id")
        or record.get("id")
        or record.get("service_code")
        or record.get("serviceCode")
    )
    return {
        "id": str(service_id),
        "serviceId": record.get("billing_service_id") or record.get("service_id"),
        "serviceCode": record.get("service_code") or record.get("serviceCode") or "",
        "name": record.get("service_name") or record.get("serviceName") or "",
        "category": record.get("service_category") or record.get("serviceCategory") or "Other",
        "subcategory": record.get("service_subcategory") or record.get("serviceSubcategory") or "",
        "price": float(record.get("unit_price") or record.get("unitPrice") or 0),
        "description": record.get("description") or "",
        "isActive": bool(record.get("is_active", True)),
    }


def load_billing_service_catalog():
    try:
        response = execute_with_retry(
            lambda: supabase_admin.table("billing_services").select("*").eq("is_active", True).order("service_category").order("service_name").execute(),
            context="Fetch billing services"
        )
        rows = response.data or []
        if rows:
            return rows
    except Exception as e:
        if not is_missing_relation_error(e, "billing_services"):
            print("Billing service catalog error:", str(e))

    return [dict(row) for row in BILLING_SERVICE_SEED_ROWS]


def build_billing_service_lookups():
    normalized_services = [normalize_billing_service_record(row) for row in load_billing_service_catalog()]
    by_name = {}
    by_id = {}
    by_code = {}

    for service in normalized_services:
        name_key = normalize_billing_service_name(service.get("name"))
        if name_key:
            by_name[name_key] = service
        if service.get("serviceId") not in (None, ""):
            by_id[str(service.get("serviceId"))] = service
        if service.get("serviceCode"):
            by_code[str(service.get("serviceCode"))] = service

    for alias, target in BILLING_SERVICE_ALIASES.items():
        target_service = by_name.get(normalize_billing_service_name(target))
        if target_service:
            by_name[normalize_billing_service_name(alias)] = target_service

    return {
        "services": normalized_services,
        "by_name": by_name,
        "by_id": by_id,
        "by_code": by_code,
    }


def parse_billing_service_names_from_label(label):
    raw_label = str(label or "").strip()
    if not raw_label:
        return []

    for group_prefix in ("Pet Grooming", "Laboratory Tests"):
        if raw_label.lower().startswith(group_prefix.lower()):
            open_paren = raw_label.find("(")
            close_paren = raw_label.rfind(")")
            if open_paren != -1 and close_paren > open_paren:
                parsed_items = [
                    part.strip()
                    for part in raw_label[open_paren + 1:close_paren].split(",")
                    if part.strip()
                ]
                if parsed_items:
                    return parsed_items
            return [group_prefix]

    return [raw_label]


def resolve_billing_service_match(raw_name=None, service_id=None, service_code=None, lookups=None):
    service_lookups = lookups or build_billing_service_lookups()

    if service_id not in (None, ""):
        matched_by_id = service_lookups["by_id"].get(str(service_id))
        if matched_by_id:
            return matched_by_id

    if service_code:
        matched_by_code = service_lookups["by_code"].get(str(service_code))
        if matched_by_code:
            return matched_by_code

    normalized_name = normalize_billing_service_name(raw_name)
    if normalized_name:
        return service_lookups["by_name"].get(normalized_name)

    return None


def build_billing_service_line_item(raw_name, *, lookups=None, quantity=1, sort_order=1, service_id=None, service_code=None, unit_price=None):
    service_lookups = lookups or build_billing_service_lookups()
    matched_service = resolve_billing_service_match(
        raw_name=raw_name,
        service_id=service_id,
        service_code=service_code,
        lookups=service_lookups,
    )
    safe_name = (raw_name or "").strip() or (matched_service or {}).get("name") or "Service"
    parsed_quantity = max(1, int(quantity or 1))
    generic_service_key = normalize_billing_service_name(raw_name)
    generic_metadata = BILLING_GENERIC_SERVICE_METADATA_FALLBACKS.get(generic_service_key, {})
    matched_unit_price = float((matched_service or {}).get("price") or 0)
    generic_unit_price = BILLING_GENERIC_SERVICE_PRICE_FALLBACKS.get(generic_service_key, 0)
    parsed_unit_price = parse_emr_float(unit_price)
    base_unit_price = (
        parsed_unit_price
        if parsed_unit_price and parsed_unit_price > 0
        else matched_unit_price or generic_unit_price
    )

    return {
        "id": str((matched_service or {}).get("serviceId") or (matched_service or {}).get("serviceCode") or f"service-{sort_order}"),
        "serviceId": (matched_service or {}).get("serviceId"),
        "serviceCode": (matched_service or {}).get("serviceCode"),
        "name": (matched_service or {}).get("name") or safe_name,
        "description": (matched_service or {}).get("description") or generic_metadata.get("description") or f"{safe_name} service",
        "category": (matched_service or {}).get("category") or generic_metadata.get("category") or "Other",
        "subcategory": (matched_service or {}).get("subcategory") or generic_metadata.get("subcategory") or "",
        "quantity": parsed_quantity,
        "unitPrice": round(base_unit_price, 2),
        "total": round(base_unit_price * parsed_quantity, 2),
        "sortOrder": sort_order,
    }


def build_billing_service_items_from_label(label, *, lookups=None):
    parsed_names = parse_billing_service_names_from_label(label)
    return [
        build_billing_service_line_item(service_name, lookups=lookups, sort_order=index)
        for index, service_name in enumerate(parsed_names, start=1)
    ]


def build_resolved_billing_service_items_from_label(label, *, lookups=None):
    service_lookups = lookups or build_billing_service_lookups()
    parsed_names = parse_billing_service_names_from_label(label)
    if not parsed_names:
        return []

    resolved_items = []
    for index, service_name in enumerate(parsed_names, start=1):
        matched_service = resolve_billing_service_match(
            raw_name=service_name,
            lookups=service_lookups,
        )
        if not matched_service:
            return []

        resolved_items.append(
            build_billing_service_line_item(
                service_name,
                lookups=service_lookups,
                sort_order=index,
            )
        )

    return resolved_items


def build_billing_product_catalog(branch_scope=None):
    try:
        response = execute_with_retry(
            lambda: apply_branch_scope_to_query(
                supabase_admin.table("inventory_items").select("*"),
                branch_scope,
            ).order("item_name").execute(),
            context="Fetch billing product catalog"
        )
        records = response.data or []
    except Exception as e:
        print("Billing product catalog error:", str(e))
        return []

    products = []
    for record in records:
        normalized = normalize_inventory_item(record)
        if normalized.get("isArchived"):
            continue

        raw_category = str(normalized.get("category") or "").strip().lower()
        if raw_category == "food":
            billing_category = "food"
        elif raw_category in {"medication", "deworming"}:
            billing_category = "medicine"
        elif raw_category == "vitamins":
            billing_category = "supplement"
        elif raw_category in {"accessories", "pet supplies"}:
            billing_category = "accessory"
        else:
            billing_category = "other"

        description_parts = [normalized.get("category"), normalized.get("unit")]
        description = " | ".join(part for part in description_parts if part)

        products.append({
            "id": str(normalized.get("inventory_item_id") or normalized.get("id")),
            "inventoryItemId": normalized.get("inventory_item_id") or normalized.get("id"),
            "branchId": normalized.get("branchId") or normalized.get("branch_id"),
            "branch_id": normalized.get("branchId") or normalized.get("branch_id"),
            "name": normalized.get("item") or "",
            "sku": normalized.get("code") or "",
            "category": billing_category,
            "price": float(normalized.get("sellingPrice") or 0),
            "stock": int(normalized.get("stockCount") or 0),
            "description": description,
        })

    return products


def build_billing_product_lookup(branch_scope=None):
    return {
        product.get("id"): product
        for product in build_billing_product_catalog(branch_scope=branch_scope)
        if product.get("id")
    }


def normalize_billing_inventory_match_key(value):
    cleaned = re.sub(r"[^a-z0-9]+", " ", normalize_inventory_name_for_compare(value))
    return " ".join(cleaned.split())


def resolve_prescription_inventory_product(medication_name, product_catalog=None):
    normalized_medication = normalize_billing_inventory_match_key(medication_name)
    if not normalized_medication:
        return None

    medication_tokens = normalized_medication.split()
    best_match = None
    best_rank = None

    for product in (product_catalog or []):
        if str(product.get("category") or "").strip().lower() != "medicine":
            continue
        if int(product.get("stock") or 0) <= 0:
            continue

        product_key = normalize_billing_inventory_match_key(product.get("name"))
        if not product_key:
            continue

        if product_key == normalized_medication:
            return product

        rank = None
        if product_key.startswith(normalized_medication):
            rank = (1, len(product_key), product.get("name") or "")
        elif normalized_medication in product_key:
            rank = (2, len(product_key), product.get("name") or "")
        else:
            product_tokens = set(product_key.split())
            if medication_tokens and all(token in product_tokens for token in medication_tokens):
                rank = (3, len(product_key), product.get("name") or "")

        if rank is None:
            continue

        if best_rank is None or rank < best_rank:
            best_rank = rank
            best_match = product

    return best_match


def build_prescription_inventory_suggestions(prescriptions=None, product_catalog=None):
    suggestions = []
    seen_inventory_ids = set()
    available_products = product_catalog or build_billing_product_catalog()

    for prescription in (prescriptions or []):
        medication_name = str(
            prescription.get("medicationName")
            or prescription.get("medication_name")
            or ""
        ).strip()
        if not medication_name:
            continue

        matched_product = resolve_prescription_inventory_product(
            medication_name,
            product_catalog=available_products,
        )
        if not matched_product:
            continue

        inventory_item_id = matched_product.get("inventoryItemId") or matched_product.get("id")
        if inventory_item_id in (None, ""):
            continue

        inventory_item_id_str = str(inventory_item_id)
        if inventory_item_id_str in seen_inventory_ids:
            continue
        seen_inventory_ids.add(inventory_item_id_str)

        suggestions.append({
            "id": str(matched_product.get("id") or inventory_item_id_str),
            "inventoryItemId": inventory_item_id,
            "name": matched_product.get("name") or medication_name,
            "sku": matched_product.get("sku") or "",
            "category": matched_product.get("category") or "medicine",
            "price": float(matched_product.get("price") or 0),
            "stock": int(matched_product.get("stock") or 0),
            "description": matched_product.get("description") or "",
            "prescriptionMedicationName": medication_name,
            "dosage": str(prescription.get("dosage") or "").strip(),
            "route": str(prescription.get("route") or "").strip(),
            "frequency": str(prescription.get("frequency") or "").strip(),
            "duration": str(prescription.get("duration") or "").strip(),
            "instructions": str(prescription.get("instructions") or "").strip(),
        })

    return suggestions


def build_billing_inventory_reference(invoice_key, branch_id):
    return f"BILL-{invoice_key}-OUT-BR{branch_id}"


def prepare_billing_invoice_inventory_stock_out_payloads(invoice_record, product_items=None, processed_by=None):
    invoice_number = str((invoice_record or {}).get("invoice_number") or (invoice_record or {}).get("billing_invoice_id") or "").strip()
    if not invoice_number:
        return []

    customer_name = str((invoice_record or {}).get("customer_name") or "").strip() or None
    grouped_items = {}

    for product_item in (product_items or []):
        inventory_item_id = (
            product_item.get("inventory_item_id")
            or product_item.get("inventoryItemId")
        )
        if inventory_item_id in (None, ""):
            continue

        inventory_record = get_single_row("inventory_items", "inventory_item_id", inventory_item_id)
        if not inventory_record:
            raise ValueError(f"Inventory item {inventory_item_id} was not found for {invoice_number}")

        branch_id = inventory_record.get("branch_id")
        if branch_id in (None, ""):
            raise ValueError(f"Inventory item {inventory_item_id} is missing a branch assignment")

        grouped_items.setdefault(branch_id, []).append({
            "inventoryItemId": inventory_item_id,
            "quantity": product_item.get("quantity") or 1,
            "unitPrice": product_item.get("unit_price", product_item.get("unitPrice", inventory_record.get("selling_price"))),
        })

    prepared_payloads = []
    for branch_id, branch_items in grouped_items.items():
        reference_number = build_billing_inventory_reference(invoice_number, branch_id)
        if inventory_transaction_reference_exists(branch_id, reference_number):
            continue

        payload = build_inventory_transaction_payload(
            {
                "branchId": branch_id,
                "referenceNumber": reference_number,
                "reason": "Billing Invoice Sale",
                "notes": f"Inventory deducted for billing invoice {invoice_number}",
                "counterpartyName": customer_name,
                "processedBy": processed_by,
                "items": branch_items,
            },
            "OUT",
        )
        prepared_payloads.append(payload)

    return prepared_payloads


def sync_billing_invoice_inventory_stock_out(invoice_record, product_items=None, processed_by=None, prepared_payloads=None):
    created_transactions = []
    payloads = prepared_payloads or prepare_billing_invoice_inventory_stock_out_payloads(
        invoice_record,
        product_items=product_items,
        processed_by=processed_by,
    )

    for payload in payloads:
        result = persist_inventory_transaction(payload)
        notify_inventory_transaction_created(result, payload)
        for item in (result.get("items") or []):
            notify_inventory_stock_state_transition(
                {
                    "inventory_item_id": item.get("inventory_item_id"),
                    "branch_id": item.get("branch_id"),
                    "current_stock": item.get("previous_stock"),
                    "critical_stock_level": item.get("critical_stock_level"),
                },
                {
                    "inventory_item_id": item.get("inventory_item_id"),
                    "branch_id": item.get("branch_id"),
                    "current_stock": item.get("new_stock"),
                    "critical_stock_level": item.get("critical_stock_level"),
                },
                actor_id=payload.get("processed_by"),
                source_event="billing_invoice_stock_out",
            )
        created_transactions.append(result)

    return created_transactions


def fetch_billing_source_invoice_index():
    try:
        response = execute_with_retry(
            lambda: supabase_admin.table("billing_invoices").select("*").order("created_at", desc=True).execute(),
            context="Fetch billing source invoice index"
        )
        rows = response.data or []
    except Exception as e:
        if is_missing_relation_error(e, "billing_invoices"):
            return {}
        print("Fetch billing source invoice index error:", str(e))
        return {}

    invoice_index = {}
    for row in rows:
        source_type = str(row.get("source_record_type") or "").strip().lower()
        source_id = row.get("source_record_id")
        invoice_status = str(row.get("status") or "completed").strip().lower()
        if source_type not in {"appointment", "walkin", "visit"} or source_id in (None, ""):
            continue
        if invoice_status in {"cancelled", "refunded"}:
            continue

        map_key = f"{source_type}-{source_id}"
        if map_key in invoice_index:
            continue

        invoice_index[map_key] = {
            "billingInvoiceId": row.get("billing_invoice_id"),
            "billingInvoiceNumber": row.get("invoice_number") or "",
            "invoiceType": row.get("invoice_type") or "",
            "paymentStatus": row.get("payment_status") or "",
            "status": invoice_status,
        }

    return invoice_index


def get_billing_invoice_from_index(invoice_index, source_record_type, source_record_id):
    normalized_source_type = str(source_record_type or "").strip().lower()
    if normalized_source_type not in {"appointment", "walkin", "visit"}:
        return None
    if source_record_id in (None, ""):
        return None
    return (invoice_index or {}).get(f"{normalized_source_type}-{source_record_id}")


def resolve_billing_invoice_for_visit(visit, invoice_index):
    visit_record = visit or {}
    direct_visit_invoice = get_billing_invoice_from_index(
        invoice_index,
        "visit",
        visit_record.get("medical_record_visit_id") or visit_record.get("id"),
    )
    if direct_visit_invoice:
        return direct_visit_invoice

    source_type = str(visit_record.get("source_type") or visit_record.get("sourceType") or "").strip().lower()
    source_id = visit_record.get("source_id")
    if source_id in (None, ""):
        source_id = visit_record.get("sourceId")

    if source_type in {"appointment", "walkin"}:
        return get_billing_invoice_from_index(invoice_index, source_type, source_id)

    return None


def get_active_billing_invoice_for_source(source_record_type, source_record_id):
    normalized_source_type = str(source_record_type or "").strip().lower()
    if normalized_source_type not in {"appointment", "walkin", "visit"}:
        return None
    if source_record_id in (None, ""):
        return None

    try:
        response = execute_with_retry(
            lambda: supabase_admin.table("billing_invoices").select("*").eq("source_record_type", normalized_source_type).eq("source_record_id", int(source_record_id)).order("created_at", desc=True).execute(),
            context="Fetch billing invoice by source"
        )
        rows = response.data or []
    except Exception as e:
        if is_missing_relation_error(e, "billing_invoices"):
            return None
        raise

    for row in rows:
        if str(row.get("status") or "completed").strip().lower() not in {"cancelled", "refunded"}:
            return row

    return None


def get_latest_emr_visit_links_by_source():
    try:
        response = execute_with_retry(
            lambda: supabase_admin.table("medical_record_visits").select("medical_record_visit_id,source_type,source_id,visit_date,visit_time").execute(),
            context="Fetch EMR visit source links"
        )
        rows = response.data or []
    except Exception as e:
        if is_missing_relation_error(e, "medical_record_visits"):
            return {}
        print("Fetch EMR visit source links error:", str(e))
        return {}

    linked_visits = {}

    def link_sort_key(row):
        parsed_date = parse_emr_date(row.get("visit_date")) or date.min
        normalized_time = normalize_db_time(row.get("visit_time")) or "00:00:00"
        return (parsed_date.isoformat(), normalized_time, int(row.get("medical_record_visit_id") or 0))

    for row in rows:
        source_type = str(row.get("source_type") or "").strip().lower()
        source_id = row.get("source_id")
        if source_type not in {"appointment", "walkin"} or source_id in (None, ""):
            continue

        map_key = f"{source_type}-{source_id}"
        existing = linked_visits.get(map_key)
        if existing is None or link_sort_key(row) >= link_sort_key(existing):
            linked_visits[map_key] = row

    return {
        key: {
            "visitId": row.get("medical_record_visit_id"),
            "sourceType": str(row.get("source_type") or "").strip().lower(),
            "sourceId": row.get("source_id"),
            "visitDate": normalize_emr_date(row.get("visit_date")) or "",
            "visitTime": normalize_db_time(row.get("visit_time")) or "",
        }
        for key, row in linked_visits.items()
    }


def build_billing_visit_service_items(selected_services, *, lookups=None):
    service_lookups = lookups or build_billing_service_lookups()
    service_items = []

    for index, service in enumerate(selected_services or [], start=1):
        if not isinstance(service, dict):
            continue

        service_name = str(service.get("name") or "").strip()
        if not service_name:
            continue

        service_items.append(
            build_billing_service_line_item(
                service_name,
                lookups=service_lookups,
                sort_order=index,
                unit_price=parse_emr_float(service.get("price")),
                service_id=service.get("serviceId"),
                service_code=service.get("serviceCode"),
            )
        )

    return service_items


def fetch_walkin_service_labels_by_ids(walkin_source_ids):
    normalized_ids = []
    for source_id in walkin_source_ids or []:
        if source_id in (None, ""):
            continue
        try:
            normalized_ids.append(int(source_id))
        except (TypeError, ValueError):
            continue

    if not normalized_ids:
        return {}

    try:
        response = execute_with_retry(
            lambda: supabase_admin.table("walkin_appointments").select("walkin_id,appointment_type").in_("walkin_id", normalized_ids).execute(),
            context="Fetch walk-in appointment services for billing"
        )
    except Exception as e:
        if is_missing_relation_error(e, "walkin_appointments"):
            return {}
        print("Fetch walk-in appointment services for billing error:", str(e))
        return {}

    return {
        str(row.get("walkin_id")): str(row.get("appointment_type") or "").strip()
        for row in (response.data or [])
        if row.get("walkin_id") not in (None, "")
    }


def build_billing_source_records(actor_id=None):
    completed_history_rows = build_admin_appointment_rows(include_history=True, actor_id=actor_id)
    appointments = []
    walkins = []
    service_lookups = build_billing_service_lookups()
    branch_scope = None
    if actor_id:
        branch_scope, branch_error = get_actor_branch_scope(actor_id)
        if branch_error:
            raise ValueError(branch_error)
    product_catalog = build_billing_product_catalog(branch_scope=branch_scope)
    emr_records = get_emr_records(
        include_billing=True,
        include_lab_results=False,
        include_vaccinations=False,
        include_medical_information=False,
    )
    latest_visit_by_appointment_source = {}
    latest_visit_by_walkin_source = {}
    walkin_source_ids = []

    for record in emr_records:
        for visit in record.get("visitHistory") or []:
            source_type = str(visit.get("sourceType") or "").strip().lower()
            source_id = str(visit.get("sourceId") or "").strip()

            if source_type == "appointment" and source_id:
                latest_visit_by_appointment_source[source_id] = {
                    "record": record,
                    "visit": visit,
                }
                continue

            if source_type == "walkin" and source_id:
                latest_visit_by_walkin_source[source_id] = {
                    "record": record,
                    "visit": visit,
                }
                walkin_source_ids.append(source_id)

    walkin_service_labels_by_id = fetch_walkin_service_labels_by_ids(walkin_source_ids)

    for record in emr_records:
        for visit in record.get("visitHistory") or []:
            source_type = str(visit.get("sourceType") or "").strip().lower()
            source_id = str(visit.get("sourceId") or "").strip()

            if source_type in {"appointment", "walkin"} and source_id:
                continue

            visit_branch_id = visit.get("branchId") or visit.get("branch_id")
            if branch_scope and not branch_scope.get("can_access_all"):
                if parse_branch_id(visit_branch_id) != branch_scope.get("branch_id"):
                    continue

            if visit.get("hasBillingInvoice"):
                continue

            service_items = build_billing_visit_service_items(
                visit.get("selectedServices") or [],
                lookups=service_lookups,
            )
            reason_is_service_fallback = False

            if not service_items:
                fallback_reason = str(visit.get("reason") or "").strip()
                fallback_reason_items = build_resolved_billing_service_items_from_label(
                    fallback_reason,
                    lookups=service_lookups,
                )
                if fallback_reason_items:
                    service_items = fallback_reason_items
                    reason_is_service_fallback = True

            if not service_items and source_type == "walkin" and source_id:
                service_items = build_resolved_billing_service_items_from_label(
                    walkin_service_labels_by_id.get(source_id),
                    lookups=service_lookups,
                )

            service_names = [item.get("name") for item in service_items if item.get("name")]
            amount = round(sum(float(item.get("total") or 0) for item in service_items), 2)
            prescription_suggestions = build_prescription_inventory_suggestions(
                visit.get("prescriptions") or [],
                product_catalog=product_catalog,
            )

            walkins.append({
                "id": str(visit.get("id") or ""),
                "recordType": "visit",
                "sourceRecordType": "visit",
                "sourceRecordId": str(visit.get("billingSourceId") or visit.get("id") or ""),
                "date": normalize_emr_date(visit.get("date")) or "",
                "time": visit.get("time") or "",
                "veterinarian": visit.get("veterinarian") or "Not Assigned",
                "petName": record.get("petName") or "",
                "petSpecies": ((record.get("petDetails") or {}).get("species") or ""),
                "petBreed": ((record.get("petDetails") or {}).get("breed") or ""),
                "ownerName": record.get("ownerName") or "",
                "ownerEmail": record.get("ownerEmail") or "",
                "ownerPhone": record.get("ownerContact") or "",
                "reason": visit.get("reason") or "",
                "services": service_names,
                "serviceItems": service_items,
                "amount": amount,
                "branchId": None,
                "status": "completed",
                "billingInvoiceId": visit.get("billingInvoiceId"),
                "billingInvoiceNumber": visit.get("billingInvoiceNumber"),
                "isBilled": False,
                "reasonIsServiceFallback": reason_is_service_fallback,
                "prescriptionProductSuggestions": prescription_suggestions,
            })

    for row in completed_history_rows:
        normalized_status = str(row.get("status") or "").strip().lower()
        if normalized_status != "completed":
            continue

        record_type = str(row.get("recordType") or "appointment").strip().lower()
        record_id = str(row.get("dbId") or "")

        if record_type == "appointment":
            linked_visit_context = latest_visit_by_appointment_source.get(record_id)
            if linked_visit_context:
                linked_visit = linked_visit_context.get("visit") or {}
                service_items = build_billing_visit_service_items(
                    linked_visit.get("selectedServices") or [],
                    lookups=service_lookups,
                )
                service_names = [item.get("name") for item in service_items if item.get("name")]
                amount = round(sum(float(item.get("total") or 0) for item in service_items), 2)
                prescription_suggestions = build_prescription_inventory_suggestions(
                    linked_visit.get("prescriptions") or [],
                    product_catalog=product_catalog,
                )
                if linked_visit.get("hasBillingInvoice"):
                    continue

                appointments.append({
                    "id": record_id,
                    "recordType": "appointment",
                    "sourceRecordType": "visit",
                    "sourceRecordId": str(linked_visit.get("billingSourceId") or linked_visit.get("id") or ""),
                    "linkedVisitId": str(linked_visit.get("id") or ""),
                    "date": normalize_emr_date(linked_visit.get("date")) or str(row.get("date_only") or row.get("appointment_date") or ""),
                    "time": linked_visit.get("time") or row.get("time_display") or format_display_time(row.get("appointment_time")) or "",
                    "veterinarian": linked_visit.get("veterinarian") or row.get("doctor") or "Not Assigned",
                    "petName": row.get("petName") or row.get("pet_name") or "",
                    "ownerName": row.get("ownerName") or row.get("owner_name") or "",
                    "ownerEmail": "" if row.get("email") == "Not provided" else (row.get("email") or ""),
                    "ownerPhone": "" if row.get("phone") == "Not provided" else (row.get("phone") or ""),
                    "services": service_names,
                    "serviceItems": service_items,
                    "amount": amount,
                    "reason": linked_visit.get("reason") or ("" if row.get("reason") == "Not provided" else (row.get("reason") or "")),
                    "branchId": row.get("branch_id"),
                    "status": normalized_status,
                    "billingInvoiceId": linked_visit.get("billingInvoiceId"),
                    "billingInvoiceNumber": linked_visit.get("billingInvoiceNumber"),
                    "isBilled": False,
                    "prescriptionProductSuggestions": prescription_suggestions,
                })
                continue

            if row.get("hasBillingInvoice"):
                continue

            service_label = row.get("service") or ""
            service_items = build_billing_service_items_from_label(service_label, lookups=service_lookups)
            service_names = [item.get("name") for item in service_items if item.get("name")]
            amount = round(sum(float(item.get("total") or 0) for item in service_items), 2)

            appointments.append({
                "id": record_id,
                "recordType": "appointment",
                "sourceRecordType": "appointment",
                "sourceRecordId": record_id,
                "linkedVisitId": None,
                "date": str(row.get("date_only") or row.get("appointment_date") or ""),
                "time": row.get("time_display") or format_display_time(row.get("appointment_time")) or "",
                "veterinarian": row.get("doctor") or "Not Assigned",
                "petName": row.get("petName") or row.get("pet_name") or "",
                "ownerName": row.get("ownerName") or row.get("owner_name") or "",
                "ownerEmail": "" if row.get("email") == "Not provided" else (row.get("email") or ""),
                "ownerPhone": "" if row.get("phone") == "Not provided" else (row.get("phone") or ""),
                "services": service_names or ([service_label] if service_label else []),
                "serviceItems": service_items,
                "amount": amount,
                "reason": "" if row.get("reason") == "Not provided" else (row.get("reason") or ""),
                "branchId": row.get("branch_id"),
                "status": normalized_status,
                "billingInvoiceId": row.get("billingInvoiceId"),
                "billingInvoiceNumber": row.get("billingInvoiceNumber"),
                "isBilled": False,
            })
            continue

        if record_type != "walkin":
            continue

        linked_visit_context = latest_visit_by_walkin_source.get(record_id)
        if linked_visit_context:
            linked_visit = (linked_visit_context or {}).get("visit") or {}
            service_items = build_billing_visit_service_items(
                linked_visit.get("selectedServices") or [],
                lookups=service_lookups,
            )
            service_names = [item.get("name") for item in service_items if item.get("name")]
            amount = round(sum(float(item.get("total") or 0) for item in service_items), 2)
            prescription_suggestions = build_prescription_inventory_suggestions(
                linked_visit.get("prescriptions") or [],
                product_catalog=product_catalog,
            )
            if linked_visit.get("hasBillingInvoice"):
                continue

            appointments.append({
                "id": record_id,
                "recordType": "appointment",
                "sourceRecordType": "visit",
                "sourceRecordId": str(linked_visit.get("billingSourceId") or linked_visit.get("id") or ""),
                "linkedVisitId": str(linked_visit.get("id") or ""),
                "appointmentSource": "clinic_created",
                "date": normalize_emr_date(linked_visit.get("date")) or str(row.get("date_only") or row.get("appointment_date") or ""),
                "time": linked_visit.get("time") or row.get("time_display") or format_display_time(row.get("appointment_time")) or "",
                "veterinarian": linked_visit.get("veterinarian") or row.get("doctor") or "Not Assigned",
                "petName": row.get("petName") or row.get("pet_name") or "",
                "ownerName": row.get("ownerName") or row.get("owner_name") or row.get("name") or "",
                "ownerEmail": "" if row.get("email") == "Not provided" else (row.get("email") or ""),
                "ownerPhone": "" if row.get("phone") == "Not provided" else (row.get("phone") or ""),
                "services": service_names,
                "serviceItems": service_items,
                "amount": amount,
                "reason": linked_visit.get("reason") or ("" if row.get("reason") == "Not provided" else (row.get("reason") or "")),
                "branchId": row.get("branch_id"),
                "status": normalized_status,
                "billingInvoiceId": linked_visit.get("billingInvoiceId"),
                "billingInvoiceNumber": linked_visit.get("billingInvoiceNumber"),
                "isBilled": False,
                "prescriptionProductSuggestions": prescription_suggestions,
            })
            continue

        if row.get("hasBillingInvoice"):
            continue

        service_label = row.get("service") or ""
        service_items = build_billing_service_items_from_label(service_label, lookups=service_lookups)
        service_names = [item.get("name") for item in service_items if item.get("name")]
        amount = round(sum(float(item.get("total") or 0) for item in service_items), 2)

        appointments.append({
            "id": record_id,
            "recordType": "appointment",
            "sourceRecordType": "walkin",
            "sourceRecordId": record_id,
            "linkedVisitId": None,
            "appointmentSource": "clinic_created",
            "date": str(row.get("date_only") or row.get("appointment_date") or ""),
            "time": row.get("time_display") or format_display_time(row.get("appointment_time")) or "",
            "veterinarian": row.get("doctor") or "Not Assigned",
            "petName": row.get("petName") or row.get("pet_name") or "",
            "ownerName": row.get("ownerName") or row.get("owner_name") or row.get("name") or "",
            "ownerEmail": "" if row.get("email") == "Not provided" else (row.get("email") or ""),
            "ownerPhone": "" if row.get("phone") == "Not provided" else (row.get("phone") or ""),
            "services": service_names or ([service_label] if service_label else []),
            "serviceItems": service_items,
            "amount": amount,
            "reason": "" if row.get("reason") == "Not provided" else (row.get("reason") or ""),
            "branchId": row.get("branch_id"),
            "status": normalized_status,
            "billingInvoiceId": row.get("billingInvoiceId"),
            "billingInvoiceNumber": row.get("billingInvoiceNumber"),
            "isBilled": False,
        })

    appointments.sort(
        key=lambda item: (
            item.get("date") or "",
            normalize_db_time(item.get("time") or ""),
            item.get("id") or "",
        ),
        reverse=True,
    )
    walkins.sort(
        key=lambda item: (
            item.get("date") or "",
            normalize_db_time(item.get("time") or ""),
            item.get("id") or "",
        ),
        reverse=True,
    )

    return {
        "appointments": appointments,
        "walkins": walkins,
    }


def generate_billing_invoice_number():
    current_year = get_current_manila_date().year
    response = execute_with_retry(
        lambda: supabase_admin.table("billing_invoices").select("invoice_number").ilike("invoice_number", f"INV-{current_year}-%").order("invoice_number", desc=True).limit(1).execute(),
        context="Generate billing invoice number"
    )
    next_number = 1

    if response.data:
        latest_number = str(response.data[0].get("invoice_number") or "")
        suffix = latest_number.rsplit("-", 1)[-1]
        if suffix.isdigit():
            next_number = int(suffix) + 1

    return f"INV-{current_year}-{str(next_number).zfill(4)}"


def calculate_billing_discount_amount(subtotal, discount_type, discount_value=None, discount_is_percentage=False):
    normalized_type = str(discount_type or "none").strip().lower()
    rounded_subtotal = round(float(subtotal or 0), 2)

    if normalized_type in BILLING_DISCOUNT_RATES:
        return round(rounded_subtotal * BILLING_DISCOUNT_RATES[normalized_type], 2)

    if normalized_type == "custom":
        numeric_value = float(discount_value or 0)
        if discount_is_percentage:
            return round(rounded_subtotal * (numeric_value / 100), 2)
        return round(min(numeric_value, rounded_subtotal), 2)

    return 0.0


def derive_billing_payment_status(payment_method, explicit_status=None):
    normalized_method = str(payment_method or "").strip().lower()
    normalized_status = str(explicit_status or "").strip().lower()

    if normalized_status in {"paid", "pending", "partial"}:
        return normalized_status

    if normalized_method == "installment":
        return "pending"

    return "paid"


def derive_billing_payment_state(total_amount, amount_paid):
    safe_total = round(max(float(total_amount or 0), 0), 2)
    safe_paid = round(max(float(amount_paid or 0), 0), 2)
    if safe_total > 0:
        safe_paid = min(safe_paid, safe_total)

    remaining_balance = round(max(safe_total - safe_paid, 0), 2)

    if remaining_balance <= 0:
        payment_status = "paid"
    elif safe_paid > 0:
        payment_status = "partial"
    else:
        payment_status = "pending"

    return {
        "amount_paid": safe_paid,
        "remaining_balance": remaining_balance,
        "payment_status": payment_status,
    }


def resolve_billing_payment_actor_id(raw_actor_id):
    normalized_actor_id = str(raw_actor_id or "").strip()
    if not normalized_actor_id:
        return None

    actor_profile = get_single_row("employee_accounts", "id", normalized_actor_id)
    if actor_profile:
        return normalized_actor_id

    return None


def build_billing_payment_handler_lookup(payment_records):
    actor_ids = sorted({
        str(record.get("created_by") or "").strip()
        for record in (payment_records or [])
        if str(record.get("created_by") or "").strip()
    })

    if not actor_ids:
        return {}

    try:
        response = execute_with_retry(
            lambda: supabase_admin.table("employee_accounts").select("id, first_name, last_name, username, email").in_("id", actor_ids).execute(),
            context="Fetch billing payment handlers"
        )
        return {
            str(profile.get("id")): get_profile_display_name(profile) or "Unknown staff"
            for profile in (response.data or [])
            if profile.get("id")
        }
    except Exception as e:
        print("Fetch billing payment handlers error:", str(e))
        return {}


def normalize_billing_payment_record(record, handler_lookup=None):
    payment_date = str(record.get("payment_date") or "")
    if payment_date and "T" in payment_date:
        payment_date = payment_date.split("T", 1)[0]

    actor_id = str(record.get("created_by") or "").strip()

    return {
        "id": str(record.get("billing_invoice_payment_id") or ""),
        "amount": round(float(record.get("payment_amount") or 0), 2),
        "paymentMethod": record.get("payment_method") or "cash",
        "date": payment_date,
        "time": format_display_time(str(record.get("payment_time") or "")),
        "handledBy": (handler_lookup or {}).get(actor_id, ""),
        "notes": record.get("notes") or "",
    }


def normalize_billing_invoice_service_item(record):
    quantity = int(record.get("quantity") or 1)
    unit_price = float(record.get("unit_price") or 0)
    return {
        "id": str(record.get("billing_invoice_service_item_id") or record.get("serviceId") or record.get("serviceCode") or record.get("item_name")),
        "serviceId": record.get("billing_service_id"),
        "name": record.get("item_name") or "",
        "description": record.get("item_description") or "",
        "quantity": quantity,
        "unitPrice": unit_price,
        "total": round(float(record.get("line_total") or (quantity * unit_price)), 2),
        "category": record.get("item_category") or "Other",
    }


def normalize_billing_invoice_product_item(record):
    quantity = int(record.get("quantity") or 1)
    unit_price = float(record.get("unit_price") or 0)
    raw_category = str(record.get("item_category") or "other").strip().lower()
    if raw_category not in {"food", "medicine", "accessory", "supplement", "other"}:
        raw_category = "other"

    return {
        "id": str(record.get("inventory_item_id") or record.get("billing_invoice_product_item_id") or record.get("item_name")),
        "inventoryItemId": record.get("inventory_item_id"),
        "name": record.get("item_name") or "",
        "sku": record.get("sku") or "",
        "description": record.get("item_description") or "",
        "quantity": quantity,
        "unitPrice": unit_price,
        "total": round(float(record.get("line_total") or (quantity * unit_price)), 2),
        "category": raw_category,
    }


def normalize_billing_invoice_record(record, service_items=None, product_items=None, payment_history=None, payment_handler_lookup=None):
    normalized_services = [normalize_billing_invoice_service_item(item) for item in (service_items or [])]
    normalized_products = [normalize_billing_invoice_product_item(item) for item in (product_items or [])]
    normalized_payments = [normalize_billing_payment_record(item, handler_lookup=payment_handler_lookup) for item in (payment_history or [])]

    invoice_date = str(record.get("invoice_date") or "")
    if invoice_date and "T" in invoice_date:
        invoice_date = invoice_date.split("T", 1)[0]

    payment_state = derive_billing_payment_state(
        record.get("total_amount"),
        record.get("amount_paid"),
    )
    payment_method = record.get("payment_method") or "cash"

    return {
        "id": str(record.get("billing_invoice_id") or ""),
        "invoiceNumber": record.get("invoice_number") or "",
        "date": invoice_date,
        "time": format_display_time(str(record.get("invoice_time") or "")),
        "invoiceType": record.get("invoice_type") or "walkin",
        "customerName": record.get("customer_name") or "",
        "customerEmail": record.get("customer_email") or "",
        "customerPhone": record.get("customer_phone") or "",
        "petName": record.get("pet_name") or "",
        "items": normalized_services,
        "products": normalized_products,
        "subtotal": round(float(record.get("subtotal") or 0), 2),
        "tax": round(float(record.get("tax_amount") or 0), 2),
        "discount": round(float(record.get("discount_amount") or 0), 2),
        "discountType": record.get("discount_type") or "none",
        "discountValue": float(record.get("discount_value") or 0) if record.get("discount_value") not in (None, "") else None,
        "discountIsPercentage": bool(record.get("discount_is_percentage")) if record.get("discount_is_percentage") is not None else None,
        "total": round(float(record.get("total_amount") or 0), 2),
        "amountPaid": payment_state["amount_paid"],
        "remainingBalance": payment_state["remaining_balance"],
        "paymentMethod": payment_method,
        "paymentStatus": payment_state["payment_status"],
        "status": record.get("status") or "completed",
        "notes": record.get("notes") or "",
        "sourceRecordType": record.get("source_record_type"),
        "sourceRecordId": record.get("source_record_id"),
        "branchId": record.get("branch_id"),
        "paymentHistory": normalized_payments,
    }


def fetch_billing_invoice_with_details(invoice_id):
    invoice_record = get_single_row("billing_invoices", "billing_invoice_id", invoice_id)
    if not invoice_record:
        return None

    service_items = execute_with_retry(
        lambda: supabase_admin.table("billing_invoice_service_items").select("*").eq("billing_invoice_id", invoice_id).order("sort_order").execute(),
        context="Fetch billing invoice service items by invoice"
    ).data or []
    product_items = execute_with_retry(
        lambda: supabase_admin.table("billing_invoice_product_items").select("*").eq("billing_invoice_id", invoice_id).order("sort_order").execute(),
        context="Fetch billing invoice product items by invoice"
    ).data or []
    payment_history = execute_with_retry(
        lambda: supabase_admin.table("billing_invoice_payments").select("*").eq("billing_invoice_id", invoice_id).order("payment_date", desc=True).order("payment_time", desc=True).execute(),
        context="Fetch billing invoice payments by invoice"
    ).data or []
    payment_handler_lookup = build_billing_payment_handler_lookup(payment_history)

    return normalize_billing_invoice_record(
        invoice_record,
        service_items=service_items,
        product_items=product_items,
        payment_history=payment_history,
        payment_handler_lookup=payment_handler_lookup,
    )


def parse_analytics_date(value, fallback):
    raw = str(value or "").strip()
    if not raw:
        return fallback
    try:
        return datetime.strptime(raw, "%Y-%m-%d").date()
    except ValueError:
        return fallback


def parse_analytics_row_date(value):
    if isinstance(value, date):
        return value
    raw = str(value or "").strip()
    if not raw:
        return None
    if "T" in raw:
        raw = raw.split("T", 1)[0]
    try:
        return datetime.strptime(raw[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


def analytics_float(value, default=0.0):
    try:
        return float(value or default)
    except (TypeError, ValueError):
        return float(default)


def analytics_int(value, default=0):
    try:
        return int(value or default)
    except (TypeError, ValueError):
        return int(default)


def analytics_change_percent(current_value, previous_value):
    current_number = analytics_float(current_value)
    previous_number = analytics_float(previous_value)
    if previous_number == 0:
        return 100 if current_number > 0 else 0
    return round(((current_number - previous_number) / previous_number) * 100)


def analytics_invoice_revenue(invoice):
    amount_paid = analytics_float(invoice.get("amount_paid"))
    total_amount = analytics_float(invoice.get("total_amount"))
    payment_status = str(invoice.get("payment_status") or "").strip().lower()
    if amount_paid > 0:
        return amount_paid
    if payment_status == "paid":
        return total_amount
    return 0.0


def analytics_is_valid_invoice(invoice):
    status = str(invoice.get("status") or "").strip().lower()
    return status in ("", "completed")


def analytics_hour_label(hour_value):
    hour_number = int(hour_value)
    suffix = "AM" if hour_number < 12 else "PM"
    display_hour = hour_number % 12 or 12
    return f"{display_hour} {suffix}"


def analytics_extract_hour(value):
    raw = str(value or "").strip()
    if not raw:
        return None
    try:
        return int(raw.split(":", 1)[0])
    except (TypeError, ValueError):
        return None


def fetch_analytics_table_rows(table_name, date_column=None, start_date=None, end_date=None, branch_id=None, context=None):
    query = supabase_admin.table(table_name).select("*")
    if date_column and start_date:
        query = query.gte(date_column, start_date.isoformat())
    if date_column and end_date:
        query = query.lte(date_column, end_date.isoformat())
    if branch_id not in (None, ""):
        query = query.eq("branch_id", int(branch_id))
    return execute_with_retry(
        lambda: query.execute(),
        context=context or f"Fetch analytics {table_name}"
    ).data or []


def analytics_get_random_forest_regressor():
    try:
        from sklearn.ensemble import RandomForestRegressor
        return RandomForestRegressor, None
    except Exception as exc:
        return None, str(exc)


def analytics_date_features(day_value, base_date):
    days_from_start = (day_value - base_date).days
    return [
        days_from_start,
        day_value.weekday(),
        day_value.day,
        day_value.month,
        1 if day_value.weekday() >= 5 else 0,
    ]


def analytics_average_for_window(value_by_date, end_date, days=7):
    values = [
        analytics_float(value_by_date.get(end_date - timedelta(days=offset)))
        for offset in range(1, days + 1)
    ]
    return round(sum(values) / len(values), 2) if values else 0


def analytics_build_rich_daily_feature(day_value, base_date, metrics_by_date):
    revenue_by_date = metrics_by_date.get("revenue", {})
    transaction_count_by_date = metrics_by_date.get("transactions", {})
    appointment_count_by_date = metrics_by_date.get("appointments", {})
    service_revenue_by_date = metrics_by_date.get("serviceRevenue", {})
    product_revenue_by_date = metrics_by_date.get("productRevenue", {})

    previous_day = day_value - timedelta(days=1)
    return [
        *analytics_date_features(day_value, base_date),
        analytics_float(revenue_by_date.get(previous_day)),
        analytics_average_for_window(revenue_by_date, day_value, 7),
        analytics_average_for_window(transaction_count_by_date, day_value, 7),
        analytics_average_for_window(appointment_count_by_date, day_value, 7),
        analytics_average_for_window(service_revenue_by_date, day_value, 7),
        analytics_average_for_window(product_revenue_by_date, day_value, 7),
    ]


def analytics_rich_weekday_fallback_predictions(metrics_by_date, future_dates, fallback_average):
    revenue_by_date = metrics_by_date.get("revenue", {})
    return analytics_weekday_fallback_predictions(revenue_by_date, future_dates, fallback_average)


def analytics_predict_rich_daily_revenue(metrics_by_date, history_start, history_end, future_dates, fallback_average=0, min_samples=21, min_positive_samples=5):
    future_dates = list(future_dates or [])
    revenue_by_date = metrics_by_date.get("revenue", {})
    if not future_dates:
        return {
            "mode": "trend",
            "reason": "no future dates requested",
            "predictions": [],
            "trainingSamples": 0,
        }

    history_days = max((history_end - history_start).days + 1, 1)
    history_dates = [history_start + timedelta(days=offset) for offset in range(history_days)]
    samples = [
        analytics_build_rich_daily_feature(day_value, history_start, metrics_by_date)
        for day_value in history_dates
    ]
    targets = [analytics_float(revenue_by_date.get(day_value)) for day_value in history_dates]

    RandomForestRegressor, dependency_error = analytics_get_random_forest_regressor()
    if dependency_error:
        return {
            "mode": "trend",
            "reason": "scikit-learn is not installed",
            "dependencyError": dependency_error,
            "predictions": analytics_rich_weekday_fallback_predictions(
                metrics_by_date,
                future_dates,
                analytics_float(fallback_average),
            ),
            "trainingSamples": 0,
            "featureSet": "rich_daily_lagged",
        }

    clean_samples = []
    clean_targets = []
    for sample, target in zip(samples, targets):
        try:
            clean_samples.append([float(value) for value in sample])
            clean_targets.append(float(target or 0))
        except (TypeError, ValueError):
            continue

    positive_samples = sum(1 for target in clean_targets if target > 0)
    unique_targets = {round(target, 2) for target in clean_targets}
    if len(clean_samples) < min_samples or positive_samples < min_positive_samples or len(unique_targets) < 2:
        return {
            "mode": "trend",
            "reason": "not enough historical data for RandomForestRegressor",
            "predictions": analytics_rich_weekday_fallback_predictions(
                metrics_by_date,
                future_dates,
                analytics_float(fallback_average),
            ),
            "trainingSamples": len(clean_samples),
            "positiveSamples": positive_samples,
            "featureSet": "rich_daily_lagged",
        }

    future_metrics = {
        key: dict(value or {})
        for key, value in (metrics_by_date or {}).items()
    }

    try:
        model = RandomForestRegressor(
            n_estimators=180,
            random_state=42,
            min_samples_leaf=1,
            max_features="sqrt",
        )
        model.fit(clean_samples, clean_targets)
        predictions = []
        for day_value in future_dates:
            feature = analytics_build_rich_daily_feature(day_value, history_start, future_metrics)
            prediction = round(max(float(model.predict([[float(value) for value in feature]])[0]), 0), 2)
            predictions.append(prediction)
            future_metrics.setdefault("revenue", {})[day_value] = prediction
            future_metrics.setdefault("transactions", {})[day_value] = analytics_average_for_window(future_metrics.get("transactions", {}), day_value, 7)
            future_metrics.setdefault("appointments", {})[day_value] = analytics_average_for_window(future_metrics.get("appointments", {}), day_value, 7)
            future_metrics.setdefault("serviceRevenue", {})[day_value] = analytics_average_for_window(future_metrics.get("serviceRevenue", {}), day_value, 7)
            future_metrics.setdefault("productRevenue", {})[day_value] = analytics_average_for_window(future_metrics.get("productRevenue", {}), day_value, 7)

        return {
            "mode": "ml",
            "reason": None,
            "predictions": predictions,
            "trainingSamples": len(clean_samples),
            "positiveSamples": positive_samples,
            "featureSet": "rich_daily_lagged",
        }
    except Exception as exc:
        return {
            "mode": "trend",
            "reason": f"RandomForestRegressor failed: {exc}",
            "predictions": analytics_rich_weekday_fallback_predictions(
                metrics_by_date,
                future_dates,
                analytics_float(fallback_average),
            ),
            "trainingSamples": len(clean_samples),
            "positiveSamples": positive_samples,
            "featureSet": "rich_daily_lagged",
        }


def analytics_hour_features(day_value, hour_value, base_date):
    return [*analytics_date_features(day_value, base_date), int(hour_value)]


def analytics_fit_predict_random_forest(samples, targets, future_samples, min_samples=14, min_positive_samples=5):
    RandomForestRegressor, dependency_error = analytics_get_random_forest_regressor()
    if dependency_error:
        return {
            "mode": "trend",
            "reason": "scikit-learn is not installed",
            "dependencyError": dependency_error,
            "predictions": [],
            "trainingSamples": 0,
        }

    clean_samples = []
    clean_targets = []
    for sample, target in zip(samples, targets):
        try:
            clean_samples.append([float(value) for value in sample])
            clean_targets.append(float(target or 0))
        except (TypeError, ValueError):
            continue

    positive_samples = sum(1 for target in clean_targets if target > 0)
    unique_targets = {round(target, 2) for target in clean_targets}
    if len(clean_samples) < min_samples or positive_samples < min_positive_samples or len(unique_targets) < 2:
        return {
            "mode": "trend",
            "reason": "not enough historical data for RandomForestRegressor",
            "predictions": [],
            "trainingSamples": len(clean_samples),
            "positiveSamples": positive_samples,
        }

    try:
        model = RandomForestRegressor(
            n_estimators=120,
            random_state=42,
            min_samples_leaf=1,
        )
        model.fit(clean_samples, clean_targets)
        predictions = model.predict(future_samples)
        return {
            "mode": "ml",
            "reason": None,
            "predictions": [round(max(float(value), 0), 2) for value in predictions],
            "trainingSamples": len(clean_samples),
            "positiveSamples": positive_samples,
        }
    except Exception as exc:
        return {
            "mode": "trend",
            "reason": f"RandomForestRegressor failed: {exc}",
            "predictions": [],
            "trainingSamples": len(clean_samples),
            "positiveSamples": positive_samples,
        }


def analytics_weekday_fallback_predictions(dated_values, future_dates, fallback_average):
    predictions = []
    for future_date in future_dates:
        weekday_values = [
            value
            for date_key, value in dated_values.items()
            if date_key.weekday() == future_date.weekday()
        ]
        forecast_value = round(sum(weekday_values) / len(weekday_values), 2) if weekday_values else fallback_average
        predictions.append(round(max(forecast_value, 0), 2))
    return predictions


def analytics_predict_daily_values(dated_values, history_start, history_end, future_dates, fallback_average=0, min_samples=14, min_positive_samples=5):
    future_dates = list(future_dates or [])
    if not future_dates:
        return {
            "mode": "trend",
            "reason": "no future dates requested",
            "predictions": [],
            "trainingSamples": 0,
        }

    history_days = max((history_end - history_start).days + 1, 1)
    history_dates = [history_start + timedelta(days=offset) for offset in range(history_days)]
    samples = [analytics_date_features(day_value, history_start) for day_value in history_dates]
    targets = [analytics_float(dated_values.get(day_value)) for day_value in history_dates]
    future_samples = [analytics_date_features(day_value, history_start) for day_value in future_dates]
    result = analytics_fit_predict_random_forest(
        samples,
        targets,
        future_samples,
        min_samples=min_samples,
        min_positive_samples=min_positive_samples,
    )
    result["featureSet"] = "calendar_date"
    if result.get("mode") == "ml":
        return result

    result["predictions"] = analytics_weekday_fallback_predictions(
        dated_values,
        future_dates,
        analytics_float(fallback_average),
    )
    result["featureSet"] = "calendar_date"
    return result


def analytics_predict_hourly_counts(hourly_counts, history_start, history_end, target_date, display_hours):
    display_hours = list(display_hours or [])
    if not display_hours:
        return {
            "mode": "trend",
            "reason": "no display hours requested",
            "predictionsByHour": {},
            "trainingSamples": 0,
        }

    history_days = max((history_end - history_start).days + 1, 1)
    history_dates = [history_start + timedelta(days=offset) for offset in range(history_days)]
    samples = []
    targets = []
    for day_value in history_dates:
        for hour_value in display_hours:
            samples.append(analytics_hour_features(day_value, hour_value, history_start))
            targets.append(analytics_float(hourly_counts.get((day_value, hour_value))))

    future_samples = [
        analytics_hour_features(target_date, hour_value, history_start)
        for hour_value in display_hours
    ]
    result = analytics_fit_predict_random_forest(
        samples,
        targets,
        future_samples,
        min_samples=30,
        min_positive_samples=5,
    )
    if result.get("mode") == "ml":
        result["predictionsByHour"] = {
            hour_value: round(prediction, 2)
            for hour_value, prediction in zip(display_hours, result.get("predictions", []))
        }
        return result

    day_count = max(len(history_dates), 1)
    fallback_by_hour = {}
    for hour_value in display_hours:
        hour_total = sum(
            analytics_float(hourly_counts.get((day_value, hour_value)))
            for day_value in history_dates
        )
        fallback_by_hour[hour_value] = round(hour_total / day_count, 2)
    result["predictionsByHour"] = fallback_by_hour
    return result


def analytics_trim_metrics_to_date(metrics_by_date, end_date):
    return {
        key: {
            day_value: value
            for day_value, value in (value_by_date or {}).items()
            if day_value <= end_date
        }
        for key, value_by_date in (metrics_by_date or {}).items()
    }


def analytics_build_revenue_validation(dated_values, history_start, available_end, fallback_average=0, days=14, metrics_by_date=None):
    available_dates = sorted(day_value for day_value, value in dated_values.items() if day_value <= available_end and analytics_float(value) > 0)
    if len(available_dates) < 8:
        return {
            "mode": "trend",
            "reason": "not enough actual revenue days for validation",
            "accuracy": None,
            "meanAbsoluteError": None,
            "rows": [],
            "trainingSamples": 0,
        }

    validation_end = available_dates[-1]
    validation_start = max(available_dates[0], validation_end - timedelta(days=days - 1))
    validation_dates = [
        validation_start + timedelta(days=offset)
        for offset in range((validation_end - validation_start).days + 1)
    ]
    validation_dates = [day_value for day_value in validation_dates if day_value in dated_values]
    train_end = validation_start - timedelta(days=1)
    if train_end < history_start or len(validation_dates) < 3:
        return {
            "mode": "trend",
            "reason": "not enough earlier data for validation split",
            "accuracy": None,
            "meanAbsoluteError": None,
            "rows": [],
            "trainingSamples": 0,
        }

    if metrics_by_date:
        validation_forecast = analytics_predict_rich_daily_revenue(
            analytics_trim_metrics_to_date(metrics_by_date, train_end),
            history_start,
            train_end,
            validation_dates,
            fallback_average=fallback_average,
            min_samples=21,
            min_positive_samples=5,
        )
    else:
        validation_forecast = analytics_predict_daily_values(
            dated_values,
            history_start,
            train_end,
            validation_dates,
            fallback_average=fallback_average,
            min_samples=21,
            min_positive_samples=5,
        )
    predictions = validation_forecast.get("predictions", [])
    rows = []
    absolute_errors = []
    percentage_errors = []
    for day_value, predicted_value in zip(validation_dates, predictions):
        actual_value = round(analytics_float(dated_values.get(day_value)), 2)
        predicted_value = round(analytics_float(predicted_value), 2)
        absolute_error = round(abs(actual_value - predicted_value), 2)
        error_percent = round((absolute_error / actual_value) * 100, 1) if actual_value > 0 else None
        rows.append({
            "date": day_value.isoformat(),
            "day": day_value.strftime("%b %d"),
            "actual": actual_value,
            "predicted": predicted_value,
            "error": absolute_error,
            "errorPercent": error_percent,
        })
        absolute_errors.append(absolute_error)
        if error_percent is not None:
            percentage_errors.append(error_percent)

    mean_absolute_error = round(sum(absolute_errors) / len(absolute_errors), 2) if absolute_errors else None
    mean_percentage_error = round(sum(percentage_errors) / len(percentage_errors), 1) if percentage_errors else None
    accuracy = max(0, round(100 - mean_percentage_error, 1)) if mean_percentage_error is not None else None

    return {
        "mode": validation_forecast.get("mode"),
        "reason": validation_forecast.get("reason"),
        "accuracy": accuracy,
        "meanAbsoluteError": mean_absolute_error,
        "meanAbsolutePercentageError": mean_percentage_error,
        "rows": rows,
        "trainingSamples": validation_forecast.get("trainingSamples", 0),
        "positiveSamples": validation_forecast.get("positiveSamples", 0),
        "featureSet": validation_forecast.get("featureSet"),
        "validationStartDate": validation_dates[0].isoformat() if validation_dates else None,
        "validationEndDate": validation_dates[-1].isoformat() if validation_dates else None,
    }


def analytics_validation_score(validation_result):
    accuracy = validation_result.get("accuracy") if validation_result else None
    return float(accuracy) if accuracy is not None else -1


def build_admin_analytics_overview(branch_id=None, start_date=None, end_date=None):
    today = get_current_manila_date()
    current_end = end_date or today
    current_start = start_date or (current_end - timedelta(days=29))
    if current_start > current_end:
        current_start, current_end = current_end, current_start

    period_days = max((current_end - current_start).days + 1, 1)
    previous_end = current_start - timedelta(days=1)
    previous_start = previous_end - timedelta(days=period_days - 1)
    analytics_history_start = min(previous_start, current_end - timedelta(days=179))

    branch_filter = int(branch_id) if branch_id not in (None, "", "all", "All") else None

    branch_rows = execute_with_retry(
        lambda: supabase_admin.table("branches").select("*").order("branch_id").execute(),
        context="Fetch analytics branches"
    ).data or []
    branches = [
        {
            "id": row.get("branch_id"),
            "name": row.get("branch_name") or f"Branch {row.get('branch_id')}",
        }
        for row in branch_rows
    ]

    invoice_rows = fetch_analytics_table_rows(
        "billing_invoices",
        "invoice_date",
        analytics_history_start,
        current_end,
        branch_filter,
        context="Fetch analytics billing invoices"
    )
    invoice_rows = [row for row in invoice_rows if analytics_is_valid_invoice(row)]
    current_invoices = []
    previous_invoices = []
    current_invoice_ids = []
    previous_invoice_ids = []
    history_invoice_ids = []
    invoice_date_by_id = {}

    for invoice in invoice_rows:
        invoice_date = parse_analytics_row_date(invoice.get("invoice_date"))
        if not invoice_date:
            continue
        invoice_id = invoice.get("billing_invoice_id")
        if invoice_id not in (None, ""):
            history_invoice_ids.append(invoice_id)
            invoice_date_by_id[str(invoice_id)] = invoice_date
        if current_start <= invoice_date <= current_end:
            current_invoices.append(invoice)
            current_invoice_ids.append(invoice.get("billing_invoice_id"))
        elif previous_start <= invoice_date <= previous_end:
            previous_invoices.append(invoice)
            previous_invoice_ids.append(invoice.get("billing_invoice_id"))

    all_invoice_ids = [
        invoice_id
        for invoice_id in history_invoice_ids
        if invoice_id not in (None, "")
    ]
    service_rows = []
    product_rows = []
    payment_rows = []
    if all_invoice_ids:
        service_rows = execute_with_retry(
            lambda: supabase_admin.table("billing_invoice_service_items").select("*").in_("billing_invoice_id", all_invoice_ids).execute(),
            context="Fetch analytics billing service items"
        ).data or []
        product_rows = execute_with_retry(
            lambda: supabase_admin.table("billing_invoice_product_items").select("*").in_("billing_invoice_id", all_invoice_ids).execute(),
            context="Fetch analytics billing product items"
        ).data or []
        payment_rows = execute_with_retry(
            lambda: supabase_admin.table("billing_invoice_payments").select("*").in_("billing_invoice_id", all_invoice_ids).execute(),
            context="Fetch analytics billing payments"
        ).data or []

    current_invoice_id_set = {str(invoice_id) for invoice_id in current_invoice_ids if invoice_id not in (None, "")}
    previous_invoice_id_set = {str(invoice_id) for invoice_id in previous_invoice_ids if invoice_id not in (None, "")}

    current_revenue = round(sum(analytics_invoice_revenue(invoice) for invoice in current_invoices), 2)
    previous_revenue = round(sum(analytics_invoice_revenue(invoice) for invoice in previous_invoices), 2)
    current_transaction_count = len(current_invoices)
    previous_transaction_count = len(previous_invoices)
    current_avg_transaction = round(current_revenue / current_transaction_count, 2) if current_transaction_count else 0
    previous_avg_transaction = round(previous_revenue / previous_transaction_count, 2) if previous_transaction_count else 0

    appointment_rows = fetch_analytics_table_rows(
        "appointments",
        "appointment_date",
        analytics_history_start,
        current_end,
        branch_filter,
        context="Fetch analytics appointments"
    )
    walkin_rows = fetch_analytics_table_rows(
        "walkin_appointments",
        "appointment_date",
        analytics_history_start,
        current_end,
        branch_filter,
        context="Fetch analytics walk-in appointments"
    )

    def split_completed_appointment_rows(rows):
        current_rows = []
        previous_rows = []
        for row in rows:
            if str(row.get("status") or "").strip().lower() != "completed":
                continue
            appointment_date = parse_analytics_row_date(row.get("appointment_date"))
            if not appointment_date:
                continue
            if current_start <= appointment_date <= current_end:
                current_rows.append(row)
            elif previous_start <= appointment_date <= previous_end:
                previous_rows.append(row)
        return current_rows, previous_rows

    current_appointments, previous_appointments = split_completed_appointment_rows(appointment_rows)
    current_walkins, previous_walkins = split_completed_appointment_rows(walkin_rows)
    completed_appointments = [*current_appointments, *current_walkins]
    previous_completed_appointments = [*previous_appointments, *previous_walkins]

    revenue_by_date = {}
    historical_revenue_by_date = {}
    historical_transaction_count_by_date = {}
    historical_service_revenue_by_date = {}
    historical_product_revenue_by_date = {}
    historical_appointment_count_by_date = {}
    appointments_by_date = {}
    completed_appointment_history = []
    appointments_by_date_hour = {}
    for invoice in invoice_rows:
        invoice_id = str(invoice.get("billing_invoice_id") or "")
        invoice_date = invoice_date_by_id.get(invoice_id) or parse_analytics_row_date(invoice.get("invoice_date"))
        if invoice_date:
            historical_revenue_by_date[invoice_date] = historical_revenue_by_date.get(invoice_date, 0) + analytics_invoice_revenue(invoice)
            historical_transaction_count_by_date[invoice_date] = historical_transaction_count_by_date.get(invoice_date, 0) + 1
    for invoice in current_invoices:
        invoice_date = parse_analytics_row_date(invoice.get("invoice_date"))
        if invoice_date:
            revenue_by_date[invoice_date] = revenue_by_date.get(invoice_date, 0) + analytics_invoice_revenue(invoice)
    for appointment in [*appointment_rows, *walkin_rows]:
        if str(appointment.get("status") or "").strip().lower() != "completed":
            continue
        appointment_date = parse_analytics_row_date(appointment.get("appointment_date"))
        appointment_hour = analytics_extract_hour(appointment.get("appointment_time"))
        if not appointment_date:
            continue
        completed_appointment_history.append(appointment)
        historical_appointment_count_by_date[appointment_date] = historical_appointment_count_by_date.get(appointment_date, 0) + 1
        if appointment_hour is not None:
            key = (appointment_date, appointment_hour)
            appointments_by_date_hour[key] = appointments_by_date_hour.get(key, 0) + 1
    for appointment in completed_appointments:
        appointment_date = parse_analytics_row_date(appointment.get("appointment_date"))
        if appointment_date:
            appointments_by_date[appointment_date] = appointments_by_date.get(appointment_date, 0) + 1

    for service in service_rows:
        invoice_id = str(service.get("billing_invoice_id") or "")
        invoice_date = invoice_date_by_id.get(invoice_id)
        if invoice_date:
            historical_service_revenue_by_date[invoice_date] = historical_service_revenue_by_date.get(invoice_date, 0) + analytics_float(service.get("line_total"))

    for product in product_rows:
        invoice_id = str(product.get("billing_invoice_id") or "")
        invoice_date = invoice_date_by_id.get(invoice_id)
        if invoice_date:
            historical_product_revenue_by_date[invoice_date] = historical_product_revenue_by_date.get(invoice_date, 0) + analytics_float(product.get("line_total"))

    recent_start = max(current_start, current_end - timedelta(days=6))
    recent_dates = [recent_start + timedelta(days=offset) for offset in range((current_end - recent_start).days + 1)]
    recent_values = [revenue_by_date.get(day_value, 0) for day_value in recent_dates]
    recent_average = round(sum(recent_values) / len(recent_values), 2) if recent_values else 0
    if recent_average <= 0 and current_revenue > 0:
        recent_average = round(current_revenue / period_days, 2)

    future_period_dates = [current_end + timedelta(days=offset) for offset in range(1, period_days + 1)]
    daily_forecast_metrics = {
        "revenue": historical_revenue_by_date,
        "transactions": historical_transaction_count_by_date,
        "appointments": historical_appointment_count_by_date,
        "serviceRevenue": historical_service_revenue_by_date,
        "productRevenue": historical_product_revenue_by_date,
    }
    rich_revenue_forecast = analytics_predict_rich_daily_revenue(
        daily_forecast_metrics,
        analytics_history_start,
        current_end,
        future_period_dates,
        fallback_average=recent_average,
        min_samples=21,
        min_positive_samples=5,
    )
    rich_revenue_validation = analytics_build_revenue_validation(
        historical_revenue_by_date,
        analytics_history_start,
        current_end,
        fallback_average=recent_average,
        days=14,
        metrics_by_date=daily_forecast_metrics,
    )
    calendar_revenue_forecast = analytics_predict_daily_values(
        historical_revenue_by_date,
        analytics_history_start,
        current_end,
        future_period_dates,
        fallback_average=recent_average,
        min_samples=21,
        min_positive_samples=5,
    )
    calendar_revenue_validation = analytics_build_revenue_validation(
        historical_revenue_by_date,
        analytics_history_start,
        current_end,
        fallback_average=recent_average,
        days=14,
    )
    if analytics_validation_score(rich_revenue_validation) >= analytics_validation_score(calendar_revenue_validation):
        revenue_forecast = rich_revenue_forecast
        revenue_validation = rich_revenue_validation
    else:
        revenue_forecast = calendar_revenue_forecast
        revenue_validation = calendar_revenue_validation

    future_revenue_by_date = {
        day_value: prediction
        for day_value, prediction in zip(future_period_dates, revenue_forecast.get("predictions", []))
    }

    sales_trend = []
    for day_value in recent_dates:
        actual_revenue = round(revenue_by_date.get(day_value, 0), 2)
        sales_trend.append({
            "day": day_value.strftime("%a"),
            "actual": actual_revenue,
            "predicted": actual_revenue,
            "appointments": appointments_by_date.get(day_value, 0),
        })
    for offset in range(1, 4):
        future_date = current_end + timedelta(days=offset)
        weekday_values = [
            revenue
            for date_key, revenue in revenue_by_date.items()
            if date_key.weekday() == future_date.weekday()
        ]
        forecast_value = future_revenue_by_date.get(future_date)
        if forecast_value is None:
            forecast_value = round(sum(weekday_values) / len(weekday_values), 2) if weekday_values else recent_average
        sales_trend.append({
            "day": f"{future_date.strftime('%a')} (Fcst)",
            "actual": None,
            "predicted": forecast_value,
            "appointments": None,
        })

    invoice_period_by_id = {
        **{str(invoice_id): "current" for invoice_id in current_invoice_ids if invoice_id not in (None, "")},
        **{str(invoice_id): "previous" for invoice_id in previous_invoice_ids if invoice_id not in (None, "")},
    }
    service_current = {}
    service_previous = {}
    service_counts = {}
    product_current = {}
    product_previous = {}
    product_counts = {}
    product_revenue = {}
    product_quantity_by_key_date = {}

    for service in service_rows:
        invoice_id = str(service.get("billing_invoice_id") or "")
        period = invoice_period_by_id.get(invoice_id)
        if not period:
            continue
        service_name = str(service.get("item_name") or "Service").strip() or "Service"
        amount = analytics_float(service.get("line_total"))
        quantity = analytics_int(service.get("quantity"), default=1)
        if period == "current":
            service_current[service_name] = service_current.get(service_name, 0) + amount
            service_counts[service_name] = service_counts.get(service_name, 0) + quantity
        else:
            service_previous[service_name] = service_previous.get(service_name, 0) + amount

    for product in product_rows:
        invoice_id = str(product.get("billing_invoice_id") or "")
        product_key = str(product.get("inventory_item_id") or product.get("item_name") or "").strip()
        product_name = str(product.get("item_name") or "Product").strip() or "Product"
        amount = analytics_float(product.get("line_total"))
        quantity = analytics_int(product.get("quantity"), default=1)
        invoice_date = invoice_date_by_id.get(invoice_id)
        if product_key and invoice_date:
            product_date_values = product_quantity_by_key_date.setdefault(product_key, {})
            product_date_values[invoice_date] = product_date_values.get(invoice_date, 0) + quantity
        period = invoice_period_by_id.get(invoice_id)
        if not period:
            continue
        if period == "current":
            product_current[product_key] = product_name
            product_counts[product_key] = product_counts.get(product_key, 0) + quantity
            product_revenue[product_key] = product_revenue.get(product_key, 0) + amount
        else:
            product_previous[product_key] = product_previous.get(product_key, 0) + quantity

    top_services = [
        {
            "service": service_name,
            "revenue": round(revenue, 2),
            "count": service_counts.get(service_name, 0),
            "trend": analytics_change_percent(revenue, service_previous.get(service_name, 0)),
        }
        for service_name, revenue in sorted(service_current.items(), key=lambda item: item[1], reverse=True)[:6]
    ]

    inventory_rows = fetch_analytics_table_rows(
        "inventory_items",
        None,
        None,
        None,
        branch_filter,
        context="Fetch analytics inventory items"
    )
    inventory_by_id = {
        str(item.get("inventory_item_id")): item
        for item in inventory_rows
        if item.get("inventory_item_id") not in (None, "")
    }

    top_products = []
    product_forecast_modes = []
    product_future_dates = [current_end + timedelta(days=offset) for offset in range(1, 8)]
    for product_key, quantity in sorted(product_counts.items(), key=lambda item: item[1], reverse=True)[:6]:
        item = inventory_by_id.get(product_key)
        stock = analytics_int((item or {}).get("current_stock"))
        daily_usage = quantity / period_days if period_days else 0
        days_until_out = round(stock / daily_usage, 1) if daily_usage > 0 else 999
        product_forecast = analytics_predict_daily_values(
            product_quantity_by_key_date.get(product_key, {}),
            analytics_history_start,
            current_end,
            product_future_dates,
            fallback_average=daily_usage,
            min_samples=14,
            min_positive_samples=3,
        )
        product_forecast_modes.append(product_forecast.get("mode", "trend"))
        predicted_demand = round(sum(product_forecast.get("predictions", [])), 2)
        top_products.append({
            "product": product_current.get(product_key) or (item or {}).get("item_name") or "Product",
            "quantitySold": quantity,
            "revenue": round(product_revenue.get(product_key, 0), 2),
            "daysUntilOut": days_until_out,
            "predictedDemand": predicted_demand,
            "demandForecastMode": product_forecast.get("mode", "trend"),
        })

    service_sales_total = round(sum(service_current.values()), 2)
    product_sales_total = round(sum(product_revenue.values()), 2)
    total_item_sales = service_sales_total + product_sales_total
    if total_item_sales > 0:
        service_share = round((service_sales_total / total_item_sales) * 100, 1)
        product_share = round((product_sales_total / total_item_sales) * 100, 1)
    else:
        service_share = 0
        product_share = 0

    sales_distribution = [
        {"name": "Services", "value": service_share, "color": "#3d67ee"},
        {"name": "Products", "value": product_share, "color": "#10b981"},
    ]

    invoice_sales_by_hour = {}
    for invoice in current_invoices:
        invoice_hour = analytics_extract_hour(invoice.get("invoice_time"))
        if invoice_hour is not None:
            invoice_sales_by_hour[invoice_hour] = invoice_sales_by_hour.get(invoice_hour, 0) + analytics_invoice_revenue(invoice)

    appointments_by_hour = {}
    for appointment in completed_appointments:
        appointment_hour = analytics_extract_hour(appointment.get("appointment_time"))
        if appointment_hour is not None:
            appointments_by_hour[appointment_hour] = appointments_by_hour.get(appointment_hour, 0) + 1

    display_hours = sorted(set([*range(8, 18), *appointments_by_hour.keys(), *invoice_sales_by_hour.keys()]))
    hourly_appointment_forecast = analytics_predict_hourly_counts(
        appointments_by_date_hour,
        analytics_history_start,
        current_end,
        current_end + timedelta(days=1),
        display_hours,
    )
    predicted_appointments_by_hour = hourly_appointment_forecast.get("predictionsByHour", {})
    peak_hours = [
        {
            "hour": analytics_hour_label(hour_value),
            "appointments": appointments_by_hour.get(hour_value, 0),
            "sales": round(invoice_sales_by_hour.get(hour_value, 0), 2),
            "predicted": predicted_appointments_by_hour.get(hour_value, appointments_by_hour.get(hour_value, 0)),
        }
        for hour_value in display_hours
    ]

    inventory_items = []
    for item in inventory_rows:
        if bool(item.get("is_archived")):
            continue
        item_id = str(item.get("inventory_item_id") or "")
        stock = analytics_int(item.get("current_stock"))
        reorder_point = analytics_int(item.get("critical_stock_level"), default=10)
        sold_quantity = product_counts.get(item_id, 0)
        daily_usage = round(sold_quantity / period_days, 2) if period_days else 0
        if daily_usage >= 3:
            movement_rate = "fast"
        elif daily_usage >= 1:
            movement_rate = "medium"
        else:
            movement_rate = "slow"
        days_until_out = round(stock / daily_usage, 1) if daily_usage > 0 else 999
        recommended_reorder = max(reorder_point * 2, int(round(daily_usage * 14)))
        inventory_items.append({
            "id": item_id,
            "name": item.get("item_name") or "Inventory Item",
            "stock": stock,
            "reorderPoint": reorder_point,
            "movementRate": movement_rate,
            "dailyUsage": daily_usage,
            "daysUntilOut": days_until_out,
            "recommendedReorder": recommended_reorder,
        })
    inventory_items = sorted(
        inventory_items,
        key=lambda item: (
            item["stock"] > item["reorderPoint"],
            item["daysUntilOut"],
            item["stock"],
        )
    )[:10]

    predicted_revenue = round(sum(revenue_forecast.get("predictions", [])), 2)
    if predicted_revenue <= 0:
        predicted_revenue = round((recent_average or (current_revenue / period_days if period_days else 0)) * period_days, 2)
    predicted_revenue_change = analytics_change_percent(predicted_revenue, current_revenue)
    forecast_mode = "ml" if revenue_forecast.get("mode") == "ml" else "trend"
    ml_components = [
        revenue_forecast.get("mode") == "ml",
        hourly_appointment_forecast.get("mode") == "ml",
        any(mode == "ml" for mode in product_forecast_modes),
    ]
    ml_component_count = sum(1 for is_ml in ml_components if is_ml)
    forecast_label = "Random Forest Active" if forecast_mode == "ml" else "Trend Forecast Active"
    selected_feature_label = "rich daily samples" if revenue_forecast.get("featureSet") == "rich_daily_lagged" else "calendar-day samples"
    forecast_description = (
        f"RandomForestRegressor trained on {revenue_forecast.get('trainingSamples', 0)} {selected_feature_label}"
        if forecast_mode == "ml"
        else f"Trend fallback: {revenue_forecast.get('reason') or 'not enough data for ML yet'}"
    )

    insights = []
    revenue_change = analytics_change_percent(current_revenue, previous_revenue)
    if current_revenue > 0:
        revenue_direction = "up" if revenue_change >= 0 else "down"
        insights.append({
            "id": "growth-revenue",
            "text": f"Revenue is {revenue_direction} {abs(revenue_change)}% versus the previous comparable period, indicating {'stronger recent sales activity' if revenue_change >= 0 else 'a period that needs sales review'}",
            "type": "growth" if revenue_change >= 0 else "warning",
            "icon": "📈" if revenue_change >= 0 else "⚠️",
            "action": "Review the services and products driving this movement" if revenue_change >= 0 else "Review billing activity and recent appointment volume",
        })

    if top_services:
        top_service = top_services[0]
        insights.append({
            "id": "growth-service",
            "text": f"{top_service['service']} generated the highest service revenue at PHP {round(top_service['revenue']):,}, making it a strong candidate for promotion",
            "type": "growth",
            "icon": "✨",
            "action": "Highlight this service in scheduling and package offers",
        })

    critical_inventory = [
        item for item in inventory_items
        if item["stock"] <= item["reorderPoint"] or item["daysUntilOut"] <= 3
    ]
    if critical_inventory:
        critical_item = critical_inventory[0]
        days_text = "soon" if critical_item["daysUntilOut"] >= 999 else f"in {critical_item['daysUntilOut']} days"
        insights.append({
            "id": "warning-stock",
            "text": f"{critical_item['name']} is at risk of stockout {days_text} based on current stock and recent product movement",
            "type": "warning",
            "icon": "💊",
            "action": "Review reorder quantity and supplier lead time",
        })

    if peak_hours:
        busiest_hour = max(peak_hours, key=lambda item: item.get("appointments") or 0)
        if busiest_hour.get("appointments", 0) > 0:
            insights.append({
                "id": "opportunity-peak-hour",
                "text": f"{busiest_hour['hour']} has the highest completed appointment volume in the selected period",
                "type": "opportunity",
                "icon": "⏰",
                "action": "Use this hour as the staffing and slot-planning baseline",
            })

    if top_services and top_products:
        insights.append({
            "id": "opportunity-bundle",
            "text": f"Pair {top_services[0]['service']} with {top_products[0]['product']} because both are top performers in the selected period",
            "type": "opportunity",
            "icon": "🎯",
            "action": "Consider a service-and-product bundle offer",
        })

    if not insights:
        insights.append({
            "id": "opportunity-record-data",
            "text": "Analytics intelligence will become more useful as more invoices, appointments, and product sales are recorded",
            "type": "opportunity",
            "icon": "AI",
            "action": "Continue recording transactions to strengthen the forecast dataset",
        })

    return {
        "branches": branches,
        "filters": {
            "branchId": branch_filter,
            "startDate": current_start.isoformat(),
            "endDate": current_end.isoformat(),
            "previousStartDate": previous_start.isoformat(),
            "previousEndDate": previous_end.isoformat(),
            "trainingStartDate": analytics_history_start.isoformat(),
            "trainingEndDate": current_end.isoformat(),
        },
        "kpis": {
            "totalRevenue": current_revenue,
            "totalRevenueChange": revenue_change,
            "totalTransactions": current_transaction_count,
            "totalTransactionsChange": analytics_change_percent(current_transaction_count, previous_transaction_count),
            "averageTransaction": current_avg_transaction,
            "averageTransactionChange": analytics_change_percent(current_avg_transaction, previous_avg_transaction),
            "completedAppointments": len(completed_appointments),
            "completedAppointmentsChange": analytics_change_percent(len(completed_appointments), len(previous_completed_appointments)),
            "predictedRevenue": predicted_revenue,
            "predictedRevenueChange": predicted_revenue_change,
        },
        "salesTrend": sales_trend,
        "topServices": top_services,
        "topProducts": top_products,
        "salesDistribution": sales_distribution,
        "peakHours": peak_hours,
        "inventory": inventory_items,
        "insights": insights,
        "forecast": {
            "mode": forecast_mode,
            "label": forecast_label,
            "description": forecast_description,
            "algorithm": "RandomForestRegressor",
            "mlComponentsActive": ml_component_count,
            "revenue": {
                "mode": revenue_forecast.get("mode"),
                "reason": revenue_forecast.get("reason"),
                "trainingSamples": revenue_forecast.get("trainingSamples", 0),
                "positiveSamples": revenue_forecast.get("positiveSamples", 0),
                "featureSet": revenue_forecast.get("featureSet", "rich_daily_lagged"),
            },
            "appointments": {
                "mode": hourly_appointment_forecast.get("mode"),
                "reason": hourly_appointment_forecast.get("reason"),
                "trainingSamples": hourly_appointment_forecast.get("trainingSamples", 0),
                "positiveSamples": hourly_appointment_forecast.get("positiveSamples", 0),
            },
            "validation": revenue_validation,
            "dataRange": {
                "trainingStartDate": analytics_history_start.isoformat(),
                "trainingEndDate": current_end.isoformat(),
                "forecastStartDate": future_period_dates[0].isoformat() if future_period_dates else None,
                "forecastEndDate": future_period_dates[-1].isoformat() if future_period_dates else None,
            },
        },
    }


@app.route('/api/admin/analytics/overview', methods=['GET'])
def get_admin_analytics_overview():
    try:
        branch_scope, branch_error = require_actor_branch_scope()
        if branch_error:
            return jsonify({"error": branch_error}), 400

        branch_id_raw = request.args.get("branch_id", request.args.get("branchId"))
        branch_id = None
        if branch_id_raw not in (None, "", "all", "All"):
            branch_id, branch_error = validate_branch_scope_access(branch_scope, branch_id_raw)
            if branch_error:
                return jsonify({"error": branch_error}), 403
        elif branch_scope and not branch_scope.get("can_access_all"):
            branch_id = branch_scope.get("branch_id")

        today = get_current_manila_date()
        start_date = parse_analytics_date(
            request.args.get("start_date", request.args.get("startDate")),
            today - timedelta(days=29)
        )
        end_date = parse_analytics_date(
            request.args.get("end_date", request.args.get("endDate")),
            today
        )

        return jsonify(build_admin_analytics_overview(
            branch_id=branch_id,
            start_date=start_date,
            end_date=end_date,
        )), 200
    except Exception as e:
        print("Admin analytics overview error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/day-availability', methods=['GET'])
def get_day_availability():
    try:
        res = supabase_admin.table('working_days').select('*').execute()
        formatted_data = [
            {"day_of_week": row.get('day_of_week'), "is_available": row.get('is_active')}
            for row in (res.data or [])
        ]
        return jsonify(formatted_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/day-availability', methods=['POST'])
def create_day_availability():
    data = request.get_json() or {}
    day = (data.get('day_of_week') or '').lower()
    is_available = bool(data.get('is_available'))
    try:
        supabase_admin.table('working_days').upsert({
            "day_of_week": day,
            "is_active": is_available,
        }).execute()
        safe_create_availability_admin_notification(
            event_type='working_day_enabled' if is_available else 'working_day_disabled',
            title='Working day enabled' if is_available else 'Working day disabled',
            message=f"{title_name(day)} was {'enabled' if is_available else 'disabled'} for appointment scheduling.",
            severity='success' if is_available else 'warning',
            entity_type='working_day',
            metadata={"dayOfWeek": day, "isAvailable": is_available},
        )
        return jsonify({"message": "Day availability saved", "day_of_week": day, "is_available": is_available}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/day-availability/<day_name>', methods=['PUT'])
def update_day_availability(day_name):
    data = request.get_json() or {}
    is_available = bool(data.get('is_available'))
    try:
        day_key = (day_name or '').lower()
        supabase_admin.table('working_days').upsert({
            "day_of_week": day_key,
            "is_active": is_available,
        }).execute()
        safe_create_availability_admin_notification(
            event_type='working_day_enabled' if is_available else 'working_day_disabled',
            title='Working day enabled' if is_available else 'Working day disabled',
            message=f"{title_name(day_key)} was {'enabled' if is_available else 'disabled'} for appointment scheduling.",
            severity='success' if is_available else 'warning',
            entity_type='working_day',
            metadata={"dayOfWeek": day_key, "isAvailable": is_available},
        )
        return jsonify({"message": f"{day_name} updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/time-slots/<param>', methods=['GET', 'POST', 'DELETE'])
def handle_time_slots_api(param):
    if request.method == 'GET':
        day = (param or '').lower()
        try:
            res = supabase_admin.table('time_slots').select('*').eq('day_of_week', day).execute()
            return jsonify({"timeSlots": res.data or []}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    if request.method == 'POST':
        day = (param or '').lower()
        data = request.get_json() or {}
        slots = data.get('slots', [])
        try:
            existing_slots = supabase_admin.table('time_slots').select('*').eq('day_of_week', day).execute().data or []
            supabase_admin.table('time_slots').delete().eq('day_of_week', day).execute()

            for slot in slots:
                start_time_value = slot.get('startTime') or slot.get('start_time') or ''
                end_time_value = slot.get('endTime') or slot.get('end_time') or ''

                raw_start = datetime.strptime(start_time_value, '%I:%M %p').strftime('%H:%M:%S') if 'M' in start_time_value.upper() else start_time_value
                raw_end = datetime.strptime(end_time_value, '%I:%M %p').strftime('%H:%M:%S') if 'M' in end_time_value.upper() else end_time_value

                supabase_admin.table('time_slots').insert({
                    "day_of_week": day,
                    "start_time": raw_start,
                    "end_time": raw_end,
                    "is_active": True,
                }).execute()

            res = supabase_admin.table('time_slots').select('*').eq('day_of_week', day).execute()
            saved_slots = res.data or []
            safe_create_availability_admin_notification(
                event_type='time_slots_updated',
                title='Time slots updated',
                message=f"{title_name(day)} time slots were updated from {len(existing_slots)} to {len(saved_slots)} slot(s).",
                severity='info',
                entity_type='time_slots',
                metadata={
                    "dayOfWeek": day,
                    "previousSlotCount": len(existing_slots),
                    "slotCount": len(saved_slots),
                    "slots": [
                        {
                            "startTime": item.get("start_time"),
                            "endTime": item.get("end_time"),
                        }
                        for item in saved_slots
                    ],
                },
            )
            return jsonify({"timeSlots": res.data or []}), 200
        except Exception as e:
            print("Time slot save error:", str(e))
            return jsonify({"error": str(e)}), 400

    slot_id = param
    try:
        if str(slot_id).startswith('temp-'):
            return jsonify({"message": "Temp slot removed"}), 200

        existing_slot = get_single_row('time_slots', 'id', slot_id)
        supabase_admin.table('time_slots').delete().eq('id', slot_id).execute()
        if existing_slot:
            safe_create_availability_admin_notification(
                event_type='time_slot_deleted',
                title='Time slot deleted',
                message=f"{title_name(existing_slot.get('day_of_week'))} slot {format_display_time_range(existing_slot.get('start_time'))} was deleted.",
                severity='warning',
                entity_type='time_slot',
                entity_id=existing_slot.get('id'),
                metadata={
                    "dayOfWeek": existing_slot.get('day_of_week'),
                    "startTime": existing_slot.get('start_time'),
                    "endTime": existing_slot.get('end_time'),
                },
            )
        return jsonify({"message": "Slot deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/appointments/booked-slots/<time_slot_id>', methods=['GET'])
def get_booked_slots(time_slot_id):
    date = request.args.get('date')
    try:
        slot_res = supabase_admin.table('time_slots').select('*').eq('id', time_slot_id).single().execute()
        if not slot_res.data:
            return jsonify({"bookedCount": 0, "capacity": 1, "availableSlots": 1}), 200

        slot = slot_res.data
        capacity = 1
        appointments = supabase_admin.table('appointments').select('appointment_time').eq('appointment_date', date).execute().data or []
        slot_time = str(slot.get('start_time'))
        booked_count = sum(1 for item in appointments if str(item.get("appointment_time")) == slot_time)

        return jsonify({
            "bookedCount": booked_count,
            "capacity": capacity,
            "availableSlots": max(capacity - booked_count, 0),
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/appointments', methods=['POST'])
def create_admin_appointment():
    data = request.get_json() or {}
    try:
        branch_scope, branch_error = require_actor_branch_scope(data)
        if branch_error:
            return jsonify({"error": branch_error}), 400
        created = create_appointment_record(data, allow_walk_in=False, branch_scope=branch_scope)
        return jsonify(created), 200
    except ValueError as value_error:
        return jsonify({"error": str(value_error)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/appointments/table', methods=['GET'])
def get_appointments_table():
    try:
        actor_id = request.args.get("userId") or request.args.get("user_id") or request.args.get("adminUserId")
        if not actor_id:
            return jsonify({"error": "userId is required to load branch-scoped appointments"}), 400
        return jsonify({"appointments": build_admin_appointment_rows(include_history=False, actor_id=actor_id)}), 200
    except ValueError as value_error:
        return jsonify({"error": str(value_error)}), 400
    except Exception as e:
        print("Appointments table error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/appointments/history', methods=['GET'])
def get_appointments_history():
    try:
        actor_id = request.args.get("userId") or request.args.get("user_id") or request.args.get("adminUserId")
        if not actor_id:
            return jsonify({"error": "userId is required to load branch-scoped appointment history"}), 400
        return jsonify({"appointments": build_admin_appointment_rows(include_history=True, actor_id=actor_id)}), 200
    except ValueError as value_error:
        return jsonify({"error": str(value_error)}), 400
    except Exception as e:
        print("Appointments history error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/appointments/<appointment_id>/cancel-with-reason', methods=['PUT'])
def cancel_appointment_with_reason(appointment_id):
    data = request.get_json() or {}
    cancel_reason = data.get("cancellation_details") or data.get("cancel_reason") or ""
    try:
        table_name, id_column, resolved_id = resolve_appointment_target(
            appointment_id,
            data.get("recordType") or data.get("record_type")
        )
        supabase_admin.table(table_name).update({
            "status": "cancelled",
            "patient_reason": cancel_reason,
        }).eq(id_column, resolved_id).execute()

        email_sent = False
        try:
            email_context = get_reschedule_email_context(table_name, id_column, resolved_id)
            existing_record = email_context.get("record") or {}
            email_sent = send_appointment_email_safely(
                send_cancellation_email,
                email_context.get("email"),
                email_context.get("patient_name"),
                email_context.get("pet_name"),
                email_context.get("service_name"),
                existing_record.get("appointment_date"),
                format_display_time(existing_record.get("appointment_time")),
                cancel_reason,
                context="Cancellation notification preparation"
            )
        except Exception as email_error:
            print(f"Cancellation notification preparation error: {email_error}")

        safe_create_appointment_admin_notification(
            table_name=table_name,
            id_column=id_column,
            record_id=resolved_id,
            event_type='appointment_cancelled',
            title='Appointment cancelled',
            action_text='was cancelled by the clinic',
            severity='warning',
            link='/admin/history',
            metadata={"reason": cancel_reason},
        )

        return jsonify({
            "message": "Appointment cancelled successfully",
            "emailSent": email_sent,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/appointments/<appointment_id>/reschedule', methods=['POST'])
def create_admin_reschedule_request(appointment_id):
    data = request.get_json() or {}
    try:
        table_name, id_column, resolved_id = resolve_appointment_target(
            appointment_id,
            data.get("recordType") or data.get("record_type")
        )
        email_context = get_reschedule_email_context(table_name, id_column, resolved_id)
        existing_record = email_context.get("record") or {}
        reschedule_reason = data.get("reason") or data.get("reschedule_reason") or None
        new_date = data.get("new_date")
        new_time = data.get("new_time")
        requested_by = parse_uuid_or_none(data.get("requested_by"))
        target_type = 'walkin' if table_name == 'walkin_appointments' else 'appointment'

        for open_status in ('pending', 'needs_new_schedule'):
            supabase_admin.table('reschedule_requests').update({
                "status": "cancelled",
                "responded_at": datetime.utcnow().isoformat(),
                "response_note": "Superseded by a newer request"
            }).eq('target_type', target_type).eq('target_id', resolved_id).eq('status', open_status).execute()

        insert_res = supabase_admin.table('reschedule_requests').insert({
            "target_type": target_type,
            "target_id": resolved_id,
            "current_appointment_date": existing_record.get("appointment_date"),
            "current_appointment_time": existing_record.get("appointment_time"),
            "proposed_appointment_date": new_date,
            "proposed_appointment_time": new_time,
            "reason": reschedule_reason,
            "requested_by": requested_by,
            "patient_preferred_date": None,
            "patient_preferred_time": None,
            "patient_response_type": None,
        }).execute()

        request_row = (insert_res.data or [{}])[0]
        if not request_row.get("token"):
            follow_up_res = supabase_admin.table('reschedule_requests').select('*').eq('target_type', target_type).eq('target_id', resolved_id).eq('status', 'pending').order('created_at', desc=True).limit(1).execute()
            request_row = (follow_up_res.data or [request_row])[0]

        action_links = build_reschedule_action_links(request_row.get("token"))
        email_sent = send_appointment_email_safely(
            send_reschedule_email,
            email_context.get("email"),
            email_context.get("patient_name"),
            email_context.get("pet_name"),
            email_context.get("service_name"),
            new_date,
            format_display_time(new_time),
            reschedule_reason,
            action_links,
            context="Reschedule request email"
        )

        safe_create_appointment_admin_notification(
            table_name=table_name,
            id_column=id_column,
            record_id=resolved_id,
            event_type='reschedule_requested',
            title='Reschedule request sent',
            action_text='was sent a reschedule request',
            severity='info',
            link='/admin/schedule',
            metadata={
                "requestId": request_row.get("request_id"),
                "reason": reschedule_reason,
                "proposedDate": new_date,
                "proposedTime": new_time,
            },
        )

        return jsonify({
            "message": "Reschedule request emailed to patient" + ("" if email_sent else " (email not sent)"),
            "emailSent": email_sent,
            "requestId": request_row.get("request_id")
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/appointments/<appointment_id>/request-reschedule', methods=['POST'])
def create_patient_reschedule_request(appointment_id):
    data = request.get_json() or {}
    try:
        table_name, id_column, resolved_id = resolve_appointment_target(
            appointment_id,
            data.get("recordType") or data.get("record_type")
        )
        email_context = get_reschedule_email_context(table_name, id_column, resolved_id)
        existing_record = email_context.get("record") or {}
        target_type = 'walkin' if table_name == 'walkin_appointments' else 'appointment'
        requested_by = parse_uuid_or_none(data.get("requested_by"))
        preferred_date = data.get("new_date")
        preferred_time = data.get("new_time")
        patient_note = data.get("reason") or data.get("reschedule_reason") or None
        clinic_reason = existing_record.get("reschedule_reason") or None

        if not preferred_date or not preferred_time:
            return jsonify({"error": "Preferred date and time are required"}), 400

        combined_note = build_patient_preference_note(
            preferred_date,
            preferred_time,
            patient_note,
            "Patient requested a new preferred schedule from the appointment details page"
        )

        for open_status in ('pending', 'needs_new_schedule'):
            supabase_admin.table('reschedule_requests').update({
                "status": "cancelled",
                "responded_at": datetime.utcnow().isoformat(),
                "response_note": "Superseded by a newer patient reschedule request"
            }).eq('target_type', target_type).eq('target_id', resolved_id).eq('status', open_status).execute()

        insert_res = supabase_admin.table('reschedule_requests').insert({
            "target_type": target_type,
            "target_id": resolved_id,
            "current_appointment_date": existing_record.get("appointment_date"),
            "current_appointment_time": existing_record.get("appointment_time"),
            "proposed_appointment_date": existing_record.get("appointment_date"),
            "proposed_appointment_time": existing_record.get("appointment_time"),
            "reason": clinic_reason,
            "requested_by": requested_by,
            "status": "needs_new_schedule",
            "patient_preferred_date": preferred_date,
            "patient_preferred_time": preferred_time,
            "patient_response_type": "choose_another_date",
            "responded_at": datetime.utcnow().isoformat(),
            "response_note": combined_note
        }).execute()

        request_row = (insert_res.data or [{}])[0]

        safe_create_appointment_admin_notification(
            table_name=table_name,
            id_column=id_column,
            record_id=resolved_id,
            event_type='patient_reschedule_requested',
            title='Patient requested another schedule',
            action_text='has a patient-requested schedule change',
            severity='warning',
            link='/admin/schedule',
            metadata={
                "requestId": request_row.get("request_id"),
                "patientNote": patient_note,
                "preferredDate": preferred_date,
                "preferredTime": preferred_time,
            },
        )

        return jsonify({
            "message": "Reschedule request submitted for clinic review",
            "requestId": request_row.get("request_id"),
            "status": request_row.get("status") or "needs_new_schedule"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/reschedule/confirm/<token>', methods=['GET'])
def confirm_reschedule_request(token):
    req, state = get_pending_reschedule_request(token)

    if state == "not_found":
        return render_html_page("Request Not Found", "This reschedule request could not be found.")
    if state == "expired":
        return render_html_page("Request Expired", "This reschedule request has expired. Please contact the clinic for a new schedule.")
    if state == "closed":
        return render_html_page("Request Already Processed", f"This reschedule request is already marked as {req.get('status')}.")

    try:
        table_name, id_column, resolved_id = apply_reschedule_to_target(req, req.get("proposed_appointment_date"), req.get("proposed_appointment_time"))
        supabase_admin.table('reschedule_requests').update({
            "status": "confirmed",
            "responded_at": datetime.utcnow().isoformat(),
            "patient_response_type": "confirm"
        }).eq('request_id', req.get('request_id')).execute()

        safe_create_appointment_admin_notification(
            table_name=table_name,
            id_column=id_column,
            record_id=resolved_id,
            event_type='reschedule_confirmed',
            title='Reschedule confirmed',
            action_text='confirmed the proposed reschedule',
            severity='success',
            link='/admin/schedule',
            metadata={"requestId": req.get("request_id")},
        )

        return render_html_page(
            "Schedule Confirmed",
            f"Your appointment has been updated to {req.get('proposed_appointment_date')} at {format_display_time(req.get('proposed_appointment_time'))}."
        )
    except Exception as e:
        return render_html_page("Something Went Wrong", f"We could not confirm this request right now. {str(e)}")


@app.route('/reschedule/cancel/<token>', methods=['GET'])
def cancel_reschedule_request(token):
    req, state = get_pending_reschedule_request(token)

    if state == "not_found":
        return render_html_page("Request Not Found", "This reschedule request could not be found.")
    if state == "expired":
        return render_html_page("Request Expired", "This reschedule request has expired. Please contact the clinic if you still need help.")
    if state == "closed":
        return render_html_page("Request Already Processed", f"This reschedule request is already marked as {req.get('status')}.")

    try:
        table_name, id_column, resolved_id = resolve_appointment_target(req.get('target_id'), req.get('target_type'))
        supabase_admin.table(table_name).update({
            "status": "cancelled"
        }).eq(id_column, resolved_id).execute()

        supabase_admin.table('reschedule_requests').update({
            "status": "cancelled",
            "responded_at": datetime.utcnow().isoformat(),
            "response_note": "Cancelled by patient from email link",
            "patient_response_type": "cancel"
        }).eq('request_id', req.get('request_id')).execute()

        safe_create_appointment_admin_notification(
            table_name=table_name,
            id_column=id_column,
            record_id=resolved_id,
            event_type='appointment_cancelled',
            title='Appointment cancelled',
            action_text='was cancelled by the patient',
            severity='warning',
            link='/admin/history',
            metadata={"requestId": req.get("request_id")},
        )

        return render_html_page(
            "Appointment Cancelled",
            "Your appointment has been cancelled successfully."
        )
    except Exception as e:
        return render_html_page("Something Went Wrong", f"We could not cancel this appointment right now. {str(e)}")


@app.route('/reschedule/choose-another-date/<token>', methods=['GET', 'POST'])
def choose_another_date(token):
    req, state = get_pending_reschedule_request(token)

    if state == "not_found":
        return render_html_page("Request Not Found", "This reschedule request could not be found.")
    if state == "expired":
        return render_html_page("Request Expired", "This reschedule request has expired. Please contact the clinic for a new schedule.")
    if state == "closed":
        return render_html_page("Request Already Processed", f"This reschedule request is already marked as {req.get('status')}.")

    if request.method == 'GET':
        return render_choose_another_date_page(req)

    preferred_date = request.form.get('preferred_date') or ''
    preferred_time = request.form.get('preferred_time') or ''
    response_note = request.form.get('response_note') or ''

    if not preferred_date or not preferred_time:
        return render_choose_another_date_page(
            req,
            "Please select both a preferred date and an available time slot before sending your preference."
        )

    try:
        selected_preferred_date = datetime.strptime(preferred_date, "%Y-%m-%d").date()
    except ValueError:
        return render_choose_another_date_page(
            req,
            "Please choose a valid preferred date."
        )

    today_in_manila = get_current_manila_date()
    current_month_start = date(today_in_manila.year, today_in_manila.month, 1)
    month_after_next_start = date(
        current_month_start.year + ((current_month_start.month - 1 + 2) // 12),
        ((current_month_start.month - 1 + 2) % 12) + 1,
        1
    )
    if selected_preferred_date < today_in_manila or selected_preferred_date >= month_after_next_start:
        return render_choose_another_date_page(
            req,
            "Please choose a date within the current month or next month only."
        )

    combined_note = build_patient_preference_note(
        preferred_date,
        preferred_time,
        response_note,
        "Patient requested another date from email link"
    )

    try:
        supabase_admin.table('reschedule_requests').update({
            "status": "needs_new_schedule",
            "responded_at": datetime.utcnow().isoformat(),
            "response_note": combined_note,
            "patient_preferred_date": preferred_date or None,
            "patient_preferred_time": preferred_time or None,
            "patient_response_type": "choose_another_date"
        }).eq('request_id', req.get('request_id')).execute()

        table_name, id_column, resolved_id = resolve_appointment_target(req.get('target_id'), req.get('target_type'))
        safe_create_appointment_admin_notification(
            table_name=table_name,
            id_column=id_column,
            record_id=resolved_id,
            event_type='patient_reschedule_requested',
            title='Patient requested another schedule',
            action_text='has a patient-requested schedule change',
            severity='warning',
            link='/admin/schedule',
            metadata={
                "requestId": req.get("request_id"),
                "preferredDate": preferred_date,
                "preferredTime": preferred_time,
            },
        )

        return render_html_page(
            "Preference Sent",
            "Your request for another date has been sent to the clinic. They can now review your preferred schedule."
        )
    except Exception as e:
        return render_html_page("Something Went Wrong", f"We could not save your response right now. {str(e)}")


@app.route('/api/available-time-slots', methods=['GET'])
def get_available_time_slots():
    date = (request.args.get('date') or '').strip()
    if not date:
        return jsonify({"timeSlots": []}), 200

    try:
        selected_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Expected YYYY-MM-DD."}), 400

    today_in_manila = get_current_manila_date()
    current_month_start = date(today_in_manila.year, today_in_manila.month, 1)
    month_after_next_start = date(
        current_month_start.year + ((current_month_start.month - 1 + 2) // 12),
        ((current_month_start.month - 1 + 2) % 12) + 1,
        1
    )
    if selected_date < today_in_manila or selected_date >= month_after_next_start:
        return jsonify({"timeSlots": []}), 200

    day_name = selected_date.strftime("%A").lower()

    try:
        special_dates_res = supabase_admin.table('special_dates').select('*').execute()
        if is_special_date_blocked(selected_date, special_dates_res.data or []):
            return jsonify({"timeSlots": []}), 200
    except Exception as e:
        print(f"Special dates lookup warning: {e}")

    day_rows = supabase_admin.table('working_days').select('day_of_week,is_active').execute().data or []
    day_row = next(
        (
            row for row in day_rows
            if (row.get('day_of_week') or '').strip().lower() == day_name
        ),
        None
    )
    if not day_row or not day_row.get('is_active'):
        return jsonify({"timeSlots": []}), 200

    slots_res = supabase_admin.table('time_slots').select('*').order('start_time').execute()
    slots = []
    for slot in (slots_res.data or []):
        if (slot.get('day_of_week') or '').strip().lower() != day_name:
            continue
        if slot.get('is_active') is False:
            continue
        slots.append({
            "id": slot.get("id"),
            "start_time": slot.get("start_time"),
            "end_time": slot.get("end_time"),
            "displayText": format_display_time_range(slot.get("start_time")),
            "capacity": 1,
            "availableSlots": 1,
        })

    return jsonify({"timeSlots": slots}), 200


@app.route('/api/reschedule-requests', methods=['GET'])
def get_reschedule_requests():
    target_type = request.args.get('targetType')
    target_id = request.args.get('targetId')

    try:
        query = supabase_admin.table('reschedule_requests').select('*').order('created_at', desc=True)

        if target_type:
            query = query.eq('target_type', target_type)

        if target_id is not None:
            query = query.eq('target_id', int(target_id))

        res = query.execute()
        return jsonify({"requests": res.data or []}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/reschedule-requests/<int:request_id>/confirm', methods=['PUT'])
def confirm_reschedule_request_from_web(request_id):
    try:
        req, state = get_pending_reschedule_request_by_id(request_id)
        if state == "not_found":
            return jsonify({"error": "Reschedule request not found"}), 404
        if state == "expired":
            return jsonify({"error": "This reschedule request has expired. Please contact the clinic for a new schedule."}), 400
        if state == "closed":
            return jsonify({"error": f"This reschedule request is already marked as {req.get('status') or 'closed'}."}), 400

        proposed_date = req.get("proposed_appointment_date")
        proposed_time = req.get("proposed_appointment_time")
        if not proposed_date or not proposed_time:
            return jsonify({"error": "The clinic proposal is missing a date or time."}), 400

        table_name, id_column, resolved_id = apply_reschedule_to_target(req, proposed_date, proposed_time)
        supabase_admin.table('reschedule_requests').update({
            "status": "confirmed",
            "responded_at": datetime.utcnow().isoformat(),
            "patient_response_type": "confirm"
        }).eq('request_id', request_id).execute()

        safe_create_appointment_admin_notification(
            table_name=table_name,
            id_column=id_column,
            record_id=resolved_id,
            event_type='reschedule_confirmed',
            title='Reschedule confirmed',
            action_text='confirmed the proposed reschedule',
            severity='success',
            link='/admin/schedule',
            metadata={"requestId": request_id},
        )

        return jsonify({
            "message": "Appointment schedule confirmed successfully",
            "status": "confirmed",
            "appointmentDate": proposed_date,
            "appointmentTime": normalize_db_time(proposed_time)
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/reschedule-requests/<int:request_id>/cancel-appointment', methods=['PUT'])
def cancel_appointment_from_reschedule_request(request_id):
    try:
        req, state = get_pending_reschedule_request_by_id(request_id)
        if state == "not_found":
            return jsonify({"error": "Reschedule request not found"}), 404
        if state == "expired":
            return jsonify({"error": "This reschedule request has expired. Please contact the clinic if you still need help."}), 400
        if state == "closed":
            return jsonify({"error": f"This reschedule request is already marked as {req.get('status') or 'closed'}."}), 400

        table_name, id_column, resolved_id = resolve_appointment_target(req.get('target_id'), req.get('target_type'))
        supabase_admin.table(table_name).update({
            "status": "cancelled"
        }).eq(id_column, resolved_id).execute()

        existing_note = (req.get('response_note') or '').strip()
        note_parts = [part for part in [existing_note, 'Cancelled by patient from appointment details page'] if part]
        combined_note = " | ".join(note_parts)

        supabase_admin.table('reschedule_requests').update({
            "status": "cancelled",
            "responded_at": datetime.utcnow().isoformat(),
            "response_note": combined_note,
            "patient_response_type": "cancel"
        }).eq('request_id', request_id).execute()

        safe_create_appointment_admin_notification(
            table_name=table_name,
            id_column=id_column,
            record_id=resolved_id,
            event_type='appointment_cancelled',
            title='Appointment cancelled',
            action_text='was cancelled by the patient',
            severity='warning',
            link='/admin/history',
            metadata={"requestId": request_id},
        )

        return jsonify({
            "message": "Appointment cancelled successfully",
            "status": "cancelled"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/reschedule-requests/<int:request_id>/choose-another-date', methods=['PUT'])
def choose_another_date_from_web(request_id):
    data = request.get_json() or {}
    preferred_date = (data.get('preferred_date') or '').strip()
    preferred_time = normalize_db_time(data.get('preferred_time') or '')
    response_note = (data.get('response_note') or '').strip()

    try:
        req, state = get_pending_reschedule_request_by_id(request_id)
        if state == "not_found":
            return jsonify({"error": "Reschedule request not found"}), 404
        if state == "expired":
            return jsonify({"error": "This reschedule request has expired. Please contact the clinic for a new schedule."}), 400
        if state == "closed":
            return jsonify({"error": f"This reschedule request is already marked as {req.get('status') or 'closed'}."}), 400

        if not preferred_date or not preferred_time:
            return jsonify({"error": "Preferred date and time are required"}), 400

        try:
            selected_preferred_date = datetime.strptime(preferred_date, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Please choose a valid preferred date."}), 400

        today_in_manila = get_current_manila_date()
        current_month_start = date(today_in_manila.year, today_in_manila.month, 1)
        month_after_next_start = date(
            current_month_start.year + ((current_month_start.month - 1 + 2) // 12),
            ((current_month_start.month - 1 + 2) % 12) + 1,
            1
        )
        if selected_preferred_date < today_in_manila or selected_preferred_date >= month_after_next_start:
            return jsonify({"error": "Please choose a date within the current month or next month only."}), 400

        combined_note = build_patient_preference_note(
            preferred_date,
            preferred_time,
            response_note,
            "Patient requested another date from appointment details page"
        )

        supabase_admin.table('reschedule_requests').update({
            "status": "needs_new_schedule",
            "responded_at": datetime.utcnow().isoformat(),
            "response_note": combined_note,
            "patient_preferred_date": preferred_date or None,
            "patient_preferred_time": preferred_time or None,
            "patient_response_type": "choose_another_date"
        }).eq('request_id', request_id).execute()

        table_name, id_column, resolved_id = resolve_appointment_target(req.get('target_id'), req.get('target_type'))
        safe_create_appointment_admin_notification(
            table_name=table_name,
            id_column=id_column,
            record_id=resolved_id,
            event_type='patient_reschedule_requested',
            title='Patient requested another schedule',
            action_text='has a patient-requested schedule change',
            severity='warning',
            link='/admin/schedule',
            metadata={
                "requestId": request_id,
                "preferredDate": preferred_date,
                "preferredTime": preferred_time,
            },
        )

        return jsonify({
            "message": "Preferred schedule sent to clinic for review",
            "status": "needs_new_schedule"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/reschedule-requests/<int:request_id>/withdraw', methods=['PUT'])
def withdraw_reschedule_request(request_id):
    try:
        req = get_reschedule_request_by_id(request_id)
        if not req:
            return jsonify({"error": "Reschedule request not found"}), 404

        current_status = (req.get('status') or '').strip().lower()
        if current_status not in ('pending', 'needs_new_schedule'):
            return jsonify({"error": f"Only open reschedule requests can be withdrawn. Current status: {req.get('status') or 'unknown'}"}), 400

        existing_note = (req.get('response_note') or '').strip()
        note_parts = [part for part in [existing_note, 'Withdrawn by patient from appointment details page'] if part]
        combined_note = " | ".join(note_parts)

        supabase_admin.table('reschedule_requests').update({
            "status": "cancelled",
            "responded_at": datetime.utcnow().isoformat(),
            "response_note": combined_note,
            "patient_response_type": "withdraw"
        }).eq('request_id', request_id).execute()

        table_name, id_column, resolved_id = resolve_appointment_target(req.get('target_id'), req.get('target_type'))
        safe_create_appointment_admin_notification(
            table_name=table_name,
            id_column=id_column,
            record_id=resolved_id,
            event_type='reschedule_withdrawn',
            title='Reschedule request withdrawn',
            action_text='had a reschedule request withdrawn',
            severity='info',
            link='/admin/schedule',
            metadata={"requestId": request_id},
        )

        return jsonify({
            "message": "Reschedule request withdrawn successfully",
            "status": "cancelled"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/reschedule-requests/<int:request_id>/review', methods=['PUT'])
def review_reschedule_request(request_id):
    data = request.get_json() or {}
    action = (data.get('action') or '').strip().lower()
    admin_note = (data.get('note') or '').strip()

    try:
        req = get_reschedule_request_by_id(request_id)
        if not req:
            return jsonify({"error": "Reschedule request not found"}), 404

        if req.get('status') in ('confirmed', 'declined', 'cancelled', 'expired'):
            return jsonify({"error": f"Request is already {req.get('status')}"}), 400

        existing_note = (req.get('response_note') or '').strip()
        note_parts = [part for part in [existing_note, admin_note] if part]
        combined_note = " | ".join(note_parts) if note_parts else None
        email_sent = None

        if action == 'accept':
            preferred_date = req.get('patient_preferred_date')
            preferred_time = req.get('patient_preferred_time')

            if not preferred_date or not preferred_time:
                return jsonify({"error": "Patient preference is missing a preferred date or time"}), 400

            table_name, id_column, resolved_id = apply_reschedule_to_target(req, preferred_date, preferred_time)
            supabase_admin.table('reschedule_requests').update({
                "status": "confirmed",
                "response_note": combined_note,
            }).eq('request_id', request_id).execute()

            try:
                email_context = get_reschedule_email_context(table_name, id_column, resolved_id)
                email_sent = send_appointment_email_safely(
                    send_reschedule_review_email,
                    email_context.get("email"),
                    email_context.get("patient_name"),
                    email_context.get("pet_name"),
                    email_context.get("service_name"),
                    preferred_date,
                    format_display_time(preferred_time),
                    'accepted',
                    admin_note or None,
                    context="Reschedule accept email"
                )
            except Exception as email_error:
                print(f"Reschedule accept email error: {email_error}")
                email_sent = False

            safe_create_appointment_admin_notification(
                table_name=table_name,
                id_column=id_column,
                record_id=resolved_id,
                event_type='reschedule_accepted',
                title='Preferred schedule accepted',
                action_text='was moved to the patient preferred schedule',
                severity='success',
                link='/admin/schedule',
                metadata={"requestId": request_id, "note": admin_note or None},
            )

            return jsonify({
                "message": "Patient preferred schedule accepted",
                "emailSent": email_sent
            }), 200

        if action == 'decline':
            supabase_admin.table('reschedule_requests').update({
                "status": "declined",
                "response_note": combined_note,
            }).eq('request_id', request_id).execute()

            try:
                table_name, id_column, resolved_id = resolve_appointment_target(req.get('target_id'), req.get('target_type'))
                email_context = get_reschedule_email_context(table_name, id_column, resolved_id)
                email_sent = send_appointment_email_safely(
                    send_reschedule_review_email,
                    email_context.get("email"),
                    email_context.get("patient_name"),
                    email_context.get("pet_name"),
                    email_context.get("service_name"),
                    req.get('patient_preferred_date'),
                    format_display_time(req.get('patient_preferred_time')),
                    'declined',
                    admin_note or None,
                    context="Reschedule decline email"
                )
            except Exception as email_error:
                print(f"Reschedule decline email error: {email_error}")
                email_sent = False

            safe_create_appointment_admin_notification(
                table_name=table_name,
                id_column=id_column,
                record_id=resolved_id,
                event_type='reschedule_declined',
                title='Preferred schedule declined',
                action_text='had a patient preferred schedule declined',
                severity='info',
                link='/admin/schedule',
                metadata={"requestId": request_id, "note": admin_note or None},
            )

            return jsonify({
                "message": "Patient preferred schedule declined",
                "emailSent": email_sent
            }), 200

        return jsonify({"error": "Invalid review action"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/appointments/<appointment_id>/assign-doctor', methods=['PUT'])
def assign_doctor(appointment_id):
    data = request.get_json() or {}
    doctor_id = data.get("doctorId")
    try:
        table_name, id_column, resolved_id = resolve_appointment_target(
            appointment_id,
            data.get("recordType") or data.get("record_type")
        )
        try:
            supabase_admin.table(table_name).update({"doctor_id": doctor_id}).eq(id_column, resolved_id).execute()
        except Exception as update_error:
            if 'doctor_id' not in str(update_error):
                raise
            supabase_admin.table(table_name).update({"assigned_doctor_id": doctor_id}).eq(id_column, resolved_id).execute()

        doctor_name = None
        if doctor_id:
            try:
                doctor = get_single_row("employee_accounts", "id", doctor_id)
                doctor_name = get_profile_display_name(doctor)
            except Exception as doctor_error:
                print(f"Doctor assignment notification lookup error: {doctor_error}")

        safe_create_appointment_admin_notification(
            table_name=table_name,
            id_column=id_column,
            record_id=resolved_id,
            event_type='doctor_assigned',
            title='Doctor assigned',
            action_text=f"was assigned to {doctor_name}" if doctor_name else "was assigned to a doctor",
            severity='info',
            link='/admin/schedule',
            metadata={"doctorId": doctor_id, "doctorName": doctor_name},
        )
        return jsonify({"message": "Doctor assigned successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/special-dates', methods=['GET', 'POST'])
def handle_special_dates():
    if request.method == 'GET':
        try:
            res = supabase_admin.table('special_dates').select('*').order('event_date').execute()
            return jsonify({"specialDates": res.data}), 200
        except Exception as e:
            print("Special dates fetch error:", e)
            return jsonify({"specialDates": []}), 200

    data = request.get_json() or {}
    try:
        special_date_payload = build_special_date_payload_from_request(data)
        if special_date_payload["event_recurrence"] == "annual":
            existing_res = supabase_admin.table('special_dates').select('event_month,event_day').eq('event_recurrence', 'annual').eq('event_month', special_date_payload["event_month"]).eq('event_day', special_date_payload["event_day"]).execute()
            if existing_res.data:
                return jsonify({"error": "This annual special day already exists"}), 409
        else:
            existing_res = supabase_admin.table('special_dates').select('event_date').eq('event_recurrence', 'once').eq('event_date', special_date_payload["event_date"]).execute()
            if existing_res.data:
                return jsonify({"error": "This date is already marked as a special date"}), 409

        try:
            insert_res = supabase_admin.table('special_dates').insert(special_date_payload).execute()
        except Exception as insert_error:
            if special_date_payload["event_recurrence"] == "annual":
                raise ValueError("Annual special days require the special_dates recurrence migration")
            if 'event_description' not in str(insert_error) and 'event_recurrence' not in str(insert_error):
                raise
            special_date_payload.pop("event_description", None)
            special_date_payload.pop("event_recurrence", None)
            special_date_payload.pop("event_month", None)
            special_date_payload.pop("event_day", None)
            insert_res = supabase_admin.table('special_dates').insert(special_date_payload).execute()

        created_special_date = (insert_res.data or [special_date_payload])[0]
        recurrence = normalize_special_date_recurrence(created_special_date.get("event_recurrence"))
        date_label = (
            f"{created_special_date.get('event_month')}/{created_special_date.get('event_day')} every year"
            if recurrence == "annual"
            else created_special_date.get("event_date")
        )
        safe_create_availability_admin_notification(
            event_type='special_date_created',
            title='Special date added',
            message=f"{created_special_date.get('event_name') or 'Special date'} was added for {date_label}.",
            severity='info',
            entity_type='special_date',
            metadata={
                "eventName": created_special_date.get("event_name"),
                "eventDate": created_special_date.get("event_date"),
                "eventDescription": created_special_date.get("event_description"),
                "eventRecurrence": recurrence,
                "eventMonth": created_special_date.get("event_month"),
                "eventDay": created_special_date.get("event_day"),
            },
        )
        return jsonify({
            "message": "Special date added successfully",
            "specialDate": created_special_date
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/special-dates/<date>', methods=['PUT'])
def update_special_date(date):
    data = request.get_json() or {}
    try:
        original_recurrence = normalize_special_date_recurrence(data.get('original_event_recurrence'))
        original_month = data.get('original_event_month')
        original_day = data.get('original_event_day')
        special_date_payload = build_special_date_payload_from_request(data)

        query = supabase_admin.table('special_dates').select('*')
        if original_recurrence == "annual" and original_month and original_day:
            query = query.eq('event_recurrence', 'annual').eq('event_month', int(original_month)).eq('event_day', int(original_day))
        else:
            query = query.eq('event_date', date)
        current_res = query.execute()
        current_record = (current_res.data or [{}])[0]

        if special_date_payload["event_recurrence"] == "annual":
            existing_res = supabase_admin.table('special_dates').select('*').eq('event_recurrence', 'annual').eq('event_month', special_date_payload["event_month"]).eq('event_day', special_date_payload["event_day"]).execute()
            duplicate_records = [
                record for record in (existing_res.data or [])
                if normalize_special_date_record(record) != normalize_special_date_record(current_record)
            ]
            if duplicate_records:
                return jsonify({"error": "This annual special day already exists"}), 409
        else:
            existing_res = supabase_admin.table('special_dates').select('*').eq('event_recurrence', 'once').eq('event_date', special_date_payload["event_date"]).execute()
            duplicate_records = [
                record for record in (existing_res.data or [])
                if normalize_special_date_record(record) != normalize_special_date_record(current_record)
            ]
            if duplicate_records:
                return jsonify({"error": "This date is already marked as a special date"}), 409

        update_query = supabase_admin.table('special_dates').update(special_date_payload)
        if original_recurrence == "annual" and original_month and original_day:
            update_query = update_query.eq('event_recurrence', 'annual').eq('event_month', int(original_month)).eq('event_day', int(original_day))
        else:
            update_query = update_query.eq('event_date', date)
        try:
            update_res = update_query.execute()
        except Exception as update_error:
            if special_date_payload["event_recurrence"] == "annual":
                raise ValueError("Annual special days require the special_dates recurrence migration")
            if 'event_description' not in str(update_error) and 'event_recurrence' not in str(update_error):
                raise
            special_date_payload.pop("event_description", None)
            special_date_payload.pop("event_recurrence", None)
            special_date_payload.pop("event_month", None)
            special_date_payload.pop("event_day", None)
            update_res = supabase_admin.table('special_dates').update(special_date_payload).eq('event_date', date).execute()

        updated_special_date = (update_res.data or [special_date_payload])[0]
        recurrence = normalize_special_date_recurrence(updated_special_date.get("event_recurrence"))
        date_label = (
            f"{updated_special_date.get('event_month')}/{updated_special_date.get('event_day')} every year"
            if recurrence == "annual"
            else updated_special_date.get("event_date")
        )
        safe_create_availability_admin_notification(
            event_type='special_date_updated',
            title='Special date updated',
            message=f"{updated_special_date.get('event_name') or 'Special date'} was updated for {date_label}.",
            severity='info',
            entity_type='special_date',
            metadata={
                "previous": current_record,
                "eventName": updated_special_date.get("event_name"),
                "eventDate": updated_special_date.get("event_date"),
                "eventDescription": updated_special_date.get("event_description"),
                "eventRecurrence": recurrence,
                "eventMonth": updated_special_date.get("event_month"),
                "eventDay": updated_special_date.get("event_day"),
            },
        )
        return jsonify({
            "message": "Special date updated successfully",
            "specialDate": updated_special_date
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/special-dates/<date>', methods=['DELETE'])
def delete_special_date(date):
    try:
        recurrence = normalize_special_date_recurrence(request.args.get('event_recurrence') or request.args.get('recurrence_type'))
        event_month = request.args.get('event_month')
        event_day = request.args.get('event_day')
        select_query = supabase_admin.table('special_dates').select('*')
        if recurrence == "annual" and event_month and event_day:
            select_query = select_query.eq('event_recurrence', 'annual').eq('event_month', int(event_month)).eq('event_day', int(event_day))
        else:
            select_query = select_query.eq('event_date', date)
        existing_records = select_query.execute().data or []
        delete_query = supabase_admin.table('special_dates').delete()
        if recurrence == "annual" and event_month and event_day:
            delete_query = delete_query.eq('event_recurrence', 'annual').eq('event_month', int(event_month)).eq('event_day', int(event_day))
        else:
            delete_query = delete_query.eq('event_date', date)
        delete_query.execute()
        for record in existing_records:
            record_recurrence = normalize_special_date_recurrence(record.get("event_recurrence"))
            date_label = (
                f"{record.get('event_month')}/{record.get('event_day')} every year"
                if record_recurrence == "annual"
                else record.get("event_date")
            )
            safe_create_availability_admin_notification(
                event_type='special_date_deleted',
                title='Special date deleted',
                message=f"{record.get('event_name') or 'Special date'} for {date_label} was deleted.",
                severity='warning',
                entity_type='special_date',
                metadata={
                    "eventName": record.get("event_name"),
                    "eventDate": record.get("event_date"),
                    "eventDescription": record.get("event_description"),
                    "eventRecurrence": record_recurrence,
                    "eventMonth": record.get("event_month"),
                    "eventDay": record.get("event_day"),
                },
            )
        return jsonify({"message": "Special date deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/appointments/<appointment_id>/status', methods=['PUT'])
def update_admin_appointment_status(appointment_id):
    data = request.get_json() or {}
    status = (data.get("status") or "").lower()
    try:
        table_name, id_column, resolved_id = resolve_appointment_target(
            appointment_id,
            data.get("recordType") or data.get("record_type")
        )
        current_res = supabase_admin.table(table_name).select('*').eq(id_column, resolved_id).single().execute()
        current_record = current_res.data or {}
        supabase_admin.table(table_name).update({"status": status}).eq(id_column, resolved_id).execute()

        email_sent = None
        if status == 'confirmed':
            try:
                email_context = get_reschedule_email_context(table_name, id_column, resolved_id)
                existing_record = email_context.get("record") or current_record
                assigned_doctor = get_assigned_doctor_name_from_record(existing_record)
                email_sent = send_appointment_email_safely(
                    send_appointment_confirmed_email,
                    email_context.get("email"),
                    email_context.get("patient_name"),
                    email_context.get("pet_name"),
                    email_context.get("service_name"),
                    existing_record.get("appointment_date"),
                    format_display_time(existing_record.get("appointment_time")),
                    assigned_doctor,
                    context="Appointment confirmation email preparation"
                )
            except Exception as email_error:
                print(f"Appointment confirmation email preparation error: {email_error}")
                email_sent = False

        status_title_map = {
            "confirmed": ("Appointment confirmed", "was confirmed", "success", "/admin/schedule"),
            "completed": ("Appointment completed", "was marked as completed", "success", "/admin/history"),
            "cancelled": ("Appointment cancelled", "was cancelled", "warning", "/admin/history"),
            "pending": ("Appointment set to pending", "was set back to pending", "info", "/admin/schedule"),
            "no_show": ("Appointment marked no-show", "was marked as no-show", "warning", "/admin/history"),
        }
        title, action_text, severity, link = status_title_map.get(
            status,
            ("Appointment status updated", f"was updated to {status or 'unknown'}", "info", "/admin/schedule")
        )
        safe_create_appointment_admin_notification(
            table_name=table_name,
            id_column=id_column,
            record_id=resolved_id,
            event_type='appointment_status_updated',
            title=title,
            action_text=action_text,
            severity=severity,
            link=link,
            metadata={
                "previousStatus": current_record.get("status"),
                "status": status,
            },
        )

        return jsonify({
            "message": "Appointment status updated",
            "emailSent": email_sent,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# FORGOT PASSWORD
# -----------------------------------------------
@app.route('/forgot-password', methods=['POST'])
def forgot_password():
    data  = request.get_json() or {}
    email = normalize_email_address(data.get('email'))

    if not email:
        return jsonify({"error": "Email is required"}), 400

    try:
        account = find_account_by_email(email)
        if not account:
            return jsonify({
                "message": "If this email exists, an OTP has been sent.",
                "otpSent": False
            }), 200

        otp        = ''.join(random.choices(string.digits, k=6))
        expires_at = datetime.utcnow() + timedelta(minutes=10)

        otp_store[email] = {
            "otp":        otp,
            "expires_at": expires_at,
            "verified":   False,
            "account_type": account["account_type"],
            "user_id": account["user_id"]
        }

        send_otp_email(email, otp)

        return jsonify({
            "message": "OTP sent successfully!",
            "otpSent": True
        }), 200

    except Exception as e:
        print("Forgot password error:", e)
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# VERIFY OTP
# -----------------------------------------------
@app.route('/verify-otp', methods=['POST'])
def verify_otp():
    data  = request.get_json()
    email = data.get('email')
    otp   = data.get('otp')
    mode  = data.get('mode', 'passwordReset')

    if not email or not otp:
        return jsonify({"error": "Email and OTP are required"}), 400

    stored = otp_store.get(email)

    if not stored:
        return jsonify({"error": "No OTP found. Please request a new one."}), 400

    if datetime.utcnow() > stored['expires_at']:
        del otp_store[email]
        return jsonify({"error": "OTP has expired. Please request a new one."}), 400

    if stored['otp'] != otp:
        return jsonify({"error": "Invalid OTP. Please try again."}), 400

    if mode == 'emailConfirmation':
        try:
            user_check = supabase_admin.table('patient_account') \
                .select('id') \
                .eq('email', email) \
                .single() \
                .execute()

            user_id = user_check.data['id']

            supabase_admin.auth.admin.update_user_by_id(
                user_id,
                {"email_confirm": True}
            )

            del otp_store[email]
            return jsonify({"message": "Email confirmed! You can now log in."}), 200

        except Exception as e:
            print("Email confirmation error:", str(e))
            return jsonify({"error": str(e)}), 400

    otp_store[email]['verified'] = True
    return jsonify({"message": "OTP verified successfully!"}), 200


# -----------------------------------------------
# RESEND OTP
# -----------------------------------------------
@app.route('/resend-otp', methods=['POST'])
def resend_otp():
    data = request.get_json() or {}
    email = normalize_email_address(data.get('email'))
    mode = (data.get('mode') or 'passwordReset').strip()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    if mode == 'emailConfirmation':
        return jsonify({
            "error": "Account confirmation resend is not available in this flow yet. Please use the latest confirmation email link."
        }), 400

    try:
        account = find_account_by_email(email)
        if not account:
            return jsonify({
                "message": "If this email exists, a new OTP has been sent.",
                "otpSent": False
            }), 200

        otp        = ''.join(random.choices(string.digits, k=6))
        expires_at = datetime.utcnow() + timedelta(minutes=10)

        otp_store[email] = {
            "otp": otp,
            "expires_at": expires_at,
            "verified": False,
            "account_type": account["account_type"],
            "user_id": account["user_id"]
        }

        send_otp_email(email, otp)

        return jsonify({
            "message": "OTP resent successfully!",
            "otpSent": True
        }), 200

    except Exception as e:
        print("Resend OTP error:", e)
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# CHANGE PASSWORD
# -----------------------------------------------
@app.route('/change-password', methods=['POST'])
def change_password():
    data         = request.get_json() or {}
    email        = normalize_email_address(data.get('email'))
    new_password = data.get('new_password')

    if not email or not new_password:
        return jsonify({"error": "Email and new password are required"}), 400

    stored = otp_store.get(email)

    if not stored or not stored.get('verified'):
        return jsonify({"error": "OTP not verified. Please complete verification first."}), 403

    try:
        user_id = stored.get('user_id')

        if not user_id:
            account = find_account_by_email(email)
            if not account:
                return jsonify({"error": "Account not found"}), 404
            user_id = account['user_id']

        supabase_admin.auth.admin.update_user_by_id(user_id, {
            "password": new_password
        })

        del otp_store[email]

        return jsonify({"message": "Password changed successfully!"}), 200

    except Exception as e:
        print("Change password error:", e)
        return jsonify({"error": str(e)}), 400


if __name__ == '__main__':
    app.run(
        debug=os.environ.get("FLASK_DEBUG", "").lower() == "true",
        host='0.0.0.0',
        port=int(os.environ.get("PORT", 5000)),
    )
