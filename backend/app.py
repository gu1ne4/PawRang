from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import create_client, Client
from dotenv import load_dotenv
import os
import json
import random
import string
import secrets
import hashlib
import uuid
import time
import smtplib
import ssl
from datetime import datetime, timedelta, date
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
    "consultation": "Consultation & Check-Up",
    "general consultation": "Consultation & Check-Up",
    "consultation and check-up": "Consultation & Check-Up",
    "checkup or consultation": "Consultation & Check-Up",
    "check-up or consultation": "Consultation & Check-Up",
    "vaccination": "Vaccinations",
    "cbc": "Complete Blood Count",
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

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials in .env")
if EMAIL_PROVIDER == 'smtp' and (not SMTP_FROM_EMAIL or not SMTP_PASSWORD):
    raise ValueError("Missing SMTP email configuration in .env")
if EMAIL_PROVIDER == 'resend' and not RESEND_API_KEY:
    raise ValueError("Missing RESEND_API_KEY in .env")

supabase       = create_client(SUPABASE_URL, SUPABASE_KEY)
supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

otp_store = {}
RESEND_COOLDOWN_SECONDS = 60
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
ADMIN_NOTIFICATION_MODULES = {"inventory"}
ADMIN_NOTIFICATION_SEVERITIES = {"info", "success", "warning", "error"}
TRANSIENT_SUPABASE_ERROR_PATTERNS = (
    "winerror 10035",
    "non-blocking socket operation could not be completed immediately",
    "temporarily unavailable",
    "connection reset",
    "connection aborted",
    "timeout",
)


def is_transient_supabase_error(error):
    message = str(error or "").lower()
    return any(pattern in message for pattern in TRANSIENT_SUPABASE_ERROR_PATTERNS)


def execute_with_retry(run_query, *, attempts=3, base_delay=0.15, context="Supabase read"):
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
            time.sleep(base_delay * attempt)

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


def get_emr_search_results():
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

    search_results = []
    for pet in pets:
        pet_id = pet.get("pet_id")
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


def get_emr_records(record_ids=None, include_billing=False):
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
    medical_information_rows = []
    if appointment_source_ids:
        medical_information_rows.extend(
            execute_with_retry(
                lambda: supabase_admin.table("medical_information").select("*").in_("appointment_id", appointment_source_ids).execute(),
                context="Fetch EMR appointment medical information"
            ).data or []
        )
    if walkin_source_ids:
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

    prescription_rows = fetch_child_rows("medical_record_prescriptions", "Fetch EMR prescriptions")
    lab_result_rows = fetch_child_rows("medical_record_lab_results", "Fetch EMR lab results")
    visit_service_rows = fetch_child_rows("medical_record_visit_services", "Fetch EMR visit services")
    vaccination_rows = fetch_child_rows("medical_record_vaccinations", "Fetch EMR vaccinations")

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
                        "formStrength": item.get("form_strength") or "",
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
            "visitHistory": normalized_visits,
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


