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
from datetime import datetime, timedelta

load_dotenv()
app = Flask(__name__)
CORS(app, resources={r'/*': {'origins': '*'}})

SUPABASE_URL         = os.environ.get('SUPABASE_URL')
SUPABASE_KEY         = os.environ.get('SUPABASE_KEY')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials in .env")

supabase       = create_client(SUPABASE_URL, SUPABASE_KEY)
supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

otp_store = {}
RESEND_COOLDOWN_SECONDS = 60


# -----------------------------------------------
# HELPER — send OTP email via Gmail SMTP
# -----------------------------------------------
def send_otp_email(to_email, otp, subject='Your OTP Code', purpose='verification'):
    smtp_email = os.environ.get('SMTP_EMAIL')
    smtp_pass  = os.environ.get('SMTP_PASSWORD')

    msg            = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From']    = smtp_email
    msg['To']      = to_email

    html = f"""
        <h2>OTP Verification</h2>
        <p>Your OTP for <strong>{purpose}</strong> is:</p>
        <p><strong style="font-size:32px; letter-spacing:8px">{otp}</strong></p>
        <p>This OTP expires in 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
    """
    msg.attach(MIMEText(html, 'html'))

    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
        server.login(smtp_email, smtp_pass)
        server.sendmail(smtp_email, to_email, msg.as_string())


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
    data     = request.get_json()
    email    = data.get('email')
    username = data.get('username')
    password = data.get('password')

    if not email or not username or not password:
        return jsonify({"error": "Email, username, and password are required."}), 400

    try:
        user_lookup = supabase_admin.table('patient_account') \
            .select('id, email, username') \
            .eq('email', email) \
            .eq('username', username) \
            .single() \
            .execute()

        if not user_lookup.data:
            return jsonify({"error": "Email and username do not match any account."}), 401

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

            return jsonify({"error": "Please confirm your email before logging in. A new code has been sent to your inbox."}), 403

        profile_response = supabase.table('patient_account') \
            .select('*') \
            .eq('id', user.id) \
            .single() \
            .execute()

        profile = profile_response.data

        return jsonify({
            "message":      "Login successful!",
            "access_token": auth_response.session.access_token,
            "user": {
                "id":             user.id,
                "email":          user.email,
                "username":       profile.get('username'),
                "firstName":      profile.get('firstName'),
                "lastName":       profile.get('lastName'),
                "contact_number": profile.get('contact_number'),
                "role":           profile.get('role'),
                "status":         profile.get('status'),
            }
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
        response = supabase_admin.table('patient_account') \
            .select('*') \
            .eq('id', user_id) \
            .single() \
            .execute()

        if not response.data:
            return jsonify({"error": "User not found"}), 404

        return jsonify({"user": response.data}), 200

    except Exception as e:
        print("Get profile error:", str(e))
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# UPDATE USER PROFILE
# -----------------------------------------------
@app.route('/profile/<user_id>', methods=['PATCH'])
def update_profile(user_id):
    data    = request.get_json()
    allowed = ['firstName', 'lastName', 'contact_number', 'userImage']
    update_data = {k: v for k, v in data.items() if k in allowed}

    if not update_data:
        return jsonify({"error": "No valid fields to update"}), 400

    try:
        supabase_admin.table('patient_account') \
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