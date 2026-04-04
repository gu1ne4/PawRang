from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import create_client, Client
from dotenv import load_dotenv
import os
import random
import string
from datetime import datetime, timedelta
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


def title_name(value):
    return (value or "").replace("_", " ").title()


def build_display_name(profile):
    full = f"{profile.get('firstName', '')} {profile.get('lastName', '')}".strip()
    return full or profile.get('username') or profile.get('email') or "Unknown"


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

    return resend.Emails.send({
        "from": RESEND_FROM_EMAIL,
        "to": [to_email],
        "subject": subject,
        "html": html,
    })


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
RESEND_API_KEY       = os.environ.get('RESEND_API_KEY')
RESEND_FROM_EMAIL    = os.environ.get('RESEND_FROM_EMAIL', 'onboarding@resend.dev')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials in .env")
if not RESEND_API_KEY:
    raise ValueError("Missing RESEND_API_KEY in .env")

supabase       = create_client(SUPABASE_URL, SUPABASE_KEY)
supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
resend.api_key = RESEND_API_KEY

otp_store = {}
RESEND_COOLDOWN_SECONDS = 60


def get_single_row(table_name, column, value):
    result = supabase_admin.table(table_name) \
        .select('*') \
        .eq(column, value) \
        .execute()

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
            "firstName": profile.get('first_name'),
            "lastName": profile.get('last_name'),
            "contact_number": profile.get('contact_number'),
            "role": profile.get('role'),
            "status": profile.get('status'),
            "userImage": profile.get('employee_image'),
            "account_type": "employee",
        }

    return {
        "id": profile.get('id'),
        "email": profile.get('email'),
        "username": profile.get('username'),
        "firstName": profile.get('firstName'),
        "lastName": profile.get('lastName'),
        "contact_number": profile.get('contact_number'),
        "role": profile.get('role'),
        "status": profile.get('status'),
        "userImage": profile.get('userImage'),
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
        profile, source_table = find_account_by_user_id(user_id)
        if not profile:
            return jsonify({"error": "User not found"}), 404

        return jsonify({"user": normalize_profile(profile, source_table)}), 200

    except Exception as e:
        print("Get profile error:", str(e))
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# UPDATE USER PROFILE
# -----------------------------------------------
@app.route('/profile/<user_id>', methods=['PATCH'])
def update_profile(user_id):
    data    = request.get_json()

    try:
        profile, source_table = find_account_by_user_id(user_id)
        if not profile:
            return jsonify({"error": "User not found"}), 404

        if source_table == 'employee_accounts':
            field_map = {
                'firstName': 'first_name',
                'lastName': 'last_name',
                'contact_number': 'contact_number',
                'userImage': 'employee_image',
            }
        else:
            field_map = {
                'firstName': 'firstName',
                'lastName': 'lastName',
                'contact_number': 'contact_number',
                'userImage': 'userImage',
            }

        update_data = {
            db_key: data[key]
            for key, db_key in field_map.items()
            if key in data
        }

        if not update_data:
            return jsonify({"error": "No valid fields to update"}), 400

        supabase_admin.table(source_table) \
            .update(update_data) \
            .eq('id', user_id) \
            .execute()

        return jsonify({"message": "Profile updated successfully"}), 200

    except Exception as e:
        print("Update profile error:", str(e))
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# UPLOAD PET PHOTO TO SUPABASE STORAGE
# -----------------------------------------------
@app.route('/upload-pet-photo', methods=['POST'])
def upload_pet_photo():
    import base64

    data      = request.get_json()
    file_b64  = data.get('file')
    file_name = data.get('file_name', f"pet_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}.jpg")
    mime_type = data.get('mime_type', 'image/jpeg')

    if not file_b64:
        return jsonify({"error": "No file provided"}), 400

    try:
        file_data = base64.b64decode(file_b64)
        file_path = f"photos/{file_name}"

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


# -----------------------------------------------
# ADD PET PROFILE
# -----------------------------------------------
@app.route('/pets', methods=['POST'])
def add_pet():
    data             = request.get_json()
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
    data    = request.get_json()
    allowed = [
        'pet_name', 'pet_species', 'pet_breed', 'pet_gender',
        'pet_size', 'birthday', 'age', 'weight_kg',
        'pet_photo_url', 'vaccination_urls',
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


# -----------------------------------------------
# BOOK APPOINTMENT
# -----------------------------------------------
@app.route('/appointments', methods=['POST'])
def book_appointment():
    data             = request.get_json()
    owner_id         = data.get('owner_id')
    pet_id           = data.get('pet_id')
    appointment_type = data.get('appointment_type')
    appointment_date = data.get('appointment_date')
    appointment_time = data.get('appointment_time')
    patient_reason   = data.get('patient_reason', '')
    branch_id        = data.get('branch_id')

    if not all([owner_id, pet_id, appointment_type, appointment_date, appointment_time]):
        missing = [k for k, v in {
            "owner_id":         owner_id,
            "pet_id":           pet_id,
            "appointment_type": appointment_type,
            "appointment_date": appointment_date,
            "appointment_time": appointment_time,
        }.items() if not v]
        return jsonify({"error": f"Missing required fields: {missing}"}), 400

    try:
        result = supabase_admin.table('appointments').insert({
            "owner_id":         owner_id,
            "pet_id":           pet_id,
            "appointment_type": appointment_type,
            "appointment_date": appointment_date,
            "appointment_time": appointment_time,
            "patient_reason":   patient_reason,
            "branch_id":        branch_id,
            "status":           "pending",
        }).execute()

        appointment_id = result.data[0]["appointment_id"] if result.data else None
        return jsonify({"message": "Appointment booked successfully!", "appointment_id": appointment_id}), 200

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
@app.route('/medical-information', methods=['POST'])
def save_medical_information():
    data           = request.get_json()
    appointment_id = data.get('appointment_id')

    if not appointment_id:
        return jsonify({"error": "appointment_id is required"}), 400

    try:
        supabase_admin.table('medical_information').insert({
            "appointment_id":         appointment_id,
            "is_pregnant":            data.get('is_pregnant'),
            "is_vaccinated":          data.get('is_vaccinated'),
            "has_allergies":          data.get('has_allergies'),
            "allergy_details":        data.get('allergy_details'),
            "has_skin_condition":     data.get('has_skin_condition'),
            "been_groomed_before":    data.get('been_groomed_before'),
            "on_medication":          data.get('on_medication'),
            "medication_details":     data.get('medication_details'),
            "skin_condition_details": data.get('skin_condition_details'),
            "flea_tick_prevention":   data.get('flea_tick_prevention'),
            "additional_notes":       data.get('additional_notes'),
        }).execute()

        return jsonify({"message": "Medical information saved successfully!"}), 200

    except Exception as e:
        print("Medical information error:", str(e))
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# GET ALL APPOINTMENTS FOR A USER
# -----------------------------------------------
@app.route('/appointments/user/<user_id>', methods=['GET'])
def get_user_appointments(user_id):
    try:
        response = supabase_admin.table('appointments') \
            .select('*, pet_profile(*)') \
            .eq('owner_id', user_id) \
            .order('appointment_date', desc=True) \
            .execute()

        return jsonify({"appointments": response.data}), 200

    except Exception as e:
        print("Fetch appointments error:", str(e))
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# GET ALL BRANCHES
# -----------------------------------------------
@app.route('/branches', methods=['GET'])
def get_branches():
    try:
        res = supabase.table('branches').select('*').order('branch_id').execute()
        return jsonify({'branches': res.data}), 200

    except Exception as e:
        print("Fetch branches error:", str(e))
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# ADMIN COMPATIBILITY ROUTES
# -----------------------------------------------
@app.route('/accounts', methods=['GET'])
def get_accounts():
    try:
        res = supabase_admin.table('employee_accounts').select('*').execute()
        accounts = [normalize_employee_admin_account(item) for item in (res.data or [])]
        return jsonify(accounts), 200
    except Exception as e:
        print("Fetch accounts error:", str(e))
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

        username_seed = f"{first_name}.{last_name}".lower().replace(" ", "")
        if not username_seed.strip('.'):
            username_seed = email.split('@')[0] or 'employee'

        username = username_seed
        suffix = 1
        while get_single_row('employee_accounts', 'username', username):
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

        insert_response = supabase_admin.table('employee_accounts').insert({
            "id": user.id,
            "username": username,
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
        return jsonify({
            "message": "Employee account created successfully",
            "account": normalize_employee_admin_account(created or {
                "id": user.id,
                "username": username,
                "first_name": first_name,
                "last_name": last_name,
                "contact_number": contact_number,
                "email": email,
                "role": role,
                "status": status_value,
                "employee_image": employee_image,
                "is_initial_login": True,
            }),
            "temporary_password": temp_password,
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


@app.route('/api/day-availability', methods=['GET'])
def get_day_availability():
    return jsonify([
        {"day_of_week": day, "is_available": value}
        for day, value in day_availability_store.items()
    ]), 200


@app.route('/api/day-availability', methods=['POST'])
def create_day_availability():
    data = request.get_json() or {}
    day = (data.get('day_of_week') or '').lower()
    if day not in day_availability_store:
        return jsonify({"error": "Invalid day_of_week"}), 400
    day_availability_store[day] = bool(data.get('is_available'))
    return jsonify({"message": "Day availability saved", "day_of_week": day, "is_available": day_availability_store[day]}), 200


@app.route('/api/day-availability/<day_name>', methods=['PUT'])
def update_day_availability(day_name):
    day = (day_name or '').lower()
    if day not in day_availability_store:
        return jsonify({"error": "Invalid day"}), 404
    data = request.get_json() or {}
    day_availability_store[day] = bool(data.get('is_available'))
    return jsonify({"message": "Day availability updated", "day_of_week": day, "is_available": day_availability_store[day]}), 200


@app.route('/api/time-slots/<day_name>', methods=['GET'])
def get_time_slots(day_name):
    day = (day_name or '').lower()
    return jsonify({"timeSlots": time_slots_store.get(day, [])}), 200


@app.route('/api/time-slots/<day_name>', methods=['POST'])
def save_time_slots(day_name):
    day = (day_name or '').lower()
    slots = (request.get_json() or {}).get('slots', [])
    normalized = []
    for idx, slot in enumerate(slots, start=1):
        normalized.append({
            "id": slot.get("id") or f"{day}-{idx}",
            "start_time": slot.get("startTime") or slot.get("start_time"),
            "end_time": slot.get("endTime") or slot.get("end_time"),
            "capacity": slot.get("capacity", 1),
        })
    time_slots_store[day] = normalized
    return jsonify({"message": "Time slots saved", "timeSlots": normalized}), 200


@app.route('/api/time-slots/<slot_id>', methods=['DELETE'])
def delete_time_slot(slot_id):
    for day, slots in time_slots_store.items():
        filtered = [slot for slot in slots if str(slot.get("id")) != str(slot_id)]
        if len(filtered) != len(slots):
            time_slots_store[day] = filtered
            return jsonify({"message": "Time slot deleted"}), 200
    return jsonify({"error": "Time slot not found"}), 404


@app.route('/api/appointments/booked-slots/<time_slot_id>', methods=['GET'])
def get_booked_slots(time_slot_id):
    date = request.args.get('date')
    appointments = supabase_admin.table('appointments').select('*').eq('appointment_date', date).execute().data or []
    slot = None
    for slots in time_slots_store.values():
        slot = next((item for item in slots if str(item.get("id")) == str(time_slot_id)), None)
        if slot:
            break
    if not slot:
        return jsonify({"bookedCount": 0, "capacity": 1, "availableSlots": 1}), 200

    slot_time = normalize_db_time(slot.get('start_time'))
    booked_count = sum(
        1 for item in appointments
        if normalize_db_time(item.get("appointment_time")) == slot_time
    )
    capacity = slot.get("capacity", 1)
    return jsonify({
        "bookedCount": booked_count,
        "capacity": capacity,
        "availableSlots": max(capacity - booked_count, 0),
    }), 200


@app.route('/api/appointments', methods=['POST'])
def create_admin_appointment():
    return jsonify({"error": "Admin-side create appointment is not yet supported by this backend flow."}), 400


@app.route('/api/appointments/table', methods=['GET'])
def get_appointments_table():
    try:
        return jsonify({"appointments": load_admin_appointments()}), 200
    except Exception as e:
        print("Appointments table error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/appointments/history', methods=['GET'])
def get_appointments_history():
    try:
        history = [
            item for item in load_admin_appointments()
            if item.get("status") in ("completed", "cancelled")
        ]
        return jsonify({"appointments": history}), 200
    except Exception as e:
        print("Appointments history error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/appointments/<int:appointment_id>/cancel-with-reason', methods=['PUT'])
def cancel_appointment_with_reason(appointment_id):
    data = request.get_json() or {}
    cancel_reason = data.get("cancellation_details") or data.get("cancel_reason") or ""
    try:
        check = supabase_admin.table('appointments') \
            .select('status, owner_id, pet_id, appointment_type, appointment_date, appointment_time') \
            .eq('appointment_id', appointment_id) \
            .single() \
            .execute()

        if not check.data:
            return jsonify({"error": "Appointment not found"}), 404

        if check.data['status'] in ('cancelled', 'completed'):
            return jsonify({"error": f"Cannot cancel an appointment with status '{check.data['status']}'"}), 400

        appointment = check.data

        supabase_admin.table('appointments').update({
            "status": "cancelled",
            "patient_reason": cancel_reason,
        }).eq('appointment_id', appointment_id).execute()

        email_sent = False
        try:
            patient = get_single_row('patient_account', 'id', appointment.get('owner_id'))
            pet = get_single_row('pet_profile', 'pet_id', appointment.get('pet_id'))
            send_appointment_status_email(
                'cancelled',
                patient.get('email') if patient else None,
                build_display_name(patient or {}),
                (pet or {}).get('pet_name'),
                appointment.get('appointment_type'),
                appointment.get('appointment_date'),
                appointment.get('appointment_time'),
                cancel_reason,
            )
            email_sent = True
        except Exception as mail_err:
            print("Cancel notification email error:", str(mail_err))

        return jsonify({"message": "Appointment cancelled successfully", "emailSent": email_sent}), 200
    except Exception as e:
        print("Cancel with reason error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/appointments/<int:appointment_id>/reschedule', methods=['POST'])
def create_admin_reschedule_request(appointment_id):
    data = request.get_json() or {}
    new_date = data.get("new_date")
    new_time = data.get("new_time")
    new_time_slot_id = data.get("new_time_slot_id")
    reschedule_reason = data.get("reason") or data.get("reschedule_reason") or ""

    if not new_time and new_time_slot_id and new_date:
        day_name = datetime.strptime(new_date, "%Y-%m-%d").strftime("%A").lower()
        slot = next(
            (item for item in time_slots_store.get(day_name, []) if str(item.get("id")) == str(new_time_slot_id)),
            None
        )
        if slot:
            new_time = normalize_db_time(slot.get("start_time"))

    if not new_time:
        new_time = normalize_db_time(data.get("new_time_slot_display"))

    if not new_date or not new_time:
        return jsonify({"error": "new_date and new_time are required"}), 400

    try:
        check = supabase_admin.table('appointments') \
            .select('status, owner_id, pet_id, appointment_type') \
            .eq('appointment_id', appointment_id) \
            .single() \
            .execute()

        if not check.data:
            return jsonify({"error": "Appointment not found"}), 404

        if check.data['status'] in ('cancelled', 'completed'):
            return jsonify({"error": f"Cannot reschedule an appointment with status '{check.data['status']}'"}), 400

        appointment = check.data

        supabase_admin.table('appointments').update({
            "appointment_date": new_date,
            "appointment_time": new_time,
            "patient_reason": reschedule_reason,
            "status": "pending",
        }).eq('appointment_id', appointment_id).execute()

        email_sent = False
        try:
            patient = get_single_row('patient_account', 'id', appointment.get('owner_id'))
            pet = get_single_row('pet_profile', 'pet_id', appointment.get('pet_id'))
            send_appointment_status_email(
                'rescheduled',
                patient.get('email') if patient else None,
                build_display_name(patient or {}),
                (pet or {}).get('pet_name'),
                appointment.get('appointment_type'),
                new_date,
                new_time,
                reschedule_reason,
            )
            email_sent = True
        except Exception as mail_err:
            print("Reschedule notification email error:", str(mail_err))

        return jsonify({"message": "Reschedule request submitted successfully", "emailSent": email_sent}), 200
    except Exception as e:
        print("Admin reschedule error:", str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/available-time-slots', methods=['GET'])
def get_available_time_slots():
    date = request.args.get('date')
    if not date:
        return jsonify({"timeSlots": []}), 200

    day_name = datetime.strptime(date, "%Y-%m-%d").strftime("%A").lower()
    slots = time_slots_store.get(day_name, [])
    appointments = supabase_admin.table('appointments').select('*').eq('appointment_date', date).execute().data or []
    time_slots = []
    for slot in slots:
        display = f"{slot.get('start_time')} - {slot.get('end_time')}"
        slot_time = normalize_db_time(slot.get("start_time"))
        booked_count = sum(
            1 for item in appointments
            if normalize_db_time(item.get("appointment_time")) == slot_time
        )
        capacity = slot.get("capacity", 1)
        time_slots.append({
            "id": slot.get("id"),
            "start_time": slot.get("start_time"),
            "end_time": slot.get("end_time"),
            "availableSlots": max(capacity - booked_count, 0),
        })
    return jsonify({"timeSlots": time_slots}), 200


@app.route('/api/appointments/<int:appointment_id>/assign-doctor', methods=['PUT'])
def assign_doctor(appointment_id):
    doctor_id = (request.get_json() or {}).get("doctorId")
    try:
        response = supabase_admin.table('appointments') \
            .update({"assigned_doctor_id": doctor_id}) \
            .eq('appointment_id', appointment_id) \
            .execute()
        return jsonify({"message": "Doctor assigned successfully", "appointment": response.data[0] if response.data else None}), 200
    except Exception as e:
        print("Assign doctor warning:", str(e))
        return jsonify({"message": "Doctor assignment was accepted for UI flow, but could not be persisted.", "warning": str(e)}), 200


@app.route('/api/special-dates', methods=['GET'])
def get_special_dates():
    return jsonify({"specialDates": special_dates_store}), 200


@app.route('/api/special-dates', methods=['POST'])
def save_special_dates():
    data = request.get_json() or {}
    event = {"event_name": data.get("event_name"), "event_date": data.get("event_date")}
    special_dates_store.append(event)
    return jsonify({"message": "Special date saved", "specialDate": event}), 200


@app.route('/api/special-dates/<event_date>', methods=['DELETE'])
def delete_special_dates(event_date):
    global special_dates_store
    special_dates_store = [item for item in special_dates_store if item.get("event_date") != event_date]
    return jsonify({"message": "Special date deleted"}), 200


@app.route('/api/appointments/<int:appointment_id>/status', methods=['PUT'])
def update_admin_appointment_status(appointment_id):
    status = ((request.get_json() or {}).get("status") or "").lower()
    if status not in ("pending", "completed", "cancelled", "scheduled"):
        return jsonify({"error": "Invalid status"}), 400
    try:
        response = supabase_admin.table('appointments') \
            .update({"status": status}) \
            .eq('appointment_id', appointment_id) \
            .execute()
        return jsonify({"message": "Appointment status updated", "appointment": response.data[0] if response.data else None}), 200
    except Exception as e:
        print("Update appointment status error:", str(e))
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# FORGOT PASSWORD
# -----------------------------------------------
@app.route('/forgot-password', methods=['POST'])
def forgot_password():
    data  = request.get_json()
    email = data.get('email')

    if not email:
        return jsonify({"error": "Email is required"}), 400

    try:
        user_check = supabase_admin.table('patient_account') \
            .select('id') \
            .eq('email', email) \
            .execute()

        if not user_check.data:
            return jsonify({"message": "If this email exists, an OTP has been sent."}), 200

        otp        = ''.join(random.choices(string.digits, k=6))
        expires_at = datetime.utcnow() + timedelta(minutes=10)

        otp_store[email] = {
            "otp":        otp,
            "expires_at": expires_at,
            "verified":   False,
            "mode":       "passwordReset",
            "sent_at":    datetime.utcnow(),
        }

        send_otp_email(email, otp, subject='Your Password Reset OTP', purpose='password reset')

        return jsonify({"message": "OTP sent successfully!"}), 200

    except Exception as e:
        print("Forgot password error:", str(e))
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
    data  = request.get_json()
    email = data.get('email')
    mode  = data.get('mode', 'passwordReset')

    if not email:
        return jsonify({"error": "Email is required"}), 400

    try:
        user_check = supabase_admin.table('patient_account') \
            .select('id') \
            .eq('email', email) \
            .execute()

        if not user_check.data:
            return jsonify({"error": "No account found with this email."}), 400

        existing = otp_store.get(email)
        if existing and 'sent_at' in existing:
            elapsed = (datetime.utcnow() - existing['sent_at']).total_seconds()
            if elapsed < RESEND_COOLDOWN_SECONDS:
                wait = int(RESEND_COOLDOWN_SECONDS - elapsed)
                return jsonify({"error": f"Please wait {wait} second(s) before requesting a new OTP."}), 429

        otp        = ''.join(random.choices(string.digits, k=6))
        expires_at = datetime.utcnow() + timedelta(minutes=10)

        otp_store[email] = {
            "otp":        otp,
            "expires_at": expires_at,
            "verified":   False,
            "mode":       mode,
            "sent_at":    datetime.utcnow(),
        }

        subject = 'Confirm Your Email' if mode == 'emailConfirmation' else 'Your Password Reset OTP'
        purpose = 'email confirmation' if mode == 'emailConfirmation' else 'password reset'

        send_otp_email(email, otp, subject=subject, purpose=purpose)

        return jsonify({"message": "OTP resent successfully!"}), 200

    except Exception as e:
        print("Resend OTP error:", str(e))
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# CHANGE PASSWORD
# -----------------------------------------------
@app.route('/change-password', methods=['POST'])
def change_password():
    data         = request.get_json()
    email        = data.get('email')
    new_password = data.get('new_password')

    if not email or not new_password:
        return jsonify({"error": "Email and new password are required"}), 400

    stored = otp_store.get(email)

    if not stored or not stored.get('verified'):
        return jsonify({"error": "OTP not verified. Please complete verification first."}), 403

    try:
        user_check = supabase_admin.table('patient_account') \
            .select('id') \
            .eq('email', email) \
            .single() \
            .execute()

        user_id = user_check.data['id']

        supabase_admin.auth.admin.update_user_by_id(user_id, {"password": new_password})

        del otp_store[email]

        return jsonify({"message": "Password changed successfully!"}), 200

    except Exception as e:
        print("Change password error:", str(e))
        return jsonify({"error": str(e)}), 400


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
