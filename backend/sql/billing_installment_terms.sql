alter table if exists public.billing_invoices
add column if not exists installment_months integer null;

alter table if exists public.billing_invoices
add column if not exists installment_interest_rate numeric(6, 4) not null default 0;

alter table if exists public.billing_invoices
add column if not exists installment_interest_amount numeric(12, 2) not null default 0;

alter table if exists public.billing_invoices
add column if not exists installment_monthly_due numeric(12, 2) not null default 0;

alter table if exists public.billing_invoices
drop constraint if exists billing_invoices_installment_months_check;

alter table if exists public.billing_invoices
add constraint billing_invoices_installment_months_check
check (installment_months is null or installment_months in (3, 6, 9));

alter table if exists public.billing_invoices
drop constraint if exists billing_invoices_installment_interest_rate_check;

alter table if exists public.billing_invoices
add constraint billing_invoices_installment_interest_rate_check
check (installment_interest_rate >= 0);

alter table if exists public.billing_invoices
drop constraint if exists billing_invoices_installment_interest_amount_check;

alter table if exists public.billing_invoices
add constraint billing_invoices_installment_interest_amount_check
check (installment_interest_amount >= 0);

alter table if exists public.billing_invoices
drop constraint if exists billing_invoices_installment_monthly_due_check;

alter table if exists public.billing_invoices
add constraint billing_invoices_installment_monthly_due_check
check (installment_monthly_due >= 0);

alter table if exists public.billing_invoices
drop constraint if exists billing_invoices_payment_method_check;

alter table if exists public.billing_invoices
add constraint billing_invoices_payment_method_check
check (payment_method in ('cash', 'gcash', 'installment')) not valid;

alter table if exists public.billing_invoice_payments
drop constraint if exists billing_invoice_payments_payment_method_check;

alter table if exists public.billing_invoice_payments
add constraint billing_invoice_payments_payment_method_check
check (payment_method in ('cash', 'gcash')) not valid;
