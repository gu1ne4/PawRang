"""Billing endpoint business logic."""

from flask import jsonify, request

_deps = {}


def configure_billing_service(**deps):
    _deps.update(deps)
    globals().update(deps)


def get_billing_services():
    try:
        return jsonify({"services": build_billing_service_lookups()["services"]}), 200
    except Exception as e:
        print("Fetch billing services error:", str(e))
        return jsonify({"error": str(e)}), 400


def get_billing_products():
    try:
        branch_scope, branch_error = require_actor_branch_scope()
        if branch_error:
            return jsonify({"error": branch_error}), 400
        return jsonify({"products": build_billing_product_catalog(branch_scope=branch_scope)}), 200
    except Exception as e:
        print("Fetch billing products error:", str(e))
        return jsonify({"error": str(e)}), 400


def get_billing_source_records():
    try:
        actor_id = request.args.get("userId") or request.args.get("user_id") or request.args.get("adminUserId")
        if not actor_id:
            return jsonify({"error": "userId is required to load branch-scoped billing records"}), 400
        return jsonify(build_billing_source_records(actor_id=actor_id)), 200
    except Exception as e:
        print("Fetch billing source records error:", str(e))
        return jsonify({"error": str(e)}), 400


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
        if payment_method not in {"cash", "gcash", "installment"}:
            raise ValueError("paymentMethod is invalid")
        initial_payment_method = str(
            data.get("initialPaymentMethod")
            or data.get("initial_payment_method")
            or ("cash" if payment_method == "installment" else payment_method)
        ).strip().lower()
        if initial_payment_method not in {"cash", "gcash"}:
            raise ValueError("initialPaymentMethod is invalid")
        payment_reference = get_payment_reference_from_request(data, "paymentReference", "payment_reference")
        initial_payment_reference = get_payment_reference_from_request(
            data,
            "initialPaymentReference",
            "initial_payment_reference",
        )
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
        if branch_id is None:
            branch_id = resolve_billing_source_branch_id(source_record_type, source_record_id)
        if branch_id is None and branch_scope and not branch_scope.get("can_access_all"):
            branch_id = branch_scope.get("branch_id")
        branch_id, branch_access_error = validate_branch_scope_access(
            branch_scope,
            branch_id,
            allow_unassigned=True,
        )
        if branch_access_error:
            return jsonify({"error": branch_access_error}), 403

        existing_invoice = get_active_billing_invoice_for_source(source_record_type, source_record_id)
        if existing_invoice:
            normalized_existing_invoice = fetch_billing_invoice_with_details(existing_invoice.get("billing_invoice_id"))
            record_billing_audit_event(
                "Invoice Creation Blocked",
                existing_invoice,
                actor_data=data,
                summary=(
                    f"Invoice creation was blocked because active invoice "
                    f"{existing_invoice.get('invoice_number')} already exists for this billing source."
                ),
                status="Warning",
                metadata={
                    "requested_invoice_type": invoice_type,
                    "requested_source_record_type": source_record_type,
                    "requested_source_record_id": source_record_id,
                },
            )
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
        base_total_amount = round(subtotal + tax_amount - discount_amount, 2)
        installment_plan = build_billing_installment_plan(
            payment_method,
            base_total_amount,
            data.get("installmentMonths", data.get("installment_months")),
        )
        total_amount = installment_plan["total_amount"]
        initial_payment_amount = 0.0
        if payment_method == "installment":
            initial_payment_amount = installment_plan["down_payment_amount"]
        else:
            initial_payment_amount = total_amount
            initial_payment_reference = payment_reference

        if payment_state_requires_reference(payment_method, initial_payment_method, initial_payment_amount) and not initial_payment_reference:
            label = {
                "gcash": "GCash reference number",
            }.get(initial_payment_method, "payment reference")
            raise ValueError(f"{label} is required")
        if (
            payment_state_requires_reference(payment_method, initial_payment_method, initial_payment_amount)
            and not is_billing_numeric_payment_reference(initial_payment_reference)
        ):
            raise ValueError("GCash reference number must contain numbers only")

        payment_state = derive_billing_payment_state(total_amount, initial_payment_amount)
        installment_monthly_due = calculate_billing_monthly_due(
            payment_state["remaining_balance"],
            installment_plan["months"],
        )
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
            "installment_months": installment_plan["months"],
            "installment_interest_rate": installment_plan["interest_rate"],
            "installment_interest_amount": installment_plan["interest_amount"],
            "installment_monthly_due": installment_monthly_due,
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

        invoice_rows = insert_billing_invoice_record(invoice_payload)
        created_invoice = invoice_rows[0] if invoice_rows else get_single_row("billing_invoices", "invoice_number", invoice_payload["invoice_number"])
        if not created_invoice:
            raise ValueError("Invoice could not be created")
        for key in (
            "installment_months",
            "installment_interest_rate",
            "installment_interest_amount",
            "installment_monthly_due",
        ):
            if key not in created_invoice:
                created_invoice[key] = invoice_payload.get(key)

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
                "payment_reference": initial_payment_reference or None,
                "notes": "Downpayment" if payment_method == "installment" else "Invoice payment",
                "created_by": payment_actor_id,
            }
            created_payment_history = insert_billing_payment_record(payment_payload)

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
        if normalized_invoice and payment_method == "installment":
            normalized_invoice["installmentMonths"] = normalized_invoice.get("installmentMonths") or installment_plan["months"]
            normalized_invoice["installmentInterestRate"] = normalized_invoice.get("installmentInterestRate") or installment_plan["interest_rate"]
            normalized_invoice["installmentInterestAmount"] = normalized_invoice.get("installmentInterestAmount") or installment_plan["interest_amount"]
            normalized_invoice["installmentMonthlyDue"] = normalized_invoice.get("installmentMonthlyDue") or installment_monthly_due

        if source_record_type in {"appointment", "walkin"} and source_record_id:
            try:
                source_table = "walkin_appointments" if source_record_type == "walkin" else "appointments"
                source_id_column = "walkin_id" if source_record_type == "walkin" else "appointment_id"
                source_record = get_single_row(source_table, source_id_column, source_record_id) or {}
                record_appointment_audit_event(
                    "Billing Generated From Appointment",
                    source_record,
                    table_name=source_table,
                    fallback_id=source_record_id,
                    actor_data=data,
                    summary=f"Billing invoice {created_invoice.get('invoice_number')} was generated for this appointment.",
                    status="Success",
                    metadata={
                        "billing_invoice_id": invoice_id,
                        "invoice_number": created_invoice.get("invoice_number"),
                        "total_amount": created_invoice.get("total_amount"),
                        "payment_status": created_invoice.get("payment_status"),
                    },
                )
            except Exception as audit_error:
                print(f"Appointment billing audit error: {audit_error}")

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
        record_billing_audit_event(
            "Invoice Created",
            created_invoice,
            actor_data=data,
            summary=(
                f"Invoice {created_invoice.get('invoice_number')} was created for "
                f"{created_invoice.get('pet_name') or 'this pet'} totaling "
                f"{format_audit_money(created_invoice.get('total_amount'))}."
            ),
            status="Success",
            metadata={
                "service_item_count": len(created_service_items),
                "product_item_count": len(created_product_items),
                "discount_type": created_invoice.get("discount_type"),
                "base_total_amount": base_total_amount,
                "initial_payment_amount": payment_state["amount_paid"],
                "downpayment_amount": payment_state["amount_paid"],
                "downpayment_rate": installment_plan["down_payment_rate"],
                "installment_months": created_invoice.get("installment_months"),
                "installment_interest_rate": created_invoice.get("installment_interest_rate"),
                "installment_interest_amount": created_invoice.get("installment_interest_amount"),
                "installment_monthly_due": installment_monthly_due,
            },
        )
        if payment_state["amount_paid"] > 0:
            payment_event = (
                "Invoice Fully Paid"
                if payment_state["payment_status"] == "paid"
                else "Installment Payment Recorded"
            )
            record_billing_audit_event(
                payment_event,
                created_invoice,
                actor_data=data,
                summary=(
                    f"Downpayment of {format_audit_money(payment_state['amount_paid'])} was recorded for "
                    f"invoice {created_invoice.get('invoice_number')}. Remaining balance: "
                    f"{format_audit_money(payment_state['remaining_balance'])}."
                ),
                status="Success",
                metadata={
                    "payment_amount": payment_state["amount_paid"],
                    "remaining_balance": payment_state["remaining_balance"],
                    "payment_method": initial_payment_method,
                    "payment_reference": initial_payment_reference,
                    "is_initial_payment": True,
                    "downpayment_rate": installment_plan["down_payment_rate"],
                    "installment_monthly_due": installment_monthly_due,
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
        record_billing_audit_event(
            "Invoice Creation Failed",
            {
                "invoiceType": data.get("invoiceType") or data.get("invoice_type"),
                "sourceRecordType": data.get("sourceRecordType") or data.get("source_record_type"),
                "sourceRecordId": data.get("sourceRecordId") or data.get("source_record_id"),
                "branchId": data.get("branchId") or data.get("branch_id"),
                "petName": data.get("petName") or data.get("pet_name"),
                "total": data.get("total") or data.get("totalAmount"),
            },
            actor_data=data,
            target=data.get("petName") or data.get("pet_name") or "Billing Invoice",
            summary=f"Invoice creation failed: {str(e)}",
            status="Failed",
        )
        return jsonify({"error": str(e)}), 400


def record_billing_invoice_payment(invoice_id):
    data = request.get_json() or {}

    try:
        branch_scope, branch_error = require_actor_branch_scope(data)
        if branch_error:
            return jsonify({"error": branch_error}), 400

        invoice_record = get_single_row("billing_invoices", "billing_invoice_id", invoice_id)
        if not invoice_record:
            record_billing_audit_event(
                "Payment Recording Failed",
                {"billing_invoice_id": invoice_id},
                actor_data=data,
                summary=f"Payment recording failed because invoice #{invoice_id} was not found.",
                status="Failed",
            )
            return jsonify({"error": "Invoice not found"}), 404
        _, branch_access_error = validate_branch_scope_access(
            branch_scope,
            invoice_record.get("branch_id"),
            allow_unassigned=True,
        )
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
        if invoice_record.get("payment_method") == "installment":
            installment_metadata = resolve_billing_installment_metadata(invoice_record, current_state)
            installment_months = int(installment_metadata["months"] or 0)
            contract_monthly_due = installment_metadata["monthly_due"]
            if contract_monthly_due <= 0:
                raise ValueError("Installment monthly due could not be calculated")
            remaining_terms = min(
                installment_months,
                max(1, math.ceil((current_state["remaining_balance"] - 0.005) / contract_monthly_due)),
            )
            valid_installment_amounts = {
                round(min(contract_monthly_due * term_count, current_state["remaining_balance"]), 2)
                for term_count in range(1, remaining_terms + 1)
            }
            if all(abs(payment_amount - valid_amount) > 0.01 for valid_amount in valid_installment_amounts):
                raise ValueError("Installment payment must match the monthly due or selected advance terms")

        payment_method = str(data.get("paymentMethod") or data.get("payment_method") or "").strip().lower()
        if payment_method not in {"cash", "gcash"}:
            raise ValueError("paymentMethod is invalid")
        payment_reference = get_payment_reference_from_request(data, "paymentReference", "payment_reference")
        if payment_method == "gcash" and not payment_reference:
            label = {
                "gcash": "GCash reference number",
            }.get(payment_method, "payment reference")
            raise ValueError(f"{label} is required")
        if payment_method == "gcash" and not is_billing_numeric_payment_reference(payment_reference):
            raise ValueError("GCash reference number must contain numbers only")

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

        invoice_update_payload = {
            "amount_paid": updated_state["amount_paid"],
            "remaining_balance": updated_state["remaining_balance"],
            "payment_status": updated_state["payment_status"],
        }
        supabase_admin.table("billing_invoices").update(invoice_update_payload).eq("billing_invoice_id", invoice_id).execute()

        payment_payload = {
            "billing_invoice_id": invoice_id,
            "payment_amount": payment_amount,
            "payment_method": payment_method,
            "payment_date": manila_now.date().isoformat(),
            "payment_time": manila_now.strftime("%H:%M:%S"),
            "payment_reference": payment_reference or None,
            "notes": payment_note or None,
            "created_by": payment_actor_id,
        }
        insert_billing_payment_record(payment_payload)

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
                "paymentStatusBefore": current_state["payment_status"],
                "paymentStatusAfter": updated_state["payment_status"],
            },
        )
        payment_event = (
            "Installment Payment Recorded"
            if invoice_record.get("payment_method") == "installment"
            else "Invoice Payment Recorded"
        )
        record_billing_audit_event(
            payment_event,
            normalized_invoice,
            actor_data=data,
            summary=(
                f"Payment of {format_audit_money(payment_amount)} was recorded for invoice "
                f"{normalized_invoice.get('invoiceNumber')}. Remaining balance: "
                f"{format_audit_money(updated_state['remaining_balance'])}."
            ),
            status="Success",
            metadata={
                "payment_amount": payment_amount,
                "payment_method": payment_method,
                "payment_reference": payment_reference,
                "previous_amount_paid": current_amount_paid,
                "new_amount_paid": updated_state["amount_paid"],
                "remaining_balance": updated_state["remaining_balance"],
            },
        )
        if updated_state["payment_status"] == "paid" and current_state["payment_status"] != "paid":
            record_billing_audit_event(
                "Invoice Fully Paid",
                normalized_invoice,
                actor_data=data,
                summary=f"Invoice {normalized_invoice.get('invoiceNumber')} was fully paid.",
                status="Success",
                metadata={
                    "payment_amount": payment_amount,
                    "total_amount": total_amount,
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
        record_billing_audit_event(
            "Payment Recording Failed",
            {"billing_invoice_id": invoice_id},
            actor_data=data,
            summary=f"Payment recording failed: {str(e)}",
            status="Failed",
        )
        return jsonify({"error": str(e)}), 400


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

        invoice_rows = execute_with_retry(
            lambda: supabase_admin.table("billing_invoices").select("*").in_("billing_invoice_id", parsed_ids).execute(),
            context="Fetch billing invoices for delete audit",
        ).data or []
        for invoice in invoice_rows:
            _, branch_access_error = validate_branch_scope_access(
                branch_scope,
                invoice.get("branch_id"),
                allow_unassigned=True,
            )
            if branch_access_error:
                return jsonify({"error": branch_access_error}), 403

        supabase_admin.table("billing_invoices").delete().in_("billing_invoice_id", parsed_ids).execute()
        for invoice in invoice_rows:
            safe_create_billing_admin_notification(
                invoice_record=invoice,
                event_type='invoice_deleted',
                title='Invoice deleted',
                action_text='was deleted',
                severity='warning',
                link='/billing',
            )
        if len(parsed_ids) == 1 and invoice_rows:
            invoice = invoice_rows[0]
            record_billing_audit_event(
                "Invoice Deleted",
                invoice,
                actor_data=data,
                summary=f"Invoice {invoice.get('invoice_number')} for {invoice.get('pet_name') or 'this pet'} was deleted.",
                status="Warning",
                metadata={"deleted_invoice_ids": parsed_ids},
            )
        else:
            invoice_numbers = [row.get("invoice_number") for row in invoice_rows if row.get("invoice_number")]
            record_billing_audit_event(
                "Bulk Invoice Deleted",
                {},
                actor_data=data,
                target=f"{len(parsed_ids)} Billing Invoices",
                target_type="billing_invoice_bulk",
                target_id=None,
                summary=f"{len(parsed_ids)} billing invoice(s) were deleted.",
                status="Warning",
                metadata={
                    "deleted_invoice_ids": parsed_ids,
                    "invoice_numbers": invoice_numbers,
                },
            )
        return jsonify({"message": "Invoices deleted successfully"}), 200
    except Exception as e:
        if is_missing_relation_error(e, "billing_invoices"):
            return jsonify({"error": BILLING_TABLES_SETUP_MESSAGE}), 400
        print("Delete billing invoices error:", str(e))
        record_billing_audit_event(
            "Invoice Delete Failed",
            {},
            actor_data=data,
            target="Billing Invoices",
            target_type="billing_invoice_bulk",
            target_id=None,
            summary=f"Invoice delete failed: {str(e)}",
            status="Failed",
            metadata={"requested_invoice_ids": data.get("invoiceIds", data.get("invoice_ids"))},
        )
        return jsonify({"error": str(e)}), 400



