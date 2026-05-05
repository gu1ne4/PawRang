alter table if exists public.billing_invoices
drop constraint if exists billing_invoices_payment_method_check;

alter table if exists public.billing_invoices
add constraint billing_invoices_payment_method_check
check (payment_method in ('cash', 'gcash', 'installment')) not valid;
