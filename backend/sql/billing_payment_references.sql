alter table if exists public.billing_invoice_payments
add column if not exists payment_reference text null;