def save_emr_record_payload(data, existing_record_id=None):
    data = data or {}
    pet_id = data.get("petId") or data.get("pet_id")
    if pet_id in (None, ""):
        raise ValueError("petId is required to save a medical record.")

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

        visit_payload = {
            "medical_record_id": medical_record_id,
            "source_type": source_type,
            "source_id": int(source_id_raw) if source_id_raw not in (None, "") else None,
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
                "form_strength": prescription.get("formStrength") or "",
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

    refreshed_records = get_emr_records([medical_record_id], include_billing=True)
    return refreshed_records[0] if refreshed_records else None


def get_emr_pet_appointments(pet_id):
    appointments = execute_with_retry(
        lambda: supabase_admin.table("appointments").select("*").eq("pet_id", pet_id).order("appointment_date").execute(),
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
    special_dates = {
        str(item.get("event_date"))
        for item in all_special_dates
        if item.get("event_date")
    }

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
            if cursor >= today_value and day_availability.get(day_key) and date_key not in special_dates:
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
                    return !(date < todayMidnight || date >= monthAfterNext || !dayAvailability[weekday] || specialDates.includes(key) || !hasSlots);
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
def send_otp_email(to_email, otp, subject='Your OTP Code', purpose='verification'):
    html = f"""
        <h2>OTP Verification</h2>
        <p>Your OTP for <strong>{purpose}</strong> is:</p>
        <p><strong style="font-size:32px; letter-spacing:8px">{otp}</strong></p>
        <p>This OTP expires in 10 minutes.</p>
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

    if not identifier or not password:
        return jsonify({"error": "Email or username, and password are required."}), 400

    try:
        profile, source_table = find_account_by_identifier(identifier)
        if not profile:
            return jsonify({"error": "No account found for that email or username."}), 401

        email = profile.get('email')

        auth_response = supabase.auth.sign_in_with_password({"email": email, "password": password})
        user = auth_response.user
        if not user:
            return jsonify({"error": "Login failed."}), 401

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


def create_appointment_record(data, allow_walk_in=False):
    data = data or {}
    owner_id = data.get('owner_id')
    pet_id = data.get('pet_id')
    is_walk_in = bool(data.get('is_walk_in', False))
    branch_id = data.get('branch_id') or data.get('branchId')

    try:
        branch_id = int(branch_id) if branch_id not in (None, '', 'null') else None
    except (TypeError, ValueError):
        branch_id = None

    if allow_walk_in and (owner_id == 'WALK_IN' or pet_id == 'WALK_IN') and is_walk_in:
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

        return {
            "message": "Guest appointment created!",
            "data": response.data,
            "appointment_id": None,
            "walkin_id": created_id,
            "target_id": created_id,
            "recordType": "walkin",
            "emailSent": email_sent,
        }

    required_fields = {
        "owner_id": owner_id,
        "pet_id": pet_id,
        "appointment_type": data.get('appointment_type') or data.get('service'),
        "appointment_date": data.get('appointment_date') or data.get('date'),
        "appointment_time": data.get('appointment_time') or data.get('time'),
    }
    missing = [key for key, value in required_fields.items() if not value]
    if missing:
        raise ValueError(f"Missing required fields: {missing}")

    response = supabase_admin.table('appointments').insert({
        "owner_id": owner_id,
        "pet_id": pet_id,
        "appointment_type": required_fields["appointment_type"],
        "appointment_date": required_fields["appointment_date"],
        "appointment_time": required_fields["appointment_time"],
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

    if record_type == 'walkin' and not walkin_id:
        return jsonify({"error": "walkin_id is required for walkin medical information"}), 400
    if record_type != 'walkin' and not appointment_id:
        return jsonify({"error": "appointment_id is required"}), 400

    try:
        payload = {
            "record_type": record_type,
            "appointment_id": appointment_id if record_type != 'walkin' else None,
            "walkin_id": walkin_id if record_type == 'walkin' else None,
            "is_pregnant": data.get('is_pregnant'),
            "is_vaccinated": data.get('is_vaccinated'),
            "has_allergies": data.get('has_allergies'),
            "allergy_details": data.get('allergy_details'),
            "has_skin_condition": data.get('has_skin_condition'),
            "been_groomed_before": data.get('been_groomed_before'),
            "on_medication": data.get('on_medication'),
            "medication_details": data.get('medication_details'),
            "skin_condition_details": data.get('skin_condition_details'),
            "flea_tick_prevention": data.get('flea_tick_prevention'),
            "additional_notes": data.get('additional_notes'),
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


# -----------------------------------------------
# EMR SEARCH / RECORDS
# -----------------------------------------------
@app.route('/api/emr/search-pets', methods=['GET'])
def get_emr_search_pets():
    try:
        return jsonify({"pets": get_emr_search_results()}), 200
    except Exception as e:
        print("EMR pet search error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/emr/records', methods=['GET', 'POST'])
def emr_records_collection():
    if request.method == 'GET':
        try:
            return jsonify({"records": get_emr_records(include_billing=True)}), 200
        except Exception as e:
            print("EMR records fetch error:", str(e))
            return jsonify({"error": str(e)}), 400

    try:
        saved_record = save_emr_record_payload(request.get_json() or {})
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
            records = get_emr_records([record_id], include_billing=True)
            if not records:
                return jsonify({"error": "Medical record not found."}), 404
            return jsonify({"record": records[0]}), 200
        except Exception as e:
            print("EMR record detail error:", str(e))
            return jsonify({"error": str(e)}), 400

    if request.method == 'PUT':
        try:
            saved_record = save_emr_record_payload(request.get_json() or {}, existing_record_id=record_id)
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
        existing_record = get_single_row("medical_records", "medical_record_id", record_id)
        if not existing_record:
            return jsonify({"error": "Medical record not found."}), 404

        supabase_admin.table("medical_records").delete().eq("medical_record_id", record_id).execute()
        return jsonify({"message": "Medical record deleted successfully."}), 200
    except Exception as e:
        print("EMR delete error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/emr/pets/<int:pet_id>/appointments', methods=['GET'])
def get_emr_pet_appointment_history(pet_id):
    try:
        return jsonify({"appointments": get_emr_pet_appointments(pet_id)}), 200
    except Exception as e:
        print("EMR pet appointments error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/emr/lab-results/<int:lab_result_id>/owner-visibility', methods=['PUT'])
def update_emr_lab_result_owner_visibility(lab_result_id):
    try:
        data = request.get_json() or {}
        visible_to_owner = coerce_optional_bool(data.get("visibleToOwner"))
        if visible_to_owner is None:
            return jsonify({"error": "visibleToOwner is required."}), 400

        existing_row = get_single_row("medical_record_lab_results", "medical_record_lab_result_id", lab_result_id)
        if not existing_row:
            return jsonify({"error": "Lab result not found."}), 404

        payload = build_owner_visibility_payload(
            {"visibleToOwner": visible_to_owner, **data},
            existing_row=existing_row,
        )
        response = supabase_admin.table("medical_record_lab_results").update(payload).eq(
            "medical_record_lab_result_id", lab_result_id
        ).execute().data or []
        updated_row = response[0] if response else get_single_row("medical_record_lab_results", "medical_record_lab_result_id", lab_result_id)

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
        visible_to_owner = coerce_optional_bool(data.get("visibleToOwner"))
        if visible_to_owner is None:
            return jsonify({"error": "visibleToOwner is required."}), 400

        existing_row = get_single_row("medical_record_vaccinations", "medical_record_vaccination_id", vaccination_id)
        if not existing_row:
            return jsonify({"error": "Vaccination record not found."}), 404

        payload = build_owner_visibility_payload(
            {"visibleToOwner": visible_to_owner, **data},
            existing_row=existing_row,
        )
        response = supabase_admin.table("medical_record_vaccinations").update(payload).eq(
            "medical_record_vaccination_id", vaccination_id
        ).execute().data or []
        updated_row = response[0] if response else get_single_row("medical_record_vaccinations", "medical_record_vaccination_id", vaccination_id)

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
        res = execute_with_retry(
            lambda: supabase_admin.table('employee_accounts').select('*').execute(),
            context='Fetch employee accounts'
        )
        accounts = [normalize_employee_admin_account(item) for item in (res.data or [])]
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
        }).execute()

        created = insert_response.data[0] if insert_response.data else None
        employee_name = f"{first_name} {last_name}".strip()
        setup_token, _ = issue_employee_setup_token(user.id, email, created_by=data.get('created_by') or data.get('userId'))
        email_sent = False
        try:
            send_employee_setup_email(email, employee_name, build_employee_setup_link(setup_token))
            email_sent = True
        except Exception as mail_error:
            print("Employee setup email error:", str(mail_error))

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

        if not update_data:
            return jsonify({"error": "No valid fields to update"}), 400

        if auth_updates:
            supabase_admin.auth.admin.update_user_by_id(account_id, auth_updates)

        response = supabase_admin.table('employee_accounts') \
            .update(update_data) \
            .eq('id', account_id) \
            .execute()

        updated = response.data[0] if response.data else get_single_row('employee_accounts', 'id', account_id)
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
        return jsonify({"products": build_billing_product_catalog()}), 200
    except Exception as e:
        print("Fetch billing products error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/billing/source-records', methods=['GET'])
def get_billing_source_records():
    try:
        return jsonify(build_billing_source_records()), 200
    except Exception as e:
        print("Fetch billing source records error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/billing/invoices', methods=['GET'])
def get_billing_invoices():
    try:
        invoice_response = execute_with_retry(
            lambda: supabase_admin.table("billing_invoices").select("*").order("invoice_date", desc=True).order("invoice_time", desc=True).execute(),
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
        invoice_type = str(data.get("invoiceType") or data.get("invoice_type") or "").strip().lower()
        if invoice_type not in {"appointment", "walkin"}:
            raise ValueError("invoiceType is invalid")

        source_record_type_raw = data.get("sourceRecordType") or data.get("source_record_type")
        source_record_type = None
        if source_record_type_raw not in (None, ""):
            source_record_type = str(source_record_type_raw).strip().lower()
            if source_record_type not in {"appointment", "walkin", "visit"}:
                raise ValueError("sourceRecordType is invalid")

        source_record_id = coerce_int(
            data.get("sourceRecordId", data.get("source_record_id")),
            "sourceRecordId",
            minimum=1,
            allow_none=True,
        )

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

        existing_invoice = get_active_billing_invoice_for_source(source_record_type, source_record_id)
        if existing_invoice:
            normalized_existing_invoice = fetch_billing_invoice_with_details(existing_invoice.get("billing_invoice_id"))
            return jsonify({
                "error": "An active invoice already exists for this billing source.",
                "invoice": normalized_existing_invoice,
            }), 409

        service_lookups = build_billing_service_lookups()
        product_lookup = build_billing_product_lookup()

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

        normalized_invoice = fetch_billing_invoice_with_details(invoice_id)
        if not normalized_invoice:
            normalized_invoice = normalize_billing_invoice_record(
                created_invoice,
                service_items=created_service_items,
                product_items=created_product_items,
                payment_history=created_payment_history,
                payment_handler_lookup=build_billing_payment_handler_lookup(created_payment_history),
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
        invoice_record = get_single_row("billing_invoices", "billing_invoice_id", invoice_id)
        if not invoice_record:
            return jsonify({"error": "Invoice not found"}), 404

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

        normalized_invoice = fetch_billing_invoice_with_details(invoice_id)
        if not normalized_invoice:
            raise ValueError("Updated invoice could not be loaded")

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
        invoice_ids_raw = data.get("invoiceIds", data.get("invoice_ids")) or []
        if not isinstance(invoice_ids_raw, list) or not invoice_ids_raw:
            raise ValueError("invoiceIds is required")

        parsed_ids = [
            coerce_int(invoice_id, "invoiceId", minimum=1)
            for invoice_id in invoice_ids_raw
        ]

        supabase_admin.table("billing_invoices").delete().in_("billing_invoice_id", parsed_ids).execute()
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
        archived_raw = request.args.get('archived')
        category = (request.args.get('category') or '').strip()
        stock_status = (request.args.get('stock_status', request.args.get('stockStatus')) or '').strip()
        search = (request.args.get('search') or '').strip()

        query = supabase_admin.table('inventory_items').select('*')
        if branch_id:
            query = query.eq('branch_id', coerce_int(branch_id, 'branch_id', minimum=1))
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
        item, error_response = get_inventory_item_or_404(item_id)
        if error_response:
            return error_response
        return jsonify({'item': normalize_inventory_item(item)}), 200
    except Exception as e:
        print("Fetch inventory item error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/inventory/items', methods=['POST'])
def create_inventory_item():
    data = request.get_json() or {}
    try:
        payload = build_inventory_item_payload(data)
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
        existing, error_response = get_inventory_item_or_404(item_id)
        if error_response:
            return error_response

        payload = build_inventory_item_payload(data, existing=existing)
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
        item, error_response = get_inventory_item_or_404(item_id)
        if error_response:
            return error_response

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
        item, error_response = get_inventory_item_or_404(item_id)
        if error_response:
            return error_response

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
        payload = build_inventory_transaction_payload(data, 'IN')
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
        payload = build_inventory_transaction_payload(data, 'OUT')
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
        log_type = (request.args.get('type') or '').strip()
        product_name = (request.args.get('product') or request.args.get('productName') or '').strip()
        search = (request.args.get('search') or '').strip()
        start_date = (request.args.get('start_date') or request.args.get('startDate') or '').strip()
        end_date = (request.args.get('end_date') or request.args.get('endDate') or '').strip()

        query = supabase_admin.table('inventory_logs_view').select('*')
        if branch_id:
            query = query.eq('branch_id', coerce_int(branch_id, 'branch_id', minimum=1))
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
        module = (request.args.get('module') or 'inventory').strip() or 'inventory'
        unread_only = parse_bool(request.args.get('unread_only', request.args.get('unreadOnly')), default=False)
        limit_raw = request.args.get('limit')

        _, employee_error = get_employee_account_or_400(admin_user_id)
        if employee_error:
            return jsonify({'error': employee_error}), 400

        query = supabase_admin.table('admin_notifications').select('*')
        if branch_id_raw:
            query = query.eq('branch_id', coerce_int(branch_id_raw, 'branch_id', minimum=1))
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


@app.route('/api/admin-notifications/<int:notification_id>/read', methods=['POST'])
def read_admin_notification(notification_id):
    data = request.get_json() or {}
    try:
        admin_user_id = (data.get('admin_user_id') or data.get('adminUserId') or '').strip()
        _, employee_error = get_employee_account_or_400(admin_user_id)
        if employee_error:
            return jsonify({'error': employee_error}), 400

        notification = get_single_row('admin_notifications', 'notification_id', notification_id)
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404

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


@app.route('/api/admin-notifications/read-all', methods=['POST'])
def read_all_admin_notifications():
    data = request.get_json() or {}
    try:
        admin_user_id = (data.get('admin_user_id') or data.get('adminUserId') or '').strip()
        branch_id_raw = data.get('branch_id', data.get('branchId'))
        module = (data.get('module') or 'inventory').strip() or 'inventory'

        _, employee_error = get_employee_account_or_400(admin_user_id)
        if employee_error:
            return jsonify({'error': employee_error}), 400

        query = supabase_admin.table('admin_notifications').select('notification_id')
        if branch_id_raw not in (None, ''):
            query = query.eq('branch_id', coerce_int(branch_id_raw, 'branch_id', minimum=1))
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


def build_admin_appointment_rows(include_history=False):
    appointments = execute_with_retry(
        lambda: supabase_admin.table("appointments").select("*").execute(),
        context="Fetch appointments for admin schedule"
    ).data or []
    walkins = execute_with_retry(
        lambda: supabase_admin.table("walkin_appointments").select("*").execute(),
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
            "recordLabel": "Guest Appointment",
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
    return " ".join(str(value or "").strip().lower().split())


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
    base_unit_price = float(
        unit_price
        if unit_price not in (None, "")
        else (matched_service or {}).get("price") or 0
    )

    return {
        "id": str((matched_service or {}).get("serviceId") or (matched_service or {}).get("serviceCode") or f"service-{sort_order}"),
        "serviceId": (matched_service or {}).get("serviceId"),
        "serviceCode": (matched_service or {}).get("serviceCode"),
        "name": (matched_service or {}).get("name") or safe_name,
        "description": (matched_service or {}).get("description") or f"{safe_name} service",
        "category": (matched_service or {}).get("category") or "Other",
        "subcategory": (matched_service or {}).get("subcategory") or "",
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


def build_billing_product_catalog():
    try:
        response = execute_with_retry(
            lambda: supabase_admin.table("inventory_items").select("*").order("item_name").execute(),
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
            "name": normalized.get("item") or "",
            "sku": normalized.get("code") or "",
            "category": billing_category,
            "price": float(normalized.get("sellingPrice") or 0),
            "stock": int(normalized.get("stockCount") or 0),
            "description": description,
        })

    return products


def build_billing_product_lookup():
    return {
        product.get("id"): product
        for product in build_billing_product_catalog()
        if product.get("id")
    }


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


def build_billing_source_records():
    completed_history_rows = build_admin_appointment_rows(include_history=True)
    appointments = []
    walkins = []
    service_lookups = build_billing_service_lookups()
    emr_records = get_emr_records(include_billing=True)
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

            if source_type == "appointment" and source_id:
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
            continue

        if row.get("hasBillingInvoice"):
            continue

        service_label = row.get("service") or ""
        service_items = build_billing_service_items_from_label(service_label, lookups=service_lookups)
        service_names = [item.get("name") for item in service_items if item.get("name")]
        amount = round(sum(float(item.get("total") or 0) for item in service_items), 2)

        walkins.append({
            "id": record_id,
            "recordType": "walkin",
            "sourceRecordType": "walkin",
            "sourceRecordId": record_id,
            "date": str(row.get("date_only") or row.get("appointment_date") or ""),
            "time": row.get("time_display") or format_display_time(row.get("appointment_time")) or "",
            "veterinarian": row.get("doctor") or "Not Assigned",
            "petName": row.get("petName") or row.get("pet_name") or "",
            "petSpecies": row.get("pet_species") or row.get("type") or "",
            "petBreed": row.get("petBreed") or row.get("pet_breed") or row.get("breed") or "",
            "ownerName": row.get("ownerName") or row.get("owner_name") or row.get("name") or "",
            "ownerEmail": "" if row.get("email") == "Not provided" else (row.get("email") or ""),
            "ownerPhone": "" if row.get("phone") == "Not provided" else (row.get("phone") or ""),
            "reason": "" if row.get("reason") == "Not provided" else (row.get("reason") or ""),
            "services": service_names or ([service_label] if service_label else []),
            "serviceItems": service_items,
            "amount": amount,
            "branchId": row.get("branch_id"),
            "status": normalized_status,
            "billingInvoiceId": row.get("billingInvoiceId"),
            "billingInvoiceNumber": row.get("billingInvoiceNumber"),
            "isBilled": False,
            "reasonIsServiceFallback": False,
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
        return jsonify({"message": "Day availability saved", "day_of_week": day, "is_available": is_available}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/day-availability/<day_name>', methods=['PUT'])
def update_day_availability(day_name):
    data = request.get_json() or {}
    is_available = bool(data.get('is_available'))
    try:
        supabase_admin.table('working_days').upsert({
            "day_of_week": (day_name or '').lower(),
            "is_active": is_available,
        }).execute()
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
            return jsonify({"timeSlots": res.data or []}), 200
        except Exception as e:
            print("Time slot save error:", str(e))
            return jsonify({"error": str(e)}), 400

    slot_id = param
    try:
        if str(slot_id).startswith('temp-'):
            return jsonify({"message": "Temp slot removed"}), 200

        supabase_admin.table('time_slots').delete().eq('id', slot_id).execute()
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
    try:
        created = create_appointment_record(request.get_json() or {}, allow_walk_in=True)
        return jsonify(created), 200
    except ValueError as value_error:
        return jsonify({"error": str(value_error)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/appointments/table', methods=['GET'])
def get_appointments_table():
    try:
        return jsonify({"appointments": build_admin_appointment_rows(include_history=False)}), 200
    except Exception as e:
        print("Appointments table error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/appointments/history', methods=['GET'])
def get_appointments_history():
    try:
        return jsonify({"appointments": build_admin_appointment_rows(include_history=True)}), 200
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
        apply_reschedule_to_target(req, req.get("proposed_appointment_date"), req.get("proposed_appointment_time"))
        supabase_admin.table('reschedule_requests').update({
            "status": "confirmed",
            "responded_at": datetime.utcnow().isoformat(),
            "patient_response_type": "confirm"
        }).eq('request_id', req.get('request_id')).execute()

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
        special_dates_res = supabase_admin.table('special_dates').select('event_date').eq('event_date', date).execute()
        if special_dates_res.data:
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

        apply_reschedule_to_target(req, proposed_date, proposed_time)
        supabase_admin.table('reschedule_requests').update({
            "status": "confirmed",
            "responded_at": datetime.utcnow().isoformat(),
            "patient_response_type": "confirm"
        }).eq('request_id', request_id).execute()

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
        supabase_admin.table('special_dates').insert({
            "event_name": data.get('event_name'),
            "event_date": data.get('event_date')
        }).execute()
        return jsonify({"message": "Special date added successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/special-dates/<date>', methods=['DELETE'])
def delete_special_date(date):
    try:
        supabase_admin.table('special_dates').delete().eq('event_date', date).execute()
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
    app.run(debug=True, host='0.0.0.0', port=5000)
