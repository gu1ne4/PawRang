"""Admin analytics overview service."""

from datetime import datetime, timedelta, date

_deps = {}
supabase_admin = None


def configure_analytics_service(**deps):
    global supabase_admin
    _deps.update(deps)
    if "supabase_admin" in deps:
        supabase_admin = deps["supabase_admin"]


def execute_with_retry(*args, **kwargs):
    callback = _deps.get("execute_with_retry")
    if not callback:
        raise RuntimeError("Analytics service dependency is not configured: execute_with_retry")
    return callback(*args, **kwargs)


def coerce_int(*args, **kwargs):
    callback = _deps.get("coerce_int")
    if not callback:
        raise RuntimeError("Analytics service dependency is not configured: coerce_int")
    return callback(*args, **kwargs)


def get_current_manila_date():
    callback = _deps.get("get_current_manila_date")
    if not callback:
        raise RuntimeError("Analytics service dependency is not configured: get_current_manila_date")
    return callback()
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
    for critical_item in critical_inventory[:5]:
        days_text = "soon" if critical_item["daysUntilOut"] >= 999 else f"in {critical_item['daysUntilOut']} days"
        stock_context = (
            f"stock is at {critical_item['stock']} unit(s), below the critical level of {critical_item['reorderPoint']}"
            if critical_item["stock"] <= critical_item["reorderPoint"]
            else f"recent movement projects stockout {days_text}"
        )
        insights.append({
            "id": f"warning-stock-{critical_item['id']}",
            "text": f"{critical_item['name']} needs inventory review because {stock_context}",
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



def get_admin_analytics_overview_response(args):
    try:
        branch_id_raw = args.get("branch_id", args.get("branchId"))
        branch_id = None
        if branch_id_raw not in (None, "", "all", "All"):
            branch_id = coerce_int(branch_id_raw, "branch_id", minimum=1)
        today = get_current_manila_date()
        start_date = parse_analytics_date(args.get("start_date", args.get("startDate")), today - timedelta(days=29))
        end_date = parse_analytics_date(args.get("end_date", args.get("endDate")), today)
        return build_admin_analytics_overview(branch_id=branch_id, start_date=start_date, end_date=end_date), 200
    except Exception as e:
        print("Admin analytics overview error:", str(e))
        return {"error": str(e)}, 400