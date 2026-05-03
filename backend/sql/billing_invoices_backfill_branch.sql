-- Backfill branch_id for old billing invoices.
-- This resolves invoices from their source records first, then falls back to
-- Taguig for remaining legacy invoices if no source link exists.

-- 1) Invoices linked to appointments.
update public.billing_invoices bi
set branch_id = a.branch_id
from public.appointments a
where bi.branch_id is null
  and lower(coalesce(bi.source_record_type, bi.invoice_type, '')) = 'appointment'
  and bi.source_record_id = a.appointment_id
  and a.branch_id is not null;

-- 2) Invoices linked to walk-in appointments.
update public.billing_invoices bi
set branch_id = w.branch_id
from public.walkin_appointments w
where bi.branch_id is null
  and lower(coalesce(bi.source_record_type, bi.invoice_type, '')) = 'walkin'
  and bi.source_record_id = w.walkin_id
  and w.branch_id is not null;

-- 3) Invoices linked to EMR visits.
update public.billing_invoices bi
set branch_id = v.branch_id
from public.medical_record_visits v
where bi.branch_id is null
  and lower(coalesce(bi.source_record_type, '')) = 'visit'
  and bi.source_record_id = v.medical_record_visit_id
  and v.branch_id is not null;

-- 4) Remaining legacy invoices without usable source links: assign to Taguig.
-- The app maps branch_id 1 to Taguig, but this still prefers a branch name
-- containing "taguig" when the database has one.
with taguig_branch as (
  select branch_id
  from public.branches
  where lower(branch_name) like '%taguig%'
     or branch_id = 1
  order by case when lower(branch_name) like '%taguig%' then 0 else 1 end, branch_id
  limit 1
)
update public.billing_invoices bi
set branch_id = (select branch_id from taguig_branch)
where bi.branch_id is null
  and exists (select 1 from taguig_branch);

-- Confirm what remains unresolved.
select
  billing_invoice_id,
  invoice_number,
  invoice_type,
  source_record_type,
  source_record_id,
  customer_name,
  invoice_date,
  status,
  branch_id
from public.billing_invoices
where branch_id is null
order by invoice_date desc, billing_invoice_id desc;

notify pgrst, 'reload schema';
