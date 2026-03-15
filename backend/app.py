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
CORS(app)

SUPABASE_URL     = os.environ.get('SUPABASE_URL')
SUPABASE_KEY     = os.environ.get('SUPABASE_KEY')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials in .env")

supabase       = create_client(SUPABASE_URL, SUPABASE_KEY)
supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

load_dotenv()
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


# -----------------------------------------------
# SIGNUP
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
# LOGIN
# -----------------------------------------------
@app.route('/login', methods=['POST'])
def login():
    data     = request.get_json()
    email    = data.get('email')
    password = data.get('password')

    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email":    email,
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

        profile_response = supabase.table('patient_account') \
            .select('*') \
            .eq('id', user.id) \
            .single() \
            .execute()

        profile = profile_response.data

        return jsonify({
            "message": "Login successful!",
            "user": {
                "id":             user.id,
                "email":          user.email,
                "username":       profile.get('username'),
                "fullname":       profile.get('fullname'),
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

    if not all([owner_id, pet_name, pet_type, breed, pet_size, gender]):
        missing = [k for k, v in {
            "owner_id": owner_id, "pet_name": pet_name, "pet_type": pet_type,
            "breed": breed, "pet_size": pet_size, "gender": gender
        }.items() if not v]
        return jsonify({"error": f"Missing required fields: {missing}"}), 400

    try:
        response = supabase.table('pet_profile').insert({
            "owner_id":    owner_id,
            "pet_name":    pet_name,
            "pet_species": pet_type,
            "pet_breed":   breed,
            "pet_size":    pet_size,
            "pet_gender":  gender,
            "birthday":    birthday,
            "age":         age,
            "weight_kg":   weight,
        }).execute()

        pet = response.data[0] if response.data else None
        return jsonify({"message": "Pet added successfully", "pet": pet}), 200

    except Exception as e:
        print("Add pet error:", e)
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
# BOOK APPOINTMENT
# -----------------------------------------------
@app.route('/appointments', methods=['POST'])
def book_appointment():
    data = request.get_json()

    owner_id         = data.get('owner_id')
    pet_id           = data.get('pet_id')
    appointment_type = data.get('appointment_type')
    appointment_date = data.get('appointment_date')
    appointment_time = data.get('appointment_time')
    patient_reason   = data.get('patient_reason', '')

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
        supabase.table('appointments').insert({
            "owner_id":         owner_id,
            "pet_id":           pet_id,
            "appointment_type": appointment_type,
            "appointment_date": appointment_date,
            "appointment_time": appointment_time,
            "patient_reason":   patient_reason,
            "status":           "pending",
        }).execute()

        return jsonify({"message": "Appointment booked successfully!"}), 200

    except Exception as e:
        print("Appointment error:", e)
        return jsonify({"error": str(e)}), 400


# -----------------------------------------------
# GET ALL APPOINTMENTS FOR A USER
# -----------------------------------------------
@app.route('/appointments/user/<user_id>', methods=['GET'])
def get_user_appointments(user_id):
    try:
        response = supabase.table('appointments') \
            .select(', pet_profile()') \
            .eq('owner_id', user_id) \
            .execute()

        return jsonify({"appointments": response.data}), 200

    except Exception as e:
        print("Fetch appointments error:", e)
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
        user_check = supabase.table('patient_account') \
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
            "verified":   False
        }

        send_otp_email(email, otp)  # ← clean call, no extra syntax

        return jsonify({"message": "OTP sent successfully!"}), 200

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
    data         = request.get_json()
    email        = data.get('email')
    new_password = data.get('new_password')

    if not email or not new_password:
        return jsonify({"error": "Email and new password are required"}), 400

    stored = otp_store.get(email)

    if not stored or not stored.get('verified'):
        return jsonify({"error": "OTP not verified. Please complete verification first."}), 403

    try:
        user_check = supabase.table('patient_account') \
            .select('id') \
            .eq('email', email) \
            .single() \
            .execute()

        user_id = user_check.data['id']

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