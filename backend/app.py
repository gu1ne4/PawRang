from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import create_client, Client
from dotenv import load_dotenv
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import random
import string
import uuid
from datetime import datetime, timedelta
from html import escape

load_dotenv()
app = Flask(__name__)

# 🟢 CATCH-ALL CORS FIX (Prevents toggle switches from turning off)
CORS(app, resources={r'/*': {'origins': '*'}})

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

@app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
@app.route('/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    return '', 200

SUPABASE_URL     = os.environ.get('SUPABASE_URL')
SUPABASE_KEY     = os.environ.get('SUPABASE_KEY')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials in .env")

supabase       = create_client(SUPABASE_URL, SUPABASE_KEY)
supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("SERVICE KEY LENGTH:", len(os.environ.get('SUPABASE_SERVICE_KEY', '')))  # should be 200+
print("SERVICE KEY START:", os.environ.get('SUPABASE_SERVICE_KEY', '')[:20])   # should start with "eyJ"

otp_store = {}

# -----------------------------------------------
# HELPER — send OTP email via Gmail SMTP
# -----------------------------------------------
def send_otp_email(to_email, otp):
    smtp_email = os.environ.get('SMTP_EMAIL')
    smtp_pass  = os.environ.get('SMTP_PASSWORD')

    msg            = MIMEMultipart('alternative')
    msg['Subject'] = 'Your Password Reset OTP'
    msg['From']    = smtp_email
    msg['To']      = to_email

    html = f"""
        <h2>Password Reset OTP</h2>
        <p>Your OTP is: <strong style="font-size:24px">{otp}</strong></p>
        <p>This OTP expires in 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
    """
    msg.attach(MIMEText(html, 'html'))

    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
        server.login(smtp_email, smtp_pass)
        server.sendmail(smtp_email, to_email, msg.as_string())

def send_reschedule_email(to_email, patient_name, pet_name, service_name, new_date, new_time, reason=None, action_links=None):
    smtp_email = os.environ.get('SMTP_EMAIL')
    smtp_pass  = os.environ.get('SMTP_PASSWORD')

    if not smtp_email or not smtp_pass or not to_email:
        return False

    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'Appointment reschedule request'
    msg['From'] = smtp_email
    msg['To'] = to_email

    html = f"""
        <h2>Reschedule Request</h2>
        <p>Hello {patient_name or 'Patient'},</p>
        <p>The clinic is proposing a new schedule for <strong>{pet_name or 'your pet'}</strong>.</p>
        <p><strong>Service:</strong> {service_name or 'Appointment'}</p>
        <p><strong>Proposed Date:</strong> {new_date}</p>
        <p><strong>Proposed Time:</strong> {new_time}</p>
    """

    if reason:
        html += f"<p><strong>Reason for rescheduling:</strong> {reason}</p>"

    if action_links:
        html += f"""
            <div style="margin: 24px 0;">
                <a href="{action_links.get('confirm')}" style="display:inline-block;padding:12px 18px;background:#2e7d32;color:#fff;text-decoration:none;border-radius:8px;margin-right:10px;">Confirm New Schedule</a>
                <a href="{action_links.get('choose_another')}" style="display:inline-block;padding:12px 18px;background:#1565c0;color:#fff;text-decoration:none;border-radius:8px;margin-right:10px;">Choose Another Date</a>
                <a href="{action_links.get('cancel')}" style="display:inline-block;padding:12px 18px;background:#c62828;color:#fff;text-decoration:none;border-radius:8px;">Cancel Appointment</a>
            </div>
        """

    html += """
        <p>Your current appointment will stay unchanged until you confirm.</p>
        <p>If you have questions, please contact the clinic.</p>
    """

    msg.attach(MIMEText(html, 'html'))

    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
        server.login(smtp_email, smtp_pass)
        server.sendmail(smtp_email, to_email, msg.as_string())

    return True

def send_reschedule_review_email(to_email, patient_name, pet_name, service_name, appointment_date, appointment_time, action='accepted', clinic_note=None):
    smtp_email = os.environ.get('SMTP_EMAIL')
    smtp_pass  = os.environ.get('SMTP_PASSWORD')

    if not smtp_email or not smtp_pass or not to_email:
        return False

    normalized_action = (action or 'accepted').strip().lower()
    is_accepted = normalized_action == 'accepted'

    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'Preferred reschedule confirmed' if is_accepted else 'Preferred reschedule update'
    msg['From'] = smtp_email
    msg['To'] = to_email

    if is_accepted:
        body_html = f"""
            <h2>Preferred Schedule Confirmed</h2>
            <p>Hello {patient_name or 'Patient'},</p>
            <p>The clinic has accepted your preferred reschedule for <strong>{pet_name or 'your pet'}</strong>.</p>
            <p><strong>Service:</strong> {service_name or 'Appointment'}</p>
            <p><strong>Confirmed Date:</strong> {appointment_date or 'Not provided'}</p>
            <p><strong>Confirmed Time:</strong> {appointment_time or 'Not provided'}</p>
        """
    else:
        body_html = f"""
            <h2>Preferred Schedule Declined</h2>
            <p>Hello {patient_name or 'Patient'},</p>
            <p>The clinic reviewed your preferred schedule for <strong>{pet_name or 'your pet'}</strong>, but could not approve it at this time.</p>
            <p><strong>Service:</strong> {service_name or 'Appointment'}</p>
            <p><strong>Requested Date:</strong> {appointment_date or 'Not provided'}</p>
            <p><strong>Requested Time:</strong> {appointment_time or 'Not provided'}</p>
        """

    if clinic_note:
        body_html += f"<p><strong>Clinic Note:</strong> {clinic_note}</p>"

    body_html += (
        "<p>Your appointment has been updated to the confirmed schedule above.</p><p>If you need further changes, please contact the clinic.</p>"
        if is_accepted else
        "<p>Please wait for another proposed schedule from the clinic, or contact the clinic directly if you would like to discuss other available times.</p>"
    )

    msg.attach(MIMEText(body_html, 'html'))

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(smtp_email, smtp_pass)
            server.sendmail(smtp_email, to_email, msg.as_string())
        return True
    except Exception as email_error:
        print(f"Reschedule review email error: {email_error}")
        return False

def send_cancellation_email(to_email, patient_name, pet_name, service_name, appointment_date, appointment_time, reason=None):
    smtp_email = os.environ.get('SMTP_EMAIL')
    smtp_pass  = os.environ.get('SMTP_PASSWORD')

    if not smtp_email or not smtp_pass or not to_email:
        return False

    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'Appointment cancellation notice'
    msg['From'] = smtp_email
    msg['To'] = to_email

    html = f"""
        <h2>Appointment Cancelled</h2>
        <p>Hello {patient_name or 'Patient'},</p>
        <p>Your appointment for <strong>{pet_name or 'your pet'}</strong> has been cancelled by the clinic.</p>
        <p><strong>Service:</strong> {service_name or 'Appointment'}</p>
        <p><strong>Original Date:</strong> {appointment_date or 'Not provided'}</p>
        <p><strong>Original Time:</strong> {appointment_time or 'Not provided'}</p>
    """

    if reason:
        html += f"<p><strong>Reason for cancellation:</strong> {reason}</p>"

    html += """
        <p>If you would like to book a new appointment, please contact the clinic or use the booking page.</p>
        <p>We apologize for the inconvenience.</p>
    """

    msg.attach(MIMEText(html, 'html'))

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(smtp_email, smtp_pass)
            server.sendmail(smtp_email, to_email, msg.as_string())
        return True
    except Exception as email_error:
        print(f"Cancellation email error: {email_error}")
        return False

def send_booking_confirmation_email(to_email, patient_name, pet_name, service_name, appointment_date, appointment_time, appointment_status='pending'):
    smtp_email = os.environ.get('SMTP_EMAIL')
    smtp_pass  = os.environ.get('SMTP_PASSWORD')

    if not smtp_email or not smtp_pass or not to_email:
        return False

    normalized_status = (appointment_status or 'pending').strip().lower()
    is_pending = normalized_status == 'pending'

    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'Appointment request received' if is_pending else 'Appointment booking confirmation'
    msg['From'] = smtp_email
    msg['To'] = to_email

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
        <h2>Appointment Booking Confirmation</h2>
        <p>Hello {patient_name or 'Patient'},</p>
        <p>We have received the appointment request for <strong>{pet_name or 'your pet'}</strong>.</p>
        <p><strong>Service:</strong> {service_name or 'Appointment'}</p>
        <p><strong>Date:</strong> {appointment_date or 'Not provided'}</p>
        <p><strong>Time:</strong> {appointment_time or 'Not provided'}</p>
        {status_html}
        <p>If any detail needs to change, please contact the clinic.</p>
    """

    msg.attach(MIMEText(html, 'html'))

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(smtp_email, smtp_pass)
            server.sendmail(smtp_email, to_email, msg.as_string())
        return True
    except Exception as email_error:
        print(f"Booking confirmation email error: {email_error}")
        return False

def send_appointment_confirmed_email(to_email, patient_name, pet_name, service_name, appointment_date, appointment_time, assigned_doctor=None):
    smtp_email = os.environ.get('SMTP_EMAIL')
    smtp_pass  = os.environ.get('SMTP_PASSWORD')

    if not smtp_email or not smtp_pass or not to_email:
        return False

    doctor_line = (
        f"<p><strong>Assigned Doctor:</strong> {assigned_doctor}</p>"
        if assigned_doctor else
        "<p><strong>Assigned Doctor:</strong> To be assigned by the clinic</p>"
    )

    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'Appointment confirmed'
    msg['From'] = smtp_email
    msg['To'] = to_email

    html = f"""
        <h2>Appointment Confirmed</h2>
        <p>Hello {patient_name or 'Patient'},</p>
        <p>Your appointment for <strong>{pet_name or 'your pet'}</strong> has been confirmed by the clinic.</p>
        <p><strong>Service:</strong> {service_name or 'Appointment'}</p>
        <p><strong>Date:</strong> {appointment_date or 'Not provided'}</p>
        <p><strong>Time:</strong> {appointment_time or 'Not provided'}</p>
        {doctor_line}
        <p>Please arrive a few minutes early for your schedule.</p>
        <p>If you need to make changes, please contact the clinic.</p>
    """

    msg.attach(MIMEText(html, 'html'))

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(smtp_email, smtp_pass)
            server.sendmail(smtp_email, to_email, msg.as_string())
        return True
    except Exception as email_error:
        print(f"Appointment confirmed email error: {email_error}")
        return False

def format_display_time(time_value):
    if not time_value:
        return ''

    time_str = str(time_value)
    parts = time_str.split(':')
    if len(parts) < 2:
        return time_str

    hour = int(parts[0])
    minute = parts[1]
    suffix = 'PM' if hour >= 12 else 'AM'
    display_hour = hour % 12 or 12
    return f"{display_hour}:{minute} {suffix}"

def format_display_time_range(time_value):
    if not time_value:
        return ''

    time_str = str(time_value)
    parts = time_str.split(':')
    if len(parts) < 2:
        return time_str

    start_hour = int(parts[0])
    minute = parts[1]
    end_hour = (start_hour + 1) % 24

    start_suffix = 'PM' if start_hour >= 12 else 'AM'
    end_suffix = 'PM' if end_hour >= 12 else 'AM'
    start_display_hour = start_hour % 12 or 12
    end_display_hour = end_hour % 12 or 12

    return f"{start_display_hour}:{minute} {start_suffix} - {end_display_hour}:{minute} {end_suffix}"

def get_public_base_url():
    return (
        os.environ.get('PUBLIC_API_URL')
        or os.environ.get('BACKEND_PUBLIC_URL')
        or os.environ.get('APP_BASE_URL')
        or request.url_root.rstrip('/')
    )

def normalize_medical_information_record(record):
    if not record:
        return None

    record_type = record.get("record_type") or ("walkin" if record.get("walkin_id") not in (None, "") else "appointment")
    target_id = record.get("walkin_id") if record_type == "walkin" else record.get("appointment_id")

    return {
        "id": record.get("id") or record.get("medical_information_id"),
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

def get_single_row(table_name, column, value):
    result = supabase_admin.table(table_name).select('*').eq(column, value).execute()
    rows = result.data or []

    if len(rows) > 1:
        raise ValueError(f"Multiple {table_name} records found for {column}.")

    return rows[0] if rows else None

def split_full_name(full_name):
    parts = (full_name or "").strip().split()
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])

def normalize_email_address(email):
    return (email or "").strip().lower()

def find_account_by_email(email):
    normalized_email = normalize_email_address(email)
    if not normalized_email:
        return None

    patient = get_single_row('patient_account', 'email', normalized_email)
    if patient:
        return {
            "account_type": "patient",
            "user_id": patient.get('id'),
            "email": normalized_email
        }

    employee = get_single_row('employee_accounts', 'email', normalized_email)
    if employee:
        return {
            "account_type": "employee",
            "user_id": employee.get('id'),
            "email": normalized_email
        }

    return None

def get_profile_display_name(profile):
    if not profile:
        return ""

    first_name = profile.get('firstName') or profile.get('first_name') or ""
    last_name = profile.get('lastName') or profile.get('last_name') or ""
    combined_name = f"{first_name} {last_name}".strip()

    return (
        combined_name
        or profile.get('full_name')
        or profile.get('fullname')
        or profile.get('username')
        or profile.get('email')
        or ""
    )

def normalize_patient_admin_account(profile):
    if not profile:
        return None

    first_name = profile.get('firstName') or profile.get('first_name') or ""
    last_name = profile.get('lastName') or profile.get('last_name') or ""
    full_name = (
        profile.get('full_name')
        or profile.get('fullname')
        or f"{first_name} {last_name}".strip()
        or profile.get('username')
        or profile.get('email')
        or "Unknown"
    )
    contact = profile.get('contact_number') or profile.get('contactNumber') or profile.get('contactnumber') or ""
    user_image = profile.get('userImage') or profile.get('userimage') or profile.get('user_image')
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

def normalize_public_profile(profile):
    if not profile:
        return None

    first_name = profile.get('firstName') or profile.get('first_name') or ""
    last_name = profile.get('lastName') or profile.get('last_name') or ""
    full_name = f"{first_name} {last_name}".strip() or profile.get('full_name') or profile.get('fullname') or get_profile_display_name(profile)

    if (not first_name or not last_name) and full_name:
        split_first, split_last = split_full_name(full_name)
        first_name = first_name or split_first
        last_name = last_name or split_last

    contact = profile.get('contact_number') or profile.get('contactNumber') or profile.get('contactnumber') or ""
    user_image = profile.get('userImage') or profile.get('userimage') or profile.get('user_image') or profile.get('profileImage')
    created_at = profile.get('created_at') or profile.get('dateJoined') or profile.get('date_joined') or ""
    raw_status = (profile.get('status') or 'active').strip().lower()

    normalized = {
        "id": profile.get('id'),
        "username": profile.get('username') or "",
        "email": profile.get('email') or "",
        "fullname": full_name,
        "fullName": full_name,
        "firstName": first_name,
        "lastName": last_name,
        "contact_number": contact,
        "contactNumber": contact,
        "role": profile.get('role'),
        "status": raw_status,
        "userImage": user_image,
        "userimage": user_image,
        "profileImage": user_image,
        "created_at": created_at,
        "dateJoined": created_at,
    }

    return normalized

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

def get_reschedule_email_context(table_name, id_column, record_id):
    record_res = supabase_admin.table(table_name).select('*').eq(id_column, record_id).single().execute()
    record = record_res.data or {}

    if table_name == 'walkin_appointments':
        return {
            "record": record,
            "email": record.get('email'),
            "patient_name": f"{record.get('first_name', '')} {record.get('last_name', '')}".strip() or 'Patient',
            "pet_name": record.get('pet_name') or 'your pet',
            "service_name": record.get('appointment_type') or 'Appointment',
        }

    owner = {}
    pet = {}

    owner_id = record.get('owner_id')
    pet_id = record.get('pet_id')

    if owner_id:
        owner_res = supabase_admin.table('patient_account').select('*').eq('id', owner_id).single().execute()
        owner = owner_res.data or {}

    if pet_id:
        pet_res = supabase_admin.table('pet_profile').select('*').eq('pet_id', pet_id).single().execute()
        pet = pet_res.data or {}

    patient_name = f"{owner.get('firstName', '')} {owner.get('lastName', '')}".strip() or owner.get('fullname') or owner.get('username') or 'Patient'

    return {
        "record": record,
        "email": owner.get('email'),
        "patient_name": patient_name,
        "pet_name": pet.get('pet_name') or 'your pet',
        "service_name": record.get('appointment_type') or 'Appointment',
    }

def get_assigned_doctor_name_from_record(record):
    if not record:
        return None

    doctor_id = record.get('assigned_doctor_id') or record.get('doctor_id')
    if not doctor_id:
        return None

    try:
        doctor_res = supabase_admin.table('employee_accounts').select('*').eq('id', doctor_id).single().execute()
        doctor = doctor_res.data or {}
        full_name = get_profile_display_name(doctor)
        return full_name or None
    except Exception as doctor_error:
        print(f"Assigned doctor lookup error: {doctor_error}")
        return None

def get_pending_reschedule_request(token):
    req_res = supabase_admin.table('reschedule_requests').select('*').eq('token', token).single().execute()
    req = req_res.data or None

    if not req:
        return None, "not_found"

    if req.get('status') != 'pending':
        return req, "closed"

    expires_at_raw = req.get('expires_at')
    if expires_at_raw:
        expires_at = datetime.fromisoformat(str(expires_at_raw).replace('Z', '+00:00'))
        if datetime.now(expires_at.tzinfo) > expires_at:
            supabase_admin.table('reschedule_requests').update({
                "status": "expired",
                "responded_at": datetime.utcnow().isoformat()
            }).eq('request_id', req.get('request_id')).execute()
            req['status'] = 'expired'
            return req, "expired"

    return req, "ok"

def get_reschedule_request_by_id(request_id):
    req_res = supabase_admin.table('reschedule_requests').select('*').eq('request_id', request_id).single().execute()
    return req_res.data or None

def apply_reschedule_to_target(req, appointment_date, appointment_time):
    table_name, id_column, resolved_id = resolve_appointment_target(req.get('target_id'), req.get('target_type'))
    current_res = supabase_admin.table(table_name).select('*').eq(id_column, resolved_id).single().execute()
    current_record = current_res.data or {}
    current_status = current_record.get('status')

    update_payload = {
        "appointment_date": appointment_date,
        "appointment_time": appointment_time,
        "reschedule_reason": req.get("reason"),
        "rescheduled_at": datetime.utcnow().isoformat(),
        "rescheduled_by": req.get("requested_by"),
    }

    if current_status and current_status not in ('cancelled', 'completed'):
        update_payload["status"] = current_status

    supabase_admin.table(table_name).update(update_payload).eq(id_column, resolved_id).execute()
    return table_name, id_column, resolved_id

def render_html_page(title, message, extra_html=''):
    html = f"""
        <!doctype html>
        <html lang="en">
        <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>{title}</title>
            <style>
                body {{ font-family: Arial, sans-serif; background: #f6f8fb; margin: 0; padding: 24px; color: #1f2937; }}
                .card {{ max-width: 680px; margin: 40px auto; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 12px 30px rgba(0,0,0,0.08); }}
                h1 {{ margin-top: 0; font-size: 28px; }}
                p {{ line-height: 1.6; }}
                .actions a, .actions button {{ display: inline-block; margin: 8px 8px 0 0; padding: 12px 16px; border-radius: 8px; text-decoration: none; border: none; cursor: pointer; font-size: 14px; }}
                .primary {{ background: #2563eb; color: white; }}
                .success {{ background: #2e7d32; color: white; }}
                .danger {{ background: #c62828; color: white; }}
                .muted {{ background: #eef2ff; color: #334155; }}
                label {{ display: block; margin: 14px 0 6px; font-weight: 600; }}
                input, textarea {{ width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; box-sizing: border-box; }}
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
    return html, 200, {'Content-Type': 'text/html; charset=utf-8'}


def render_choose_another_date_page(req, error_message=''):
    proposed_date = escape(str(req.get('proposed_appointment_date') or 'Not provided'))
    proposed_time = escape(format_display_time(req.get('proposed_appointment_time')) or 'Not provided')
    error_banner = ''

    if error_message:
        error_banner = f'<div class="feedback-banner error-banner">{escape(error_message)}</div>'

    html = """
        <!doctype html>
        <html lang="en">
        <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Choose Another Date</title>
            <style>
                :root {
                    --primary: #3d67ee;
                    --primary-soft: #eef2ff;
                    --success-soft: #e8f5e9;
                    --warning-soft: #fff8e1;
                    --border: #e6e9f2;
                    --text-main: #1f2937;
                    --text-muted: #6b7280;
                    --danger: #d32f2f;
                    --surface: #ffffff;
                    --bg: linear-gradient(180deg, #f6f8fb 0%, #eef4ff 100%);
                }

                * { box-sizing: border-box; }
                body {
                    margin: 0;
                    min-height: 100vh;
                    font-family: Arial, sans-serif;
                    background: var(--bg);
                    color: var(--text-main);
                    padding: 32px 20px;
                }
                .page-shell {
                    max-width: 1240px;
                    margin: 0 auto;
                }
                .main-card {
                    background: var(--surface);
                    border-radius: 24px;
                    box-shadow: 0 18px 50px rgba(61, 103, 238, 0.08);
                    padding: 28px;
                }
                .headline {
                    margin: 0 0 6px;
                    font-size: 26px;
                    font-weight: 700;
                }
                .subtext {
                    margin: 0;
                    font-size: 15px;
                    color: var(--text-muted);
                    line-height: 1.6;
                }
                .summary-card {
                    margin-top: 22px;
                    padding: 18px 20px;
                    border-radius: 16px;
                    border: 1px solid #d8e3ff;
                    background: linear-gradient(135deg, #f8fbff 0%, #eef3ff 100%);
                }
                .summary-label {
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    color: var(--primary);
                    margin-bottom: 8px;
                }
                .summary-text {
                    font-size: 18px;
                    font-weight: 600;
                    line-height: 1.5;
                }
                .feedback-banner {
                    margin-top: 16px;
                    padding: 14px 16px;
                    border-radius: 12px;
                    font-size: 14px;
                    line-height: 1.5;
                }
                .error-banner {
                    background: #fff1f1;
                    border: 1px solid #f3c6c6;
                    color: var(--danger);
                }
                .content-grid {
                    display: grid;
                    grid-template-columns: minmax(320px, 420px) minmax(360px, 1fr);
                    gap: 22px;
                    margin-top: 24px;
                    align-items: start;
                }
                .panel {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 20px;
                    padding: 22px;
                    box-shadow: 0 0 18px rgba(0, 0, 0, 0.04);
                }
                .panel-title {
                    margin: 0 0 10px;
                    font-size: 16px;
                    font-weight: 700;
                }
                .panel-description {
                    margin: 0 0 18px;
                    font-size: 13px;
                    color: var(--text-muted);
                    line-height: 1.5;
                }
                .calendar-nav {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 14px;
                }
                .calendar-nav button {
                    width: 34px;
                    height: 34px;
                    border-radius: 50%;
                    border: none;
                    background: transparent;
                    color: var(--primary);
                    font-size: 22px;
                    cursor: pointer;
                }
                .calendar-nav button:disabled {
                    color: #c7cfdf;
                    cursor: not-allowed;
                }
                .calendar-month {
                    font-size: 16px;
                    font-weight: 700;
                }
                .calendar-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 8px 4px;
                    justify-items: center;
                }
                .weekday {
                    font-size: 11px;
                    font-weight: 700;
                    color: #9aa3b5;
                    margin-bottom: 4px;
                }
                .calendar-day,
                .calendar-empty {
                    width: 38px;
                    height: 38px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .calendar-day {
                    border-radius: 50%;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .calendar-day.available:hover {
                    background: #eef3ff;
                }
                .calendar-day.selected {
                    background: var(--primary);
                    color: white;
                    font-weight: 700;
                }
                .calendar-day.today {
                    background: #f0f7ff;
                    color: var(--primary);
                    font-weight: 700;
                }
                .calendar-day.disabled {
                    color: #d0d5dd;
                    cursor: not-allowed;
                }
                .selection-note {
                    margin-top: 16px;
                    padding: 12px 14px;
                    border-radius: 12px;
                    font-size: 13px;
                    font-weight: 600;
                }
                .selection-note.info {
                    background: var(--success-soft);
                    color: #2e7d32;
                }
                .selection-note.muted {
                    background: #f5f7fb;
                    color: var(--text-muted);
                    font-weight: 500;
                }
                .slot-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
                    gap: 10px;
                }
                .slot-button {
                    padding: 14px 16px;
                    border-radius: 12px;
                    border: 1px solid #d6deef;
                    background: white;
                    color: #475467;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .slot-button:hover {
                    border-color: var(--primary);
                    color: var(--primary);
                }
                .slot-button.selected {
                    border-color: transparent;
                    background: var(--primary);
                    color: white;
                    box-shadow: 0 10px 22px rgba(61, 103, 238, 0.25);
                }
                .empty-state {
                    padding: 16px;
                    border-radius: 12px;
                    background: #f7f8fb;
                    color: var(--text-muted);
                    font-size: 13px;
                    text-align: center;
                }
                .notes-label {
                    display: block;
                    margin-bottom: 8px;
                    font-size: 14px;
                    font-weight: 700;
                }
                textarea {
                    width: 100%;
                    min-height: 120px;
                    resize: vertical;
                    padding: 14px 15px;
                    border-radius: 12px;
                    border: 1px solid #d1d9ea;
                    font: inherit;
                    color: var(--text-main);
                }
                textarea:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(61, 103, 238, 0.12);
                }
                .actions {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 18px;
                }
                .primary-button {
                    border: none;
                    border-radius: 12px;
                    background: var(--primary);
                    color: white;
                    font-size: 15px;
                    font-weight: 700;
                    padding: 14px 22px;
                    cursor: pointer;
                    min-width: 200px;
                    box-shadow: 0 12px 24px rgba(61, 103, 238, 0.2);
                }
                .primary-button:disabled {
                    background: #c8d3f6;
                    cursor: not-allowed;
                    box-shadow: none;
                }
                @media (max-width: 920px) {
                    .main-card { padding: 20px; border-radius: 20px; }
                    .content-grid { grid-template-columns: 1fr; }
                    .actions { justify-content: stretch; }
                    .primary-button { width: 100%; }
                }
            </style>
        </head>
        <body>
            <div class="page-shell">
                <div class="main-card">
                    <h1 class="headline">Choose Another Date</h1>
                    <p class="subtext">Tell the clinic what schedule works better for you using the currently available appointment settings.</p>
                    <div class="summary-card">
                        <div class="summary-label">Clinic Proposed Schedule</div>
                        <div class="summary-text">__PROPOSED_DATE__ at __PROPOSED_TIME__</div>
                    </div>
                    __ERROR_BANNER__
                    <form method="post" id="preference-form">
                        <input type="hidden" id="preferred_date" name="preferred_date" />
                        <input type="hidden" id="preferred_time" name="preferred_time" />

                        <div class="content-grid">
                            <div class="panel">
                                <h2 class="panel-title">Select Preferred Date</h2>
                                <p class="panel-description">Only days enabled in the clinic availability settings are selectable here.</p>
                                <div class="calendar-nav">
                                    <button type="button" id="prev-month" aria-label="Previous month">&lsaquo;</button>
                                    <div class="calendar-month" id="calendar-month-label"></div>
                                    <button type="button" id="next-month" aria-label="Next month">&rsaquo;</button>
                                </div>
                                <div class="calendar-grid" id="calendar-grid"></div>
                                <div id="selected-date-note" class="selection-note muted">Pick a date to load available time slots.</div>
                            </div>

                            <div>
                                <div class="panel">
                                    <h2 class="panel-title">Select Preferred Time Slot</h2>
                                    <p class="panel-description">Available slots come directly from the clinic's configured time slots for the selected day.</p>
                                    <div id="slot-message" class="empty-state">Select a date first.</div>
                                    <div id="slot-grid" class="slot-grid" style="display:none;"></div>
                                    <div id="selected-time-note" class="selection-note muted">Choose a time slot after selecting a date.</div>
                                </div>

                                <div class="panel" style="margin-top: 22px;">
                                    <label class="notes-label" for="response_note">Notes for the clinic</label>
                                    <textarea id="response_note" name="response_note" placeholder="Let us know which dates or times work better for you."></textarea>
                                </div>

                                <div class="actions">
                                    <button class="primary-button" id="submit-button" type="submit" disabled>Send My Preference</button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            <script>
                const state = {
                    currentMonth: new Date(),
                    selectedDate: '',
                    selectedTime: '',
                    selectedTimeLabel: '',
                    availableDays: {},
                    specialDates: new Set(),
                    slots: []
                };

                const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                const today = new Date();
                const todayString = toDateString(today);
                const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                const maxMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

                const calendarGrid = document.getElementById('calendar-grid');
                const calendarMonthLabel = document.getElementById('calendar-month-label');
                const prevMonthButton = document.getElementById('prev-month');
                const nextMonthButton = document.getElementById('next-month');
                const selectedDateInput = document.getElementById('preferred_date');
                const selectedTimeInput = document.getElementById('preferred_time');
                const selectedDateNote = document.getElementById('selected-date-note');
                const selectedTimeNote = document.getElementById('selected-time-note');
                const slotMessage = document.getElementById('slot-message');
                const slotGrid = document.getElementById('slot-grid');
                const submitButton = document.getElementById('submit-button');
                const form = document.getElementById('preference-form');

                function toDateString(date) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                }

                function getDayName(dateString) {
                    const [year, month, day] = dateString.split('-').map(Number);
                    return dayNames[new Date(year, month - 1, day).getDay()];
                }

                function formatDisplayDate(dateString) {
                    if (!dateString) return '';
                    const [year, month, day] = dateString.split('-').map(Number);
                    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                }

                function normalizeTimeValue(timeString) {
                    if (!timeString) return '';
                    const parts = String(timeString).split(':');
                    const hours = parts[0] || '00';
                    const minutes = parts[1] || '00';
                    const seconds = parts[2] || '00';
                    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
                }

                function formatDisplayTime(timeString) {
                    if (!timeString) return '';
                    const [hours, minutes] = String(timeString).split(':');
                    const parsedHour = parseInt(hours, 10);
                    if (Number.isNaN(parsedHour)) return String(timeString);
                    const ampm = parsedHour >= 12 ? 'PM' : 'AM';
                    const displayHour = parsedHour % 12 || 12;
                    return `${displayHour}:${minutes} ${ampm}`;
                }

                function updateSubmitState() {
                    submitButton.disabled = !(state.selectedDate && state.selectedTime);
                }

                function renderCalendar() {
                    calendarGrid.innerHTML = '';
                    calendarMonthLabel.textContent = `${monthNames[state.currentMonth.getMonth()]} ${state.currentMonth.getFullYear()}`;
                    prevMonthButton.disabled = state.currentMonth <= minMonth;
                    nextMonthButton.disabled = state.currentMonth >= maxMonth;

                    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((dayLabel) => {
                        const weekday = document.createElement('div');
                        weekday.className = 'weekday';
                        weekday.textContent = dayLabel;
                        calendarGrid.appendChild(weekday);
                    });

                    const firstDayIndex = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth(), 1).getDay();
                    const daysInMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 0).getDate();

                    for (let i = 0; i < firstDayIndex; i += 1) {
                        const emptyCell = document.createElement('div');
                        emptyCell.className = 'calendar-empty';
                        calendarGrid.appendChild(emptyCell);
                    }

                    for (let day = 1; day <= daysInMonth; day += 1) {
                        const dayDate = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth(), day);
                        const dateString = toDateString(dayDate);
                        const dayName = getDayName(dateString);
                        const isToday = dateString === todayString;
                        const isSelected = dateString === state.selectedDate;
                        const isPast = dateString < todayString;
                        const isSpecialDate = state.specialDates.has(dateString);
                        const isUnavailableDay = state.availableDays[dayName] === false;
                        const isDisabled = isPast || isSpecialDate || isUnavailableDay;

                        const button = document.createElement('button');
                        button.type = 'button';
                        button.className = `calendar-day ${isDisabled ? 'disabled' : 'available'}${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`;
                        button.textContent = String(day);
                        button.disabled = isDisabled;

                        button.addEventListener('click', () => {
                            state.selectedDate = dateString;
                            state.selectedTime = '';
                            state.selectedTimeLabel = '';
                            state.slots = [];
                            selectedDateInput.value = dateString;
                            selectedTimeInput.value = '';
                            selectedDateNote.textContent = `Selected: ${formatDisplayDate(dateString)}`;
                            selectedDateNote.className = 'selection-note info';
                            selectedTimeNote.textContent = 'Loading configured time slots...';
                            selectedTimeNote.className = 'selection-note muted';
                            updateSubmitState();
                            renderCalendar();
                            loadTimeSlots(dateString);
                        });

                        calendarGrid.appendChild(button);
                    }
                }

                function renderSlots() {
                    slotGrid.innerHTML = '';

                    if (!state.selectedDate) {
                        slotMessage.style.display = 'block';
                        slotGrid.style.display = 'none';
                        slotMessage.textContent = 'Select a date first.';
                        selectedTimeNote.textContent = 'Choose a time slot after selecting a date.';
                        selectedTimeNote.className = 'selection-note muted';
                        updateSubmitState();
                        return;
                    }

                    if (state.slots.length === 0) {
                        slotMessage.style.display = 'block';
                        slotGrid.style.display = 'none';
                        slotMessage.textContent = 'No configured time slots for this date.';
                        selectedTimeNote.textContent = 'Pick another date to see other configured slots.';
                        selectedTimeNote.className = 'selection-note muted';
                        updateSubmitState();
                        return;
                    }

                    slotMessage.style.display = 'none';
                    slotGrid.style.display = 'grid';

                    state.slots.forEach((slot) => {
                        const button = document.createElement('button');
                        button.type = 'button';
                        button.className = `slot-button${state.selectedTime === slot.rawTime ? ' selected' : ''}`;
                        button.textContent = slot.label;
                        button.addEventListener('click', () => {
                            state.selectedTime = slot.rawTime;
                            state.selectedTimeLabel = slot.label;
                            selectedTimeInput.value = slot.rawTime;
                            selectedTimeNote.textContent = `Selected: ${slot.label}`;
                            selectedTimeNote.className = 'selection-note info';
                            renderSlots();
                            updateSubmitState();
                        });
                        slotGrid.appendChild(button);
                    });
                }

                async function loadConfig() {
                    try {
                        const [dayResponse, specialDateResponse] = await Promise.all([
                            fetch('/api/day-availability'),
                            fetch('/api/special-dates')
                        ]);

                        if (dayResponse.ok) {
                            const dayRows = await dayResponse.json();
                            const nextAvailability = {};
                            dayRows.forEach((row) => {
                                if (row && row.day_of_week) {
                                    nextAvailability[String(row.day_of_week).toLowerCase()] = !!row.is_available;
                                }
                            });
                            state.availableDays = nextAvailability;
                        }

                        if (specialDateResponse.ok) {
                            const specialPayload = await specialDateResponse.json();
                            const rows = (specialPayload && specialPayload.specialDates) || [];
                            state.specialDates = new Set(rows.map((item) => item && item.event_date).filter(Boolean));
                        }
                    } catch (error) {
                        console.error('Failed to load scheduling config', error);
                    } finally {
                        renderCalendar();
                        renderSlots();
                    }
                }

                async function loadTimeSlots(dateString) {
                    slotMessage.style.display = 'block';
                    slotGrid.style.display = 'none';
                    slotMessage.textContent = 'Loading configured time slots...';

                    try {
                        const dayName = getDayName(dateString);
                        const response = await fetch(`/api/time-slots/${dayName}`);
                        const payload = response.ok ? await response.json() : { timeSlots: [] };
                        const rawSlots = (payload && payload.timeSlots) || [];
                        const activeSlots = rawSlots.filter((slot) => slot && slot.is_active !== false);

                        const slotChecks = activeSlots.map((slot) => {
                            const rawStart = normalizeTimeValue(slot.start_time || '');
                            const rawEnd = normalizeTimeValue(slot.end_time || '');

                            return {
                                rawTime: rawStart,
                                label: `${formatDisplayTime(rawStart)} - ${formatDisplayTime(rawEnd)}`
                            };
                        });

                        state.slots = slotChecks;
                    } catch (error) {
                        console.error('Failed to load time slots', error);
                        state.slots = [];
                    }

                    renderSlots();
                }

                prevMonthButton.addEventListener('click', () => {
                    if (state.currentMonth > minMonth) {
                        state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
                        renderCalendar();
                    }
                });

                nextMonthButton.addEventListener('click', () => {
                    if (state.currentMonth < maxMonth) {
                        state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
                        renderCalendar();
                    }
                });

                form.addEventListener('submit', (event) => {
                    if (!state.selectedDate || !state.selectedTime) {
                        event.preventDefault();
                        slotMessage.style.display = 'block';
                        slotMessage.textContent = 'Please choose both a preferred date and a preferred time slot before sending your preference.';
                    }
                });

                loadConfig();
            </script>
        </body>
        </html>
    """

    html = html.replace('__PROPOSED_DATE__', proposed_date)
    html = html.replace('__PROPOSED_TIME__', proposed_time)
    html = html.replace('__ERROR_BANNER__', error_banner)
    return html, 200, {'Content-Type': 'text/html; charset=utf-8'}


# -----------------------------------------------
# SIGNUP (Restored to your working version)
# -----------------------------------------------
@app.route('/signup', methods=['POST'])
def signup():
    data           = request.get_json()
    email          = data.get('email')
    password       = data.get('password')
    full_name      = data.get('fullName')
    contact_number = data.get('contactNumber')
    username       = data.get('username')

    try:
        auth_response = supabase.auth.sign_up({
            "email":    email,
            "password": password
        })

        user = auth_response.user
        if not user:
            return jsonify({"error": "Signup failed"}), 400

        # Check if email confirmation is pending
        email_confirmed = user.email_confirmed_at is not None

        supabase.table('patient_account').insert({
            "id":             user.id,
            "email":          email,
            "fullname":       full_name,
            "username":       username,
            "contact_number": contact_number,
            "role":           "patient",
            "status":         "active"
        }).execute()

        return jsonify({
            "message": "Signup successful! Please check your email to confirm your account before logging in.",
            "requiresConfirmation": not email_confirmed,   # ← tells frontend what to do
            "user": {
                "id":       user.id,
                "email":    user.email,
                "username": username,
                "fullname": full_name,
            }
        }), 200

    except Exception as e:
        print("Signup error:", e)
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# LOGIN (Restored to your working version + Admin Fallback)
# -----------------------------------------------
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    identifier = data.get('email')   # This can be email OR username
    password = data.get('password')

    # Determine if identifier is email or username
    email = identifier
    if '@' not in identifier:
        # It's a username – look up email from patient_account or employee_accounts
        try:
            # Check patient_account
            result = supabase.table('patient_account').select('email').eq('username', identifier).execute()
            if result.data:
                email = result.data[0]['email']
            else:
                # Check employee_accounts
                result = supabase.table('employee_accounts').select('email').eq('username', identifier).execute()
                if result.data:
                    email = result.data[0]['email']
                else:
                    return jsonify({"error": "Invalid username or email"}), 401
        except Exception as e:
            print("Username lookup error:", e)
            return jsonify({"error": "Invalid credentials"}), 401

    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })

        user = auth_response.user
        if not user:
            return jsonify({"error": "Login failed"}), 401

        # Block login if email not confirmed
        if not user.email_confirmed_at:
            return jsonify({
                "error": "Please confirm your email before logging in. Check your inbox."
            }), 403

        # Fetch profile from patient_account or employee_accounts
        profile = None
        try:
            profile_response = supabase.table('patient_account').select('*').eq('id', user.id).single().execute()
            profile = profile_response.data
        except:
            pass

        if not profile:
            try:
                profile_response = supabase.table('employee_accounts').select('*').eq('id', user.id).single().execute()
                profile = profile_response.data
            except:
                pass

        if not profile:
            return jsonify({"error": "Profile not found"}), 404

        fullname = get_profile_display_name(profile)

        return jsonify({
            "message": "Login successful!",
            "user": {
                "id":             user.id,
                "email":          user.email,
                "username":       profile.get('username'),
                "fullname":       fullname,
                "contact_number": profile.get('contact_number'),
                "role":           profile.get('role'),
                "status":         profile.get('status'),
            }
        }), 200

    except Exception as e:
        print("Login error:", e)
        return jsonify({"error": str(e)}), 401


# -----------------------------------------------
# ADD PET PROFILE
# -----------------------------------------------
@app.route('/pets', methods=['POST'])
def add_pet():
    data = request.get_json()

    owner_id = data.get('owner_id')
    pet_name = data.get('pet_name')
    pet_type = data.get('pet_type')
    breed    = data.get('breed')
    pet_size = data.get('pet_size')
    gender   = data.get('gender')
    birthday = data.get('birthday')
    age      = data.get('age')
    weight   = data.get('weight_kg')
    pet_photo_url = data.get('pet_photo_url')
    is_vaccinated = data.get('is_vaccinated')
    vaccination_urls = data.get('vaccination_urls')

    if birthday and not age:
        try:
            birthday_date = datetime.strptime(str(birthday), '%Y-%m-%d').date()
            today = datetime.utcnow().date()
            derived_years = today.year - birthday_date.year - (
                (today.month, today.day) < (birthday_date.month, birthday_date.day)
            )
            age = str(max(derived_years, 0))
        except ValueError:
            age = None

    if not all([owner_id, pet_name, pet_type, breed, pet_size, gender]):
        missing = [k for k, v in {
            "owner_id": owner_id, "pet_name": pet_name, "pet_type": pet_type,
            "breed": breed, "pet_size": pet_size, "gender": gender
        }.items() if not v]
        return jsonify({"error": f"Missing required fields: {missing}"}), 400

    try:
        insert_payload = {
            "owner_id":    owner_id,
            "pet_name":    pet_name,
            "pet_species": pet_type,
            "pet_breed":   breed,
            "pet_size":    pet_size,
            "pet_gender":  gender,
            "birthday":    birthday,
            "age":         age,
            "weight_kg":   weight,
            "pet_photo_url": pet_photo_url,
            "is_vaccinated": is_vaccinated,
            "vaccination_urls": vaccination_urls,
        }

        try:
            response = supabase.table('pet_profile').insert(insert_payload).execute()
        except Exception as insert_error:
            if 'is_vaccinated' not in str(insert_error):
                raise

            insert_payload.pop('is_vaccinated', None)
            response = supabase.table('pet_profile').insert(insert_payload).execute()

        pet = response.data[0] if response.data else None
        return jsonify({"message": "Pet added successfully", "pet": pet}), 200

    except Exception as e:
        print("Add pet error:", e)
        return jsonify({"error": str(e)}), 400


@app.route('/upload-pet-photo', methods=['POST'])
def upload_pet_photo():
    import base64

    data = request.get_json() or {}
    file_b64 = data.get('file')
    file_name = data.get('file_name', f"pet_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}.jpg")
    mime_type = data.get('mime_type', 'image/jpeg')

    if not file_b64:
        return jsonify({"error": "No file provided"}), 400

    try:
        file_data = base64.b64decode(file_b64)
        original_name = os.path.basename(str(file_name or '').strip()) or f"pet_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}.jpg"
        safe_name = ''.join(ch if ch.isalnum() or ch in ('-', '_', '.') else '_' for ch in original_name)
        safe_name = safe_name or f"pet_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}.jpg"
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
        safe_name = safe_name or f"profile_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}.jpg"
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


@app.route('/pets/<int:pet_id>', methods=['PATCH'])
def update_pet(pet_id):
    data = request.get_json() or {}
    allowed = [
        'pet_name', 'pet_species', 'pet_breed', 'pet_gender',
        'pet_size', 'birthday', 'age', 'weight_kg',
        'pet_photo_url', 'is_vaccinated', 'vaccination_urls',
    ]
    update_data = {k: v for k, v in data.items() if k in allowed}

    birthday = update_data.get('birthday')
    if birthday and not update_data.get('age'):
        try:
            birthday_date = datetime.strptime(str(birthday), '%Y-%m-%d').date()
            today = datetime.utcnow().date()
            derived_years = today.year - birthday_date.year - (
                (today.month, today.day) < (birthday_date.month, birthday_date.day)
            )
            update_data['age'] = str(max(derived_years, 0))
        except ValueError:
            pass

    if not update_data:
        return jsonify({"error": "No valid fields to update"}), 400

    try:
        try:
            response = supabase_admin.table('pet_profile') \
                .update(update_data) \
                .eq('pet_id', pet_id) \
                .execute()
        except Exception as update_error:
            if 'is_vaccinated' not in str(update_error):
                raise

            retry_payload = dict(update_data)
            retry_payload.pop('is_vaccinated', None)
            response = supabase_admin.table('pet_profile') \
                .update(retry_payload) \
                .eq('pet_id', pet_id) \
                .execute()

        pet = response.data[0] if response.data else None
        return jsonify({"message": "Pet updated successfully", "pet": pet}), 200

    except Exception as e:
        print("Update pet error:", str(e))
        return jsonify({"error": str(e)}), 400


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


# -----------------------------------------------
# GET ALL PETS FOR A USER
# -----------------------------------------------
@app.route('/pets/user/<user_id>', methods=['GET'])
def get_user_pets(user_id):
    try:
        response = supabase.table('pet_profile') \
            .select('*') \
            .eq('owner_id', user_id) \
            .execute()

        return jsonify({"pets": response.data}), 200

    except Exception as e:
        print("Fetch pets error:", e)
        return jsonify({"error": str(e)}), 400



# -----------------------------------------------
# GET USER PROFILE (by ID)
# -----------------------------------------------
@app.route('/profile/<user_id>', methods=['GET'])
def get_user_profile(user_id):
    try:
        # First try patient_account
        response = supabase.table('patient_account').select('*').eq('id', user_id).execute()
        if response.data:
            normalized = normalize_public_profile(response.data[0])
            return jsonify({
                **normalized,
                "user": normalized
            }), 200

        # If not found, try employee_accounts
        response = supabase.table('employee_accounts').select('*').eq('id', user_id).execute()
        if response.data:
            normalized = normalize_public_profile(response.data[0])
            return jsonify({
                **normalized,
                "user": normalized
            }), 200

        return jsonify({"error": "Profile not found"}), 404

    except Exception as e:
        print("Profile fetch error:", e)
        return jsonify({"error": str(e)}), 500


@app.route('/profile/<user_id>', methods=['PATCH'])
def update_user_profile(user_id):
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
        first_name = (data.get('firstName') or data.get('first_name') or '').strip()
        last_name = (data.get('lastName') or data.get('last_name') or '').strip()
        full_name = (
            (data.get('fullName') or data.get('fullname') or data.get('full_name') or '').strip()
            or f"{first_name} {last_name}".strip()
            or profile.get('full_name')
            or profile.get('fullname')
            or get_profile_display_name(profile)
        )
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

        split_first_name, split_last_name = split_full_name(full_name)
        name_variants = [{}]
        if has_name_update:
            if table_name == 'patient_account':
                name_variants = [
                    {"firstName": split_first_name, "lastName": split_last_name},
                    {"first_name": split_first_name, "last_name": split_last_name},
                    {"full_name": full_name, "firstName": split_first_name, "lastName": split_last_name},
                    {"fullname": full_name, "firstName": split_first_name, "lastName": split_last_name},
                    {"full_name": full_name, "first_name": split_first_name, "last_name": split_last_name},
                    {"fullname": full_name, "first_name": split_first_name, "last_name": split_last_name},
                    {"full_name": full_name},
                    {"fullname": full_name},
                ]
            else:
                name_variants = [
                    {"full_name": full_name, "first_name": split_first_name, "last_name": split_last_name},
                    {"full_name": full_name},
                    {"fullname": full_name, "first_name": split_first_name, "last_name": split_last_name},
                    {"fullname": full_name, "firstName": split_first_name, "lastName": split_last_name},
                    {"first_name": split_first_name, "last_name": split_last_name},
                    {"firstName": split_first_name, "lastName": split_last_name},
                    {"full_name": full_name, "firstName": split_first_name, "lastName": split_last_name},
                    {"fullname": full_name},
                ]

        image_variants = [{}]
        if has_image_update:
            image_variants = [
                {"userImage": user_image},
                {"userimage": user_image},
                {"user_image": user_image},
                {},
            ]

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

        return jsonify({
            "message": "Profile updated successfully",
            **normalized,
            "user": normalized
        }), 200

    except Exception as e:
        print("Profile update error:", e)
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
        profile = get_single_row('patient_account', 'id', user_id)

        if not profile:
            profile = get_single_row('employee_accounts', 'id', user_id)

        if not profile:
            return jsonify({"error": "Profile not found"}), 404

        email = normalize_email_address(profile.get('email'))
        if not email:
            return jsonify({"error": "This account does not have a valid email address"}), 400

        try:
            auth_client = create_client(SUPABASE_URL, SUPABASE_KEY)
            auth_response = auth_client.auth.sign_in_with_password({
                "email": email,
                "password": current_password
            })
            auth_user = getattr(auth_response, 'user', None)
            if not auth_user:
                return jsonify({"error": "Current password is incorrect"}), 401
        except Exception as auth_error:
            print("Current password verification error:", auth_error)
            return jsonify({"error": "Current password is incorrect"}), 401

        auth_user_id = str(getattr(auth_user, 'id', '') or '')
        if auth_user_id and auth_user_id != str(user_id):
            return jsonify({"error": "Authenticated user mismatch"}), 403

        supabase_admin.auth.admin.update_user_by_id(str(user_id), {
            "password": new_password
        })

        return jsonify({"message": "Password changed successfully"}), 200

    except Exception as e:
        print("Authenticated password change error:", e)
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# GET BRANCHES (Clinic locations)
# -----------------------------------------------
@app.route('/branches', methods=['GET'])
def get_branches():
    try:
        response = supabase_admin.table('branches').select('*').execute()
        branch_rows = response.data or []

        normalized_branches = [
            {
                "branch_id": int(branch.get("branch_id") or branch.get("id")),
                "branch_name": branch.get("branch_name") or branch.get("name"),
                "address": branch.get("address") or "",
                "contact_number": branch.get("contact_number") or "",
            }
            for branch in branch_rows
            if (branch.get("branch_id") or branch.get("id")) and (branch.get("branch_name") or branch.get("name"))
        ]

        if normalized_branches:
            return jsonify({"branches": normalized_branches}), 200

        sample_branches = [
            {"branch_id": 1, "branch_name": "Main Clinic", "address": "123 Pet Street", "contact_number": "123-4567"},
            {"branch_id": 2, "branch_name": "East Branch", "address": "456 Animal Ave", "contact_number": "987-6543"}
        ]
        return jsonify({"branches": sample_branches}), 200
    except Exception as e:
        print("Branches fetch error:", e)
        sample_branches = [
            {"branch_id": 1, "branch_name": "Main Clinic", "address": "123 Pet Street", "contact_number": "123-4567"},
            {"branch_id": 2, "branch_name": "East Branch", "address": "456 Animal Ave", "contact_number": "987-6543"}
        ]
        return jsonify({"branches": sample_branches}), 200


# -----------------------------------------------
# PATIENT ADMIN ROUTES
# -----------------------------------------------
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

        full_name = data.get('fullName') if 'fullName' in data else data.get('fullname')
        contact_number = data.get('contactNumber') if 'contactNumber' in data else data.get('contactnumber')
        user_image = data.get('userImage') if 'userImage' in data else data.get('userimage')

        base_update = {}
        optional_update = {}

        if 'username' in data:
            base_update['username'] = (data.get('username') or '').strip()
        if full_name is not None:
            first_name, last_name = split_full_name(full_name)
            base_update['fullname'] = (full_name or '').strip()
            optional_update['firstName'] = first_name
            optional_update['lastName'] = last_name
        if 'contactNumber' in data or 'contactnumber' in data:
            base_update['contact_number'] = (contact_number or '').strip()
        if 'email' in data:
            base_update['email'] = (data.get('email') or '').strip().lower()
        if 'status' in data:
            raw_status = (data.get('status') or '').strip().lower()
            base_update['status'] = 'disabled' if raw_status in ('disabled', 'inactive') else 'active'
        if 'userImage' in data or 'userimage' in data:
            optional_update['userImage'] = user_image

        if not base_update and not optional_update:
            return jsonify({"error": "No valid fields to update"}), 400

        try:
            update_payload = {**base_update, **optional_update}
            response = supabase_admin.table('patient_account').update(update_payload).eq('id', account_id).execute()
        except Exception as optional_error:
            print("Patient optional-field update fallback:", str(optional_error))
            response = supabase_admin.table('patient_account').update(base_update).eq('id', account_id).execute()

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
        username_seed = (data.get('username') or email.split('@')[0] or 'patient').strip() or 'patient'
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

        base_insert = {
            "id": user.id,
            "email": email,
            "username": username,
            "fullname": full_name,
            "contact_number": contact_number,
            "role": "patient",
            "status": 'disabled' if status_value in ('disabled', 'inactive') else 'active',
        }
        optional_insert = {
            "firstName": first_name,
            "lastName": last_name,
            "userImage": user_image,
        }

        try:
            insert_response = supabase_admin.table('patient_account').insert({
                **base_insert,
                **optional_insert
            }).execute()
        except Exception as optional_error:
            print("Patient optional-field insert fallback:", str(optional_error))
            insert_response = supabase_admin.table('patient_account').insert(base_insert).execute()

        created = insert_response.data[0] if insert_response.data else get_single_row('patient_account', 'id', user.id)
        return jsonify({
            "message": "Patient account created successfully",
            "account": normalize_patient_admin_account(created or {
                **base_insert,
                **optional_insert,
            })
        }), 200
    except Exception as e:
        print("Patient register error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/appointments', methods=['POST'])
@app.route('/api/appointments', methods=['POST'])
def create_appointment():
    try:
        data = request.json
        owner_id = data.get('owner_id')
        pet_id = data.get('pet_id')
        is_walk_in = data.get('is_walk_in', False)  # ← ADD THIS FLAG
        branch_id = data.get('branch_id') or data.get('branchId')

        try:
            branch_id = int(branch_id) if branch_id not in (None, '', 'null') else None
        except (TypeError, ValueError):
            branch_id = None

        # ==========================================
        # THE WALK-IN MAGIC (Restored from your working version)
        # ==========================================
        if (owner_id == 'WALK_IN' or pet_id == 'WALK_IN') and is_walk_in:
            try:
                walk_in_email = data.get('walk_in_email') or ''
                walk_in_phone = data.get('walk_in_phone') or ''
                
                res = supabase_admin.table('walkin_appointments').insert({
                    "first_name": data.get('walk_in_first_name', 'Walk-In').strip(),
                    "last_name": data.get('walk_in_last_name', 'Guest').strip(),
                    "email": walk_in_email,
                    "contact_number": walk_in_phone,
                    "pet_name": data.get('walk_in_pet_name', 'Unknown Pet'),
                    "pet_species": data.get('walk_in_pet_type', 'Other'),
                    "pet_breed": data.get('walk_in_breed', 'Unknown'),
                    "pet_gender": data.get('walk_in_gender', 'Unknown'),
                    "pet_dob": data.get('walk_in_dob') or None,
                    "appointment_type": data.get('appointment_type') or data.get('service'),
                    "appointment_date": data.get('appointment_date') or data.get('date'),
                    "appointment_time": data.get('appointment_time') or data.get('time'),
                    "patient_reason": data.get('patient_reason') or data.get('reason') or '',
                    "branch_id": branch_id,
                    "status": "pending"
                }).execute()

                created_row = (res.data or [{}])[0]
                created_id = created_row.get('walkin_id') or created_row.get('id')
                email_sent = False

                try:
                    email_context = get_reschedule_email_context('walkin_appointments', 'walkin_id', created_id)
                    existing_record = email_context.get("record") or created_row
                    email_sent = send_booking_confirmation_email(
                        email_context.get("email"),
                        email_context.get("patient_name"),
                        email_context.get("pet_name"),
                        email_context.get("service_name"),
                        existing_record.get("appointment_date"),
                        format_display_time(existing_record.get("appointment_time")),
                        existing_record.get("status") or "pending"
                    )
                except Exception as email_error:
                    print(f"Booking confirmation preparation error (walk-in): {email_error}")

                return jsonify({
                    "message": "Walk-in appointment created!",
                    "data": res.data,
                    "appointment_id": None,
                    "walkin_id": created_id,
                    "target_id": created_id,
                    "recordType": "walkin",
                    "emailSent": email_sent,
                }), 200

            except Exception as walk_in_error:
                return jsonify({"error": f"Failed to create walk-in appointment: {str(walk_in_error)}"}), 400

# If NOT walk-in, continue with normal appointment insert below

        # ==========================================
        # SAVE THE ACTUAL APPOINTMENT
        # ==========================================
        appt_data = {
            "owner_id": owner_id,
            "pet_id": pet_id,
            "appointment_type": data.get('appointment_type') or data.get('service'),
            "appointment_date": data.get('appointment_date') or data.get('date'),
            "appointment_time": data.get('appointment_time') or data.get('time'),
            "patient_reason": data.get('patient_reason') or data.get('reason') or '',
            "branch_id": branch_id,
            "status": "pending"
        }
        
        res = supabase_admin.table('appointments').insert(appt_data).execute()
        created_row = (res.data or [{}])[0]
        created_id = created_row.get('appointment_id') or created_row.get('id')
        email_sent = False

        try:
            email_context = get_reschedule_email_context('appointments', 'appointment_id', created_id)
            existing_record = email_context.get("record") or created_row
            email_sent = send_booking_confirmation_email(
                email_context.get("email"),
                email_context.get("patient_name"),
                email_context.get("pet_name"),
                email_context.get("service_name"),
                existing_record.get("appointment_date"),
                format_display_time(existing_record.get("appointment_time")),
                existing_record.get("status") or "pending"
            )
        except Exception as email_error:
            print(f"Booking confirmation preparation error: {email_error}")

        return jsonify({
            "message": "Appointment created!",
            "data": res.data,
            "appointment_id": created_id,
            "walkin_id": None,
            "target_id": created_id,
            "recordType": "appointment",
            "emailSent": email_sent,
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/medical-information', methods=['GET', 'POST'])
@app.route('/api/medical-information', methods=['GET', 'POST'])
def handle_medical_information():
    if request.method == 'GET':
        try:
            requested_ids_raw = request.args.get('appointmentIds') or request.args.get('appointment_ids') or ''
            requested_ids = {value.strip() for value in requested_ids_raw.split(',') if value.strip()}

            response = supabase_admin.table('medical_information').select('*').execute()
            rows = response.data or []

            if requested_ids:
                rows = [
                    row for row in rows
                    if str(row.get('appointment_id')) in requested_ids or str(row.get('walkin_id')) in requested_ids
                ]

            return jsonify({
                "medicalInformation": [
                    normalize_medical_information_record(row) for row in rows
                ]
            }), 200
        except Exception as e:
            print("Medical information list error:", e)
            return jsonify({"error": str(e)}), 400

    data = request.get_json() or {}
    record_type = (data.get('record_type') or data.get('recordType') or 'appointment').strip().lower()
    appointment_id = data.get('appointment_id')
    walkin_id = data.get('walkin_id')
    target_field = 'walkin_id' if record_type == 'walkin' else 'appointment_id'
    target_id = walkin_id if record_type == 'walkin' else appointment_id

    if target_id in (None, ''):
        return jsonify({"error": f"{target_field} is required"}), 400

    payload = {
        "record_type": record_type,
        "appointment_id": appointment_id if record_type != 'walkin' else None,
        "walkin_id": walkin_id if record_type == 'walkin' else None,
        "on_medication": bool(data.get('on_medication', False)),
        "medication_details": data.get('medication_details') or '',
        "flea_tick_prevention": bool(data.get('flea_tick_prevention', False)),
        "is_vaccinated": bool(data.get('is_vaccinated', False)),
        "is_pregnant": bool(data.get('is_pregnant', False)),
        "additional_notes": data.get('additional_notes') or '',
        "has_allergies": bool(data.get('has_allergies', False)),
        "allergy_details": data.get('allergy_details') or '',
        "has_skin_condition": bool(data.get('has_skin_condition', False)),
        "skin_condition_details": data.get('skin_condition_details') or '',
        "been_groomed_before": bool(data.get('been_groomed_before', False)),
    }

    try:
        existing = (
            supabase_admin.table('medical_information')
            .select('*')
            .eq('record_type', record_type)
            .eq(target_field, target_id)
            .execute()
        )
        existing_rows = existing.data or []

        if existing_rows:
            response = (
                supabase_admin.table('medical_information')
                .update(payload)
                .eq('record_type', record_type)
                .eq(target_field, target_id)
                .execute()
            )
            saved_row = (response.data or existing_rows)[0]
        else:
            response = supabase_admin.table('medical_information').insert(payload).execute()
            saved_row = (response.data or [{}])[0]

        return jsonify({
            "message": "Medical information saved successfully",
            "medicalInformation": normalize_medical_information_record(saved_row)
        }), 200
    except Exception as e:
        print("Medical information save error:", e)
        return jsonify({"error": str(e)}), 400


@app.route('/medical-information/<appointment_id>', methods=['GET'])
@app.route('/api/medical-information/<appointment_id>', methods=['GET'])
def get_medical_information(appointment_id):
    try:
        record_type = (request.args.get('recordType') or request.args.get('record_type') or 'appointment').strip().lower()
        target_field = 'walkin_id' if record_type == 'walkin' else 'appointment_id'
        response = (
            supabase_admin.table('medical_information')
            .select('*')
            .eq('record_type', record_type)
            .eq(target_field, appointment_id)
            .execute()
        )
        record = (response.data or [None])[0]
        return jsonify({
            "medicalInformation": normalize_medical_information_record(record)
        }), 200
    except Exception as e:
        print("Medical information fetch error:", e)
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# GET ALL APPOINTMENTS FOR A USER
# -----------------------------------------------
@app.route('/appointments/user/<user_id>', methods=['GET'])
def get_user_appointments(user_id):
    try:
        appointments = supabase_admin.table('appointments') \
            .select('*') \
            .eq('owner_id', user_id) \
            .order('created_at', desc=True) \
            .execute().data or []

        appointment_ids = [app.get('appointment_id') for app in appointments if app.get('appointment_id') is not None]
        pet_ids = [app.get('pet_id') for app in appointments if app.get('pet_id') is not None]
        doctor_ids = [app.get('doctor_id') or app.get('assigned_doctor_id') for app in appointments if app.get('doctor_id') or app.get('assigned_doctor_id')]
        branch_ids = [app.get('branch_id') for app in appointments if app.get('branch_id') is not None]
        pets = []
        medical_rows = []
        doctors = []
        branches = []
        reschedule_requests = []
        if pet_ids:
            pets = supabase_admin.table('pet_profile') \
                .select('*') \
                .in_('pet_id', pet_ids) \
                .execute().data or []
        if appointment_ids:
            medical_rows = supabase_admin.table('medical_information') \
                .select('*') \
                .in_('appointment_id', appointment_ids) \
                .execute().data or []
        if doctor_ids:
            doctors = supabase_admin.table('employee_accounts') \
                .select('*') \
                .in_('id', doctor_ids) \
                .execute().data or []
        if branch_ids:
            branches = supabase_admin.table('branches') \
                .select('*') \
                .in_('branch_id', branch_ids) \
                .execute().data or []
        if appointment_ids:
            reschedule_requests = supabase_admin.table('reschedule_requests') \
                .select('*') \
                .eq('target_type', 'appointment') \
                .in_('target_id', appointment_ids) \
                .order('created_at', desc=True) \
                .execute().data or []

        pets_by_id = {str(pet.get('pet_id')): pet for pet in pets}
        doctors_by_id = {str(doctor.get('id')): doctor for doctor in doctors}
        branches_by_id = {str(branch.get('branch_id')): branch for branch in branches}
        latest_request_by_target = {}
        for request_item in reschedule_requests:
            target_key = str(request_item.get('target_id'))
            if target_key not in latest_request_by_target:
                latest_request_by_target[target_key] = request_item
        medical_by_appointment_id = {}
        for medical_row in medical_rows:
            normalized_medical = normalize_medical_information_record(medical_row)
            if normalized_medical and normalized_medical.get('appointment_id') not in (None, ''):
                medical_by_appointment_id[str(normalized_medical.get('appointment_id'))] = normalized_medical
        enriched_appointments = []

        for appointment in appointments:
            pet = pets_by_id.get(str(appointment.get('pet_id'))) or {}
            medical_information = medical_by_appointment_id.get(str(appointment.get('appointment_id')))
            doctor = doctors_by_id.get(str(appointment.get('doctor_id') or appointment.get('assigned_doctor_id'))) or {}
            branch = branches_by_id.get(str(appointment.get('branch_id'))) or {}
            pet_name = pet.get('pet_name') or appointment.get('pet_name') or 'Unknown Pet'
            pet_breed = pet.get('pet_breed') or appointment.get('pet_breed') or 'Breed not available'
            pet_photo_url = pet.get('pet_photo_url') or appointment.get('pet_photo_url')
            doctor_name = get_profile_display_name(doctor) or 'Not yet assigned'
            branch_name = branch.get('branch_name') or branch.get('name') or 'Not specified'
            latest_reschedule_request = latest_request_by_target.get(str(appointment.get('appointment_id')))
            normalized_status = appointment.get('status') or 'pending'

            if latest_reschedule_request and latest_reschedule_request.get('status') in ('pending', 'needs_new_schedule') and normalized_status not in ('completed', 'cancelled'):
                normalized_status = 'pending'

            enriched_appointments.append({
                **appointment,
                'status': normalized_status,
                'pet_name': pet_name,
                'petName': pet_name,
                'pet_breed': pet_breed,
                'petBreed': pet_breed,
                'pet_photo_url': pet_photo_url,
                'doctor': doctor_name,
                'assignedDoctor': appointment.get('doctor_id') or appointment.get('assigned_doctor_id'),
                'branch_name': branch_name,
                'branchName': branch_name,
                'medicalInformation': medical_information,
                'medical_information': medical_information,
                'latestRescheduleRequest': latest_reschedule_request,
                'pet_profile': {
                    'pet_id': pet.get('pet_id') or appointment.get('pet_id'),
                    'pet_name': pet_name,
                    'pet_breed': pet_breed,
                    'pet_photo_url': pet_photo_url,
                } if pet or appointment.get('pet_id') else None,
            })

        return jsonify({"appointments": enriched_appointments}), 200

    except Exception as e:
        print("Fetch appointments error:", e)
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

        send_otp_email(email, otp)  # ← clean call, no extra syntax

        return jsonify({
            "message": "OTP sent successfully!",
            "otpSent": True
        }), 200

    except Exception as e:
        print("Forgot password error:", e)
        return jsonify({"error": str(e)}), 400


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

        otp = ''.join(random.choices(string.digits, k=6))
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
# VERIFY OTP
# -----------------------------------------------
@app.route('/verify-otp', methods=['POST'])
def verify_otp():
    data  = request.get_json() or {}
    email = normalize_email_address(data.get('email'))
    otp   = data.get('otp')

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

    otp_store[email]['verified'] = True

    return jsonify({"message": "OTP verified successfully!"}), 200


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


# -----------------------------------------------
# COMPLETE EMPLOYEE FIRST-TIME SETUP
# -----------------------------------------------
@app.route('/employee-complete-setup', methods=['POST'])
def employee_complete_setup():
    data = request.get_json() or {}
    user_id = (data.get('user_id') or '').strip()
    username = (data.get('username') or '').strip()
    new_password = data.get('new_password') or ''

    if not user_id or not username or not new_password:
        return jsonify({"error": "User ID, username, and password are required"}), 400

    if len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters"}), 400

    if len(new_password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    normalized_username = username.lower()

    try:
        employee = get_single_row('employee_accounts', 'id', user_id)
        if not employee:
            return jsonify({"error": "Employee account not found"}), 404

        existing_employee = get_single_row('employee_accounts', 'username', normalized_username)
        if existing_employee and str(existing_employee.get('id')) != user_id:
            return jsonify({"error": "This username is already used by another employee account"}), 409

        existing_patient = get_single_row('patient_account', 'username', normalized_username)
        if existing_patient:
            return jsonify({"error": "This username is already used by a patient account"}), 409

        supabase_admin.auth.admin.update_user_by_id(user_id, {
            "password": new_password
        })

        supabase_admin.table('employee_accounts').update({
            "username": normalized_username,
            "is_initial_login": False
        }).eq('id', user_id).execute()

        return jsonify({"message": "Account setup completed successfully"}), 200
    except Exception as e:
        print("Employee setup error:", e)
        return jsonify({"error": str(e)}), 400
    
    
# -----------------------------------------------
# DAY AVAILABILITY 
# -----------------------------------------------
@app.route('/api/day-availability', methods=['GET', 'POST'])
def get_day_availability():
    if request.method == 'GET':
        try:
            res = supabase_admin.table('working_days').select('*').execute()
            formatted_data = [{"day_of_week": row['day_of_week'], "is_available": row['is_active']} for row in res.data]
            return jsonify(formatted_data), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 400
            
    if request.method == 'POST':
        data = request.get_json()
        day = data.get('day_of_week') 
        is_available = data.get('is_available')
        try:
            supabase_admin.table('working_days').upsert({
                "day_of_week": day,
                "is_active": is_available
            }).execute()
            return jsonify({"message": f"{day} saved successfully"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 400

@app.route('/api/day-availability/<day>', methods=['PUT'])
def update_day_availability(day):
    data = request.get_json()
    is_available = data.get('is_available')
    try:
        supabase_admin.table('working_days').upsert({
            "day_of_week": day,
            "is_active": is_available
        }).execute()
        return jsonify({"message": f"{day} updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# -----------------------------------------------
# 🟢 FIXED TIME SLOTS (Safely parses to avoid KeyErrors!)
# -----------------------------------------------
@app.route('/api/time-slots/<param>', methods=['GET', 'POST', 'DELETE'])
def handle_time_slots_api(param):
    if request.method == 'GET':
        day = param
        try:
            res = supabase_admin.table('time_slots').select('*').eq('day_of_week', day).execute()
            return jsonify({"timeSlots": res.data}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    if request.method == 'POST':
        day = param
        data = request.get_json()
        slots = data.get('slots', [])
        try:
            supabase_admin.table('time_slots').delete().eq('day_of_week', day).execute()
            
            for slot in slots:
                # 🟢 Using .get() means it will NEVER throw a KeyError, even if the frontend switches format!
                s_time = slot.get('startTime') or slot.get('start_time') or ''
                e_time = slot.get('endTime') or slot.get('end_time') or ''
                
                raw_start = datetime.strptime(s_time, '%I:%M %p').strftime('%H:%M:%S') if 'M' in s_time.upper() else s_time
                raw_end = datetime.strptime(e_time, '%I:%M %p').strftime('%H:%M:%S') if 'M' in e_time.upper() else e_time
                
                supabase_admin.table('time_slots').insert({
                    "day_of_week": day,
                    "start_time": raw_start,
                    "end_time": raw_end,
                    "is_active": True
                }).execute()
            
            res = supabase_admin.table('time_slots').select('*').eq('day_of_week', day).execute()
            return jsonify({"timeSlots": res.data}), 200
        except Exception as e:
            print("Time slot save error:", e)
            return jsonify({"error": str(e)}), 400

    if request.method == 'DELETE':
        slot_id = param
        try:
            if str(slot_id).startswith('temp-'):
                return jsonify({"message": "Temp slot removed"}), 200
                
            supabase_admin.table('time_slots').delete().eq('id', slot_id).execute()
            return jsonify({"message": "Slot deleted successfully"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 400

# -----------------------------------------------
# CALENDAR BOOKED DATES
# -----------------------------------------------
@app.route('/api/booked-dates', methods=['GET'])
def get_booked_dates():
    try:
        res = supabase_admin.table('appointments').select('appointment_date').execute()
        formatted = [{"date_time": row['appointment_date']} for row in res.data]
        return jsonify(formatted), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# -----------------------------------------------
# SPECIAL DATES
# -----------------------------------------------
@app.route('/api/special-dates', methods=['GET', 'POST'])
def handle_special_dates():
    if request.method == 'GET':
        try:
            res = supabase_admin.table('special_dates').select('*').order('event_date').execute()
            return jsonify({"specialDates": res.data}), 200
        except Exception as e:
            print("Special dates fetch error:", e)
            return jsonify({"specialDates": []}), 200

    if request.method == 'POST':
        data = request.get_json()
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
    
    
# -----------------------------------------------
# GET ALL EMPLOYEE ACCOUNTS (For Doctors List)
# -----------------------------------------------
@app.route('/accounts', methods=['GET'])
@app.route('/api/doctors', methods=['GET'])
def get_all_accounts():
    try:
        res = supabase_admin.table('employee_accounts').select('*').execute()
        return jsonify(res.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# ADMIN ACTIONS & TABLES (Aggressive Data Mapping)
# -----------------------------------------------
@app.route('/api/appointments/table', methods=['GET'])
def get_appointments_table():
    try:
        appts = supabase_admin.table("appointments").select("*").order('appointment_date', desc=False).execute().data or []
        patients = supabase_admin.table("patient_account").select("*").execute().data or []
        pets = supabase_admin.table("pet_profile").select("*").execute().data or []
        doctors = supabase_admin.table("employee_accounts").select("*").execute().data or []
        branches = supabase_admin.table("branches").select("*").execute().data or []
        branches_by_id = {str(branch.get('branch_id') or branch.get('id')): branch for branch in branches}

        formatted = []
        for app in appts:
            owner = next((p for p in patients if str(p.get('id')) == str(app.get('owner_id'))), {})
            pet = next((p for p in pets if str(p.get('pet_id')) == str(app.get('pet_id'))), {})
            doc_id = app.get("assigned_doctor_id") or app.get("doctor_id")
            doc = next((d for d in doctors if str(d.get('id')) == str(doc_id)), {})
            branch = branches_by_id.get(str(app.get('branch_id')), {})
            
            doc_name = get_profile_display_name(doc) or "Not Assigned"
            branch_name = branch.get('branch_name') or branch.get('name') or 'Not specified'
            
            owner_name = f"{owner.get('firstName', '')} {owner.get('lastName', '')}".strip() or owner.get('username')
            if not owner_name and app.get('walk_in_first_name'):
                owner_name = f"{app.get('walk_in_first_name', '')} {app.get('walk_in_last_name', '')}".strip()
            owner_name = owner_name or "Unknown Owner"

            pet_name = pet.get('pet_name') or app.get('walk_in_pet_name') or "Unknown Pet"

            time_str = app.get('appointment_time', '')
            if time_str:
                h, m = time_str.split(':')[:2]
                start_h = int(h)
                am_pm = 'PM' if start_h >= 12 else 'AM'
                display_h = start_h % 12 or 12
                start_fmt = f"{display_h}:{m} {am_pm}"
                
                end_h = (start_h + 1) % 24
                end_am_pm = 'PM' if 12 <= end_h < 24 else 'AM'
                display_end_h = end_h % 12 or 12
                end_fmt = f"{display_end_h}:{m} {end_am_pm}"
                time_str = f"{start_fmt} - {end_fmt}"

            reason = app.get('patient_reason') or app.get('reason_for_visit') or app.get('reason') or 'Not provided'
            email = owner.get('email') or app.get('walk_in_email') or 'Not provided'
            phone = owner.get('contact_number') or app.get('walk_in_phone') or 'Not provided'
            pet_type = pet.get('pet_species') or app.get('walk_in_pet_type') or 'Unknown'
            pet_breed = pet.get('pet_breed') or app.get('walk_in_breed') or 'Unknown'
            pet_gender = pet.get('pet_gender') or app.get('walk_in_gender') or 'Unknown'

            formatted.append({
                **app, **owner, **pet,
                "id": app.get("appointment_id") or app.get("id"),
                "ownerName": owner_name,
                "petName": pet_name,
                "name": owner_name,
                "service": app.get("appointment_type") or "General",
                "date_time": f"{app.get('appointment_date')} {time_str}",
                "date_display": app.get("appointment_date"),
                "time_display": time_str,
                "date_only": app.get("appointment_date"),
                "status": (app.get("status") or "pending").lower(),
                "doctor": doc_name,
                "assignedDoctor": doc_id,
                "branch": branch_name,
                "branchName": branch_name,
                "branch_id": app.get("branch_id"),
                "email": email, "patientEmail": email, "patient_email": email,
                "phone": phone, "patientPhone": phone, "contact_number": phone, "contactNumber": phone,
                "reasonForVisit": reason, "patient_reason": reason, "reason": reason, "reason_for_visit": reason,
                "rescheduleReason": app.get("reschedule_reason"),
                "reschedule_reason": app.get("reschedule_reason"),
                "type": pet_type.title() if pet_type else "Unknown", 
                "petType": pet_type.title() if pet_type else "Unknown", 
                "pet_species": pet_type.title() if pet_type else "Unknown",
                "breed": pet_breed.title() if pet_breed else "Unknown", 
                "petBreed": pet_breed.title() if pet_breed else "Unknown",
                "gender": pet_gender.title() if pet_gender else "Unknown", 
                "petGender": pet_gender.title() if pet_gender else "Unknown"
            })
        return jsonify({"appointments": formatted}), 200
    except Exception as e:
        print("Table error:", str(e))
        return jsonify({"error": str(e)}), 400

@app.route('/api/appointments/history', methods=['GET'])
def get_appointments_history():
    try:
        appointments = supabase_admin.table("appointments").select("*").execute().data or []
        walkins = supabase_admin.table("walkin_appointments").select("*").execute().data or []
        patients = supabase_admin.table("patient_account").select("*").execute().data or []
        pets = supabase_admin.table("pet_profile").select("*").execute().data or []
        doctors = supabase_admin.table("employee_accounts").select("*").execute().data or []
        branches = supabase_admin.table("branches").select("*").execute().data or []
        reschedule_requests = supabase_admin.table("reschedule_requests").select("*").order("created_at", desc=True).execute().data or []
        medical_information_rows = supabase_admin.table("medical_information").select("*").execute().data or []

        history_statuses = {"completed", "cancelled"}
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

        formatted = []

        for app in appointments:
            status = (app.get("status") or "").lower()
            if status not in history_statuses:
                continue

            owner = patients_by_id.get(str(app.get("owner_id")), {})
            pet = pets_by_id.get(str(app.get("pet_id")), {})
            doctor_id = app.get("doctor_id") or app.get("assigned_doctor_id")
            doctor = doctors_by_id.get(str(doctor_id), {}) if doctor_id else {}
            branch = branches_by_id.get(str(app.get("branch_id")), {}) if app.get("branch_id") is not None else {}
            latest_reschedule_request = latest_request_by_target.get(f"appointment-{app.get('appointment_id')}")
            medical_information = medical_information_by_target.get(f"appointment-{app.get('appointment_id')}")

            owner_name = get_profile_display_name(owner) or "Unknown Owner"
            pet_name = pet.get("pet_name") or "Unknown Pet"
            time_range = format_display_time_range(app.get("appointment_time"))
            date_display = str(app.get("appointment_date") or "")
            pet_type = (pet.get("pet_species") or "Unknown").title()
            pet_breed = (pet.get("pet_breed") or "Unknown").title()
            pet_gender = (pet.get("pet_gender") or "Unknown").title()
            branch_name = branch.get("branch_name") or branch.get("name") or "Not specified"

            formatted.append({
                "id": f"appointment-{app.get('appointment_id')}",
                "dbId": app.get("appointment_id"),
                "recordType": "appointment",
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
                "service": app.get("appointment_type") or "General",
                "date_time": f"{date_display} {time_range}".strip(),
                "date_display": date_display,
                "time_display": time_range,
                "doctor": get_profile_display_name(doctor) or "Not Assigned",
                "assignedDoctor": doctor_id,
                "branch": branch_name,
                "branchName": branch_name,
                "branch_id": app.get("branch_id"),
                "status": status,
                "medicalInformation": medical_information,
                "medical_information": medical_information,
                "latestRescheduleRequest": latest_reschedule_request,
                "is_walk_in": False,
                "sort_date": date_display,
                "sort_time": str(app.get("appointment_time") or ""),
            })

        for walkin in walkins:
            status = (walkin.get("status") or "").lower()
            if status not in history_statuses:
                continue

            doctor_id = walkin.get("doctor_id") or walkin.get("assigned_doctor_id")
            doctor = doctors_by_id.get(str(doctor_id), {}) if doctor_id else {}
            branch = branches_by_id.get(str(walkin.get("branch_id")), {}) if walkin.get("branch_id") is not None else {}
            latest_reschedule_request = latest_request_by_target.get(f"walkin-{walkin.get('walkin_id')}")
            medical_information = medical_information_by_target.get(f"walkin-{walkin.get('walkin_id')}")
            patient_name = f"{walkin.get('first_name', '')} {walkin.get('last_name', '')}".strip() or "Walk-In Patient"
            pet_name = walkin.get("pet_name") or "Unknown Pet"
            time_range = format_display_time_range(walkin.get("appointment_time"))
            date_display = str(walkin.get("appointment_date") or "")
            pet_type = (walkin.get("pet_species") or "Unknown").title()
            pet_breed = (walkin.get("pet_breed") or "Unknown").title()
            pet_gender = (walkin.get("pet_gender") or "Unknown").title()
            branch_name = branch.get("branch_name") or branch.get("name") or "Not specified"

            formatted.append({
                "id": f"walkin-{walkin.get('walkin_id')}",
                "dbId": walkin.get("walkin_id"),
                "recordType": "walkin",
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
                "doctor": get_profile_display_name(doctor) or "Not Assigned",
                "assignedDoctor": doctor_id,
                "branch": branch_name,
                "branchName": branch_name,
                "branch_id": walkin.get("branch_id"),
                "status": status,
                "medicalInformation": medical_information,
                "medical_information": medical_information,
                "latestRescheduleRequest": latest_reschedule_request,
                "is_walk_in": True,
                "sort_date": date_display,
                "sort_time": str(walkin.get("appointment_time") or ""),
            })

        formatted.sort(
            key=lambda item: (item.get("sort_date") or "", item.get("sort_time") or "", item.get("id") or ""),
            reverse=True
        )

        for item in formatted:
            item.pop("sort_date", None)
            item.pop("sort_time", None)

        return jsonify({"appointments": formatted}), 200
    except Exception as e:
        print("History error:", str(e))
        return jsonify({"error": str(e)}), 400

@app.route('/api/appointments/booked-slots/<time_slot_id>', methods=['GET'])
def get_booked_slots(time_slot_id):
    date = request.args.get('date')
    try:
        slot_res = supabase_admin.table('time_slots').select('*').eq('id', time_slot_id).single().execute()
        if not slot_res.data:
            return jsonify({"bookedCount": 0, "capacity": 1, "availableSlots": 1}), 200
            
        slot = slot_res.data
        capacity = slot.get('capacity', 1)
        
        appointments = supabase_admin.table('appointments').select('appointment_time').eq('appointment_date', date).execute()
        
        slot_time = str(slot.get('start_time'))
        booked_count = sum(1 for item in (appointments.data or []) if str(item.get("appointment_time")) == slot_time)
        
        return jsonify({
            "bookedCount": booked_count,
            "capacity": capacity,
            "availableSlots": max(capacity - booked_count, 0),
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

def resolve_appointment_target(raw_id, record_type=None):
    resolved_type = (record_type or '').strip().lower()
    raw_id_str = str(raw_id).strip()

    if not resolved_type:
        if raw_id_str.startswith('walkin-'):
            resolved_type = 'walkin'
            raw_id_str = raw_id_str.split('walkin-', 1)[1]
        else:
            resolved_type = 'appointment'

    try:
        resolved_id = int(raw_id_str)
    except (TypeError, ValueError):
        raise ValueError(f"Invalid appointment id: {raw_id}")

    if resolved_type in ('walkin', 'walk-in', 'walk_in'):
        return ('walkin_appointments', 'walkin_id', resolved_id)

    return ('appointments', 'appointment_id', resolved_id)

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
            email_sent = send_cancellation_email(
                email_context.get("email"),
                email_context.get("patient_name"),
                email_context.get("pet_name"),
                email_context.get("service_name"),
                existing_record.get("appointment_date"),
                format_display_time(existing_record.get("appointment_time")),
                cancel_reason
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

        email_sent = send_reschedule_email(
            email_context.get("email"),
            email_context.get("patient_name"),
            email_context.get("pet_name"),
            email_context.get("service_name"),
            new_date,
            format_display_time(new_time),
            reschedule_reason,
            action_links
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

        note_parts = []
        if preferred_date:
            note_parts.append(f"Preferred date: {preferred_date}")
        if preferred_time:
            note_parts.append(f"Preferred time: {preferred_time}")
        if patient_note:
            note_parts.append(f"Patient note: {patient_note}")
        combined_note = " | ".join(note_parts) if note_parts else "Patient requested a new preferred schedule from the appointment details page"

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

    note_parts = []
    if preferred_date:
        note_parts.append(f"Preferred date: {preferred_date}")
    if preferred_time:
        note_parts.append(f"Preferred time: {preferred_time}")
    if response_note:
        note_parts.append(f"Patient note: {response_note}")

    combined_note = " | ".join(note_parts) if note_parts else "Patient requested another date from email link"

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
                email_sent = send_reschedule_review_email(
                    email_context.get("email"),
                    email_context.get("patient_name"),
                    email_context.get("pet_name"),
                    email_context.get("service_name"),
                    preferred_date,
                    format_display_time(preferred_time),
                    action='accepted',
                    clinic_note=admin_note or None
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
                email_sent = send_reschedule_review_email(
                    email_context.get("email"),
                    email_context.get("patient_name"),
                    email_context.get("pet_name"),
                    email_context.get("service_name"),
                    req.get('patient_preferred_date'),
                    format_display_time(req.get('patient_preferred_time')),
                    action='declined',
                    clinic_note=admin_note or None
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
                email_sent = send_appointment_confirmed_email(
                    email_context.get("email"),
                    email_context.get("patient_name"),
                    email_context.get("pet_name"),
                    email_context.get("service_name"),
                    existing_record.get("appointment_date"),
                    format_display_time(existing_record.get("appointment_time")),
                    assigned_doctor
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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
