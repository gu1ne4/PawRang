"""
Demo analytics data seeder.

This script creates clearly marked historical demo records for the Analytics
module so forecasting, charts, and AI Sales Intelligence can be demonstrated
during testing or thesis presentation.

Demo records are marked with:
- invoice prefix: DEMO-ANL-
- email: analytics.demo@pawrang.test
- notes: DEMO_ANALYTICS_SEED

This is not required for normal production use. Run it only when demo analytics
data needs to be created or recreated.
"""



import argparse
import math
import os
import random
from datetime import date, datetime, time, timedelta
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client


DEMO_PREFIX = "DEMO-ANL"
DEMO_EMAIL = "analytics.demo@pawrang.test"
DEMO_NOTE = "DEMO_ANALYTICS_SEED"
TAX_RATE = 0.12

SERVICE_CATALOG = [
    {"name": "Basic Grooming", "category": "Grooming", "price": 500, "weight": 18},
    {"name": "Full Grooming", "category": "Grooming", "price": 800, "weight": 16},
    {"name": "Vaccination", "category": "Vaccination", "price": 650, "weight": 14},
    {"name": "Dental Prophylaxis", "category": "Dental", "price": 800, "weight": 8},
    {"name": "Consultation & Check-Up", "category": "Consultation", "price": 500, "weight": 14},
    {"name": "X-Ray", "category": "Diagnostics", "price": 1000, "weight": 5},
    {"name": "Pet Boarding", "category": "Boarding", "price": 1200, "weight": 4},
]

PRODUCT_CATALOG = [
    {"name": "Flea And Tick Treatment For Cats", "sku": "DEMO-FLEA", "category": "Medication", "price": 599, "weight": 12},
    {"name": "Rabies Vaccine", "sku": "DEMO-RABIES", "category": "Medication", "price": 650, "weight": 10},
    {"name": "Pet Shampoo", "sku": "DEMO-SHAMPOO", "category": "Pet Supplies", "price": 280, "weight": 8},
    {"name": "Premium Dog Food", "sku": "DEMO-FOOD", "category": "Food", "price": 750, "weight": 9},
    {"name": "Deworming Tablet", "sku": "DEMO-DEWORM", "category": "Deworming", "price": 320, "weight": 7},
    {"name": "Pet Vitamins", "sku": "DEMO-VIT", "category": "Vitamins", "price": 420, "weight": 6},
]

CUSTOMERS = [
    ("Paul Laurence Reyes", "Shogun", "Dog"),
    ("John Smith", "Delta", "Dog"),
    ("Helioooos Lim", "Maia", "Cat"),
    ("Real Steel", "Shiro", "Dog"),
    ("Branch Joker", "Shaco", "Cat"),
    ("Saiph Reyes", "Mocha", "Dog"),
]

PEAK_HOURS = [9, 10, 10, 11, 14, 15, 16]
PAYMENT_METHODS = ["cash", "card", "gcash", "bank"]


def parse_args():
    parser = argparse.ArgumentParser(description="Seed demo historical data for PawRang analytics.")
    parser.add_argument("--apply", action="store_true", help="Write demo rows to Supabase. Without this flag, only prints the plan.")
    parser.add_argument("--clear-existing", action="store_true", help="Delete previous demo analytics rows before inserting.")
    parser.add_argument("--days", type=int, default=180, help="Number of historical days to generate.")
    parser.add_argument("--branch-id", type=int, default=None, help="Branch id to use. Defaults to the first branch.")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for repeatable demo data.")
    return parser.parse_args()


def get_client():
    load_dotenv(Path(__file__).resolve().parent / ".env")
    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")
    if not supabase_url or not service_key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY/SUPABASE_KEY in backend .env")
    return create_client(supabase_url, service_key)


def weighted_choice(items, rng):
    total = sum(item["weight"] for item in items)
    pick = rng.uniform(0, total)
    current = 0
    for item in items:
        current += item["weight"]
        if pick <= current:
            return item
    return items[-1]


def money(value):
    return round(float(value), 2)


def chunked(items, size=500):
    for index in range(0, len(items), size):
        yield items[index:index + size]


def fetch_lookup_rows(supabase, table_name, select_columns="*"):
    try:
        return supabase.table(table_name).select(select_columns).execute().data or []
    except Exception:
        return []


def resolve_branch_id(supabase, requested_branch_id):
    if requested_branch_id:
        return requested_branch_id
    branches = fetch_lookup_rows(supabase, "branches", "branch_id,branch_name")
    if not branches:
        raise RuntimeError("No branches found. Create at least one branch before seeding analytics demo data.")
    return int(branches[0]["branch_id"])


def build_existing_service_lookup(supabase):
    rows = fetch_lookup_rows(supabase, "billing_services", "billing_service_id,service_name")
    return {str(row.get("service_name") or "").lower(): row.get("billing_service_id") for row in rows}


