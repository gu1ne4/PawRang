"""Billing HTTP routes."""

from flask import Blueprint

from services.billing_service import (
    create_billing_invoice,
    delete_billing_invoices,
    get_billing_invoices,
    get_billing_products,
    get_billing_services,
    get_billing_source_records,
    record_billing_invoice_payment,
)

billing_bp = Blueprint("billing", __name__)


@billing_bp.route("/api/billing/services", methods=["GET"])
def billing_services():
    return get_billing_services()


@billing_bp.route("/api/billing/products", methods=["GET"])
def billing_products():
    return get_billing_products()


@billing_bp.route("/api/billing/source-records", methods=["GET"])
def billing_source_records():
    return get_billing_source_records()


@billing_bp.route("/api/billing/invoices", methods=["GET"])
def billing_invoices():
    return get_billing_invoices()


@billing_bp.route("/api/billing/invoices", methods=["POST"])
def billing_invoice_create():
    return create_billing_invoice()


@billing_bp.route("/api/billing/invoices/<int:invoice_id>/payments", methods=["POST"])
def billing_invoice_payment(invoice_id):
    return record_billing_invoice_payment(invoice_id)


@billing_bp.route("/api/billing/invoices/bulk", methods=["DELETE"])
def billing_invoice_bulk_delete():
    return delete_billing_invoices()
