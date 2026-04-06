from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import create_client, Client
from dotenv import load_dotenv
import os
import random
import string
import secrets
import hashlib
from datetime import datetime, timedelta, date
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
EMPLOYEE_SETUP_URL_BASE = os.environ.get('EMPLOYEE_SETUP_URL_BASE', 'http://localhost:5173/employee/setup-account')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials in .env")
if not RESEND_API_KEY:
    raise ValueError("Missing RESEND_API_KEY in .env")

supabase       = create_client(SUPABASE_URL, SUPABASE_KEY)
supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
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


def find_inventory_duplicate(payload, exclude_item_id=None, include_archived=False):
    query = supabase_admin.table('inventory_items').select(
        'inventory_item_id,item_name,category,no_expiration,expiration_date,is_archived'
    ).eq('branch_id', payload['branch_id']).eq('category', payload['category'])

    if not include_archived:
        query = query.eq('is_archived', False)

    response = query.execute()
    target_name = normalize_inventory_name_for_compare(payload['item_name'])

    for row in (response.data or []):
        row_id = row.get('inventory_item_id')
        if exclude_item_id is not None and str(row_id) == str(exclude_item_id):
            continue

        if normalize_inventory_name_for_compare(row.get('item_name')) != target_name:
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
        raise ValueError('Product already exists with the same expiration date')


def build_inventory_item_payload(data, existing=None):
    item_name = normalize_inventory_item_name(
        data.get('item') or data.get('item_name') or (existing or {}).get('item_name') or ''
    )
    category = (data.get('category') or (existing or {}).get('category') or '').strip()
    if not item_name:
        raise ValueError('item is required')
    if category not in INVENTORY_CATEGORIES:
        raise ValueError('category is invalid')

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
    return {
        'id': record.get('inventory_item_id'),
        'pk': record.get('inventory_item_id'),
        'inventory_item_id': record.get('inventory_item_id'),
        'branchId': record.get('branch_id'),
        'branch_id': record.get('branch_id'),
        'code': record.get('item_code') or '',
        'item': record.get('item_name') or '',
        'category': record.get('category') or '',
        'basePrice': float(record.get('base_price') or 0),
        'sellingPrice': float(record.get('selling_price') or 0),
        'stockCount': int(record.get('current_stock') or 0),
        'stockStatus': record.get('stock_status') or 'Average Stock',
        'expirationDate': format_inventory_expiration_date(record.get('expiration_date'), expiration_na),
        'expirationNA': expiration_na,
        'dateAdded': format_inventory_created_date(record.get('created_at')),
        'maxQuantity': record.get('max_quantity'),
        'useMaxQuantity': bool(record.get('use_max_quantity')),
        'criticalStockLevel': int(record.get('critical_stock_level') or 10),
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

    response = supabase_admin.table('admin_notification_reads') \
        .select('notification_id,read_at') \
        .eq('admin_user_id', admin_user_id) \
        .in_('notification_id', notification_ids) \
        .execute()

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
        if archived_raw is None:
            query = query.eq('is_archived', False)
        else:
            query = query.eq('is_archived', parse_bool(archived_raw))
        if category:
            query = query.eq('category', category)
        if stock_status:
            query = query.eq('stock_status', stock_status)
        if search:
            escaped = search.replace(',', '\\,')
            query = query.or_(f"item_name.ilike.%{escaped}%,item_code.ilike.%{escaped}%")

        response = query.order('item_name').execute()
        items = [normalize_inventory_item(item) for item in (response.data or [])]
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
            'category': item.get('category'),
            'no_expiration': bool(item.get('no_expiration')),
            'expiration_date': item.get('expiration_date'),
        }
        duplicate = find_inventory_duplicate(duplicate_payload, exclude_item_id=item_id, include_archived=False)
        if duplicate:
            return jsonify({'error': 'Cannot restore product because an active product with the same expiration date already exists'}), 400

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

        response = query.execute()
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
