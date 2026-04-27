alter table if exists public.billing_invoices
drop constraint if exists billing_invoices_source_record_type_check;

alter table if exists public.billing_invoices
add constraint billing_invoices_source_record_type_check
check (source_record_type in ('appointment', 'walkin', 'visit'));