def build_existing_inventory_lookup(supabase, branch_id):
    rows = fetch_lookup_rows(supabase, "inventory_items", "inventory_item_id,item_name,branch_id")
    return {
        str(row.get("item_name") or "").lower(): row.get("inventory_item_id")
        for row in rows
        if int(row.get("branch_id") or 0) == int(branch_id)
    }


def clear_existing_demo_rows(supabase):
    old_invoices = (
        supabase.table("billing_invoices")
        .select("billing_invoice_id")
        .like("invoice_number", f"{DEMO_PREFIX}-%")
        .execute()
        .data
        or []
    )
    old_invoice_ids = [row["billing_invoice_id"] for row in old_invoices if row.get("billing_invoice_id") is not None]
    if old_invoice_ids:
        for ids in chunked(old_invoice_ids, 200):
            supabase.table("billing_invoices").delete().in_("billing_invoice_id", ids).execute()

    old_walkins = (
        supabase.table("walkin_appointments")
        .select("walkin_id")
        .eq("email", DEMO_EMAIL)
        .execute()
        .data
        or []
    )
    old_walkin_ids = [row["walkin_id"] for row in old_walkins if row.get("walkin_id") is not None]
    if old_walkin_ids:
        for ids in chunked(old_walkin_ids, 200):
            supabase.table("walkin_appointments").delete().in_("walkin_id", ids).execute()

    return len(old_invoice_ids), len(old_walkin_ids)


def daily_invoice_count(day_value, start_day, rng):
    day_index = (day_value - start_day).days
    weekly = {0: 2.4, 1: 2.9, 2: 3.2, 3: 3.1, 4: 4.5, 5: 5.4, 6: 1.6}[day_value.weekday()]
    month_growth = 1 + (day_index / 220)
    seasonal_wave = 0.9 + 0.25 * math.sin(day_index / 11)
    noise = rng.uniform(-0.8, 1.1)
    return max(1, int(round(weekly * month_growth * seasonal_wave + noise)))


def build_demo_rows(days, branch_id, service_lookup, inventory_lookup, rng):
    end_day = date.today() - timedelta(days=1)
    start_day = end_day - timedelta(days=days - 1)
    invoice_payloads = []
    walkin_payloads = []
    invoice_meta = []
    sequence = 1

    for day_offset in range(days):
        day_value = start_day + timedelta(days=day_offset)
        invoice_count = daily_invoice_count(day_value, start_day, rng)

        for daily_index in range(invoice_count):
            customer_name, pet_name, species = rng.choice(CUSTOMERS)
            service = weighted_choice(SERVICE_CATALOG, rng)
            products = []
            if rng.random() < 0.62:
                products.append(weighted_choice(PRODUCT_CATALOG, rng))
            if service["category"] == "Grooming" and rng.random() < 0.35:
                products.append(next(item for item in PRODUCT_CATALOG if item["name"] == "Pet Shampoo"))
            if service["category"] == "Vaccination" and rng.random() < 0.45:
                products.append(next(item for item in PRODUCT_CATALOG if item["name"] == "Pet Vitamins"))

            hour_value = rng.choice(PEAK_HOURS)
            minute_value = rng.choice([0, 15, 30, 45])
            invoice_time = time(hour_value, minute_value, 0).strftime("%H:%M:%S")
            subtotal = money(service["price"] + sum(product["price"] for product in products))
            tax_amount = money(subtotal * TAX_RATE)
            total_amount = money(subtotal + tax_amount)
            is_partial = rng.random() < 0.08
            amount_paid = money(total_amount * rng.uniform(0.35, 0.75)) if is_partial else total_amount
            remaining_balance = money(total_amount - amount_paid)
            invoice_number = f"{DEMO_PREFIX}-{day_value.strftime('%Y%m%d')}-{sequence:04d}"
            payment_method = rng.choice(PAYMENT_METHODS)

            invoice_payloads.append({
                "invoice_number": invoice_number,
                "invoice_type": "walkin",
                "source_record_type": "walkin",
                "source_record_id": None,
                "branch_id": branch_id,
                "customer_name": customer_name,
                "customer_email": DEMO_EMAIL,
                "customer_phone": "09000000000",
                "pet_name": pet_name,
                "subtotal": subtotal,
                "tax_rate": TAX_RATE,
                "tax_amount": tax_amount,
                "discount_amount": 0,
                "discount_type": None,
                "discount_value": None,
                "discount_is_percentage": None,
                "total_amount": total_amount,
                "payment_method": "installment" if is_partial else payment_method,
                "payment_status": "partial" if is_partial else "paid",
                "status": "completed",
                "notes": DEMO_NOTE,
                "invoice_date": day_value.isoformat(),
                "invoice_time": invoice_time,
                "amount_paid": amount_paid,
                "remaining_balance": remaining_balance,
            })
            invoice_meta.append({
                "invoice_number": invoice_number,
                "date": day_value,
                "time": invoice_time,
                "payment_method": payment_method,
                "amount_paid": amount_paid,
                "service": service,
                "products": products,
                "service_id": service_lookup.get(service["name"].lower()),
            })

            walkin_payloads.append({
                "first_name": "Analytics",
                "last_name": f"Demo {sequence}",
                "email": DEMO_EMAIL,
                "contact_number": "09000000000",
                "pet_name": pet_name,
                "pet_species": species,
                "pet_breed": "Mixed Breed",
                "pet_gender": rng.choice(["Male", "Female"]),
                "appointment_type": service["category"],
                "appointment_date": day_value.isoformat(),
                "appointment_time": invoice_time,
                "patient_reason": service["name"],
                "status": "completed",
                "branch_id": branch_id,
                "created_at": datetime.combine(day_value, time(max(hour_value - 1, 8), 0)).isoformat(),
            })
            sequence += 1

    service_item_payloads = []
    product_item_payloads = []
    payment_payloads = []
    return invoice_payloads, invoice_meta, service_item_payloads, product_item_payloads, payment_payloads, walkin_payloads, inventory_lookup


def insert_demo_rows(supabase, invoice_payloads, invoice_meta, walkin_payloads, inventory_lookup):
    for rows in chunked(invoice_payloads):
        supabase.table("billing_invoices").insert(rows).execute()

    invoice_numbers = [row["invoice_number"] for row in invoice_payloads]
    inserted_invoice_rows = []
    for numbers in chunked(invoice_numbers, 200):
        inserted_invoice_rows.extend(
            supabase.table("billing_invoices")
            .select("billing_invoice_id,invoice_number")
            .in_("invoice_number", numbers)
            .execute()
            .data
            or []
        )
    invoice_id_by_number = {
        row["invoice_number"]: row["billing_invoice_id"]
        for row in inserted_invoice_rows
    }

    service_rows = []
    product_rows = []
    payment_rows = []
    for meta in invoice_meta:
        invoice_id = invoice_id_by_number.get(meta["invoice_number"])
        if not invoice_id:
            continue

        service = meta["service"]
        service_rows.append({
            "billing_invoice_id": invoice_id,
            "billing_service_id": meta.get("service_id"),
            "item_name": service["name"],
            "item_description": f"{service['category']} demo service",
            "item_category": service["category"],
            "item_subcategory": service["category"],
            "quantity": 1,
            "unit_price": money(service["price"]),
            "line_total": money(service["price"]),
            "sort_order": 1,
        })

        for sort_order, product in enumerate(meta["products"], start=1):
            product_rows.append({
                "billing_invoice_id": invoice_id,
                "inventory_item_id": inventory_lookup.get(product["name"].lower()),
                "item_name": product["name"],
                "sku": product["sku"],
                "item_description": f"{product['category']} demo product",
                "item_category": product["category"],
                "quantity": 1,
                "unit_price": money(product["price"]),
                "line_total": money(product["price"]),
                "sort_order": sort_order,
            })

        payment_rows.append({
            "billing_invoice_id": invoice_id,
            "payment_amount": meta["amount_paid"],
            "payment_method": meta["payment_method"],
            "payment_date": meta["date"].isoformat(),
            "payment_time": meta["time"],
            "notes": DEMO_NOTE,
        })

    for rows in chunked(service_rows):
        supabase.table("billing_invoice_service_items").insert(rows).execute()
    for rows in chunked(product_rows):
        supabase.table("billing_invoice_product_items").insert(rows).execute()
    for rows in chunked(payment_rows):
        supabase.table("billing_invoice_payments").insert(rows).execute()
    for rows in chunked(walkin_payloads):
        supabase.table("walkin_appointments").insert(rows).execute()

    return {
        "invoices": len(invoice_payloads),
        "serviceItems": len(service_rows),
        "productItems": len(product_rows),
        "payments": len(payment_rows),
        "walkins": len(walkin_payloads),
    }


def main():
    args = parse_args()
    days = max(30, min(args.days, 365))
    rng = random.Random(args.seed)

    if not args.apply:
        print("Dry run only. Add --apply to write demo analytics rows.")
        print(f"Planned history window: {days} days")
        print(f"Demo rows will use invoice prefix {DEMO_PREFIX}- and email {DEMO_EMAIL}")
        print("Recommended apply command:")
        print(f"python seed_analytics_demo_data.py --apply --clear-existing --days {days}")
        return

    supabase = get_client()
    branch_id = resolve_branch_id(supabase, args.branch_id)
    service_lookup = build_existing_service_lookup(supabase)
    inventory_lookup = build_existing_inventory_lookup(supabase, branch_id)

    if args.clear_existing:
        cleared_invoices, cleared_walkins = clear_existing_demo_rows(supabase)
        print(f"Cleared {cleared_invoices} old demo invoices and {cleared_walkins} old demo walk-ins.")

    invoice_payloads, invoice_meta, _, _, _, walkin_payloads, inventory_lookup = build_demo_rows(
        days,
        branch_id,
        service_lookup,
        inventory_lookup,
        rng,
    )
    result = insert_demo_rows(supabase, invoice_payloads, invoice_meta, walkin_payloads, inventory_lookup)

    print("Demo analytics data inserted.")
    print(f"Branch id: {branch_id}")
    for key, value in result.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    main()
