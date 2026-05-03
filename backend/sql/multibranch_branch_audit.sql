-- Multi-branch audit queries.
-- Run this after the branch migrations to find old records that still need a branch_id.
-- These queries are read-only.

-- 1) Summary: rows with missing branch_id.
select 'employee_accounts' as table_name, count(*) as missing_branch_id
from public.employee_accounts
where branch_id is null
union all
select 'appointments' as table_name, count(*) as missing_branch_id
from public.appointments
where branch_id is null
union all
select 'walkin_appointments' as table_name, count(*) as missing_branch_id
from public.walkin_appointments
where branch_id is null
union all
select 'admin_notifications' as table_name, count(*) as missing_branch_id
from public.admin_notifications
where branch_id is null
union all
select 'inventory_items' as table_name, count(*) as missing_branch_id
from public.inventory_items
where branch_id is null
union all
select 'inventory_transactions' as table_name, count(*) as missing_branch_id
from public.inventory_transactions
where branch_id is null
union all
select 'billing_invoices' as table_name, count(*) as missing_branch_id
from public.billing_invoices
where branch_id is null
union all
select 'medical_record_visits' as table_name, count(*) as missing_branch_id
from public.medical_record_visits
where branch_id is null
order by table_name;

-- 2) Summary: rows with branch_id values that do not exist in public.branches.
select 'employee_accounts' as table_name, count(*) as invalid_branch_id
from public.employee_accounts t
left join public.branches b on b.branch_id = t.branch_id
where t.branch_id is not null and b.branch_id is null
union all
select 'appointments' as table_name, count(*) as invalid_branch_id
from public.appointments t
left join public.branches b on b.branch_id = t.branch_id
where t.branch_id is not null and b.branch_id is null
union all
select 'walkin_appointments' as table_name, count(*) as invalid_branch_id
from public.walkin_appointments t
left join public.branches b on b.branch_id = t.branch_id
where t.branch_id is not null and b.branch_id is null
union all
select 'admin_notifications' as table_name, count(*) as invalid_branch_id
from public.admin_notifications t
left join public.branches b on b.branch_id = t.branch_id
where t.branch_id is not null and b.branch_id is null
union all
select 'inventory_items' as table_name, count(*) as invalid_branch_id
from public.inventory_items t
left join public.branches b on b.branch_id = t.branch_id
where t.branch_id is not null and b.branch_id is null
union all
select 'inventory_transactions' as table_name, count(*) as invalid_branch_id
from public.inventory_transactions t
left join public.branches b on b.branch_id = t.branch_id
where t.branch_id is not null and b.branch_id is null
union all
select 'billing_invoices' as table_name, count(*) as invalid_branch_id
from public.billing_invoices t
left join public.branches b on b.branch_id = t.branch_id
where t.branch_id is not null and b.branch_id is null
union all
select 'medical_record_visits' as table_name, count(*) as invalid_branch_id
from public.medical_record_visits t
left join public.branches b on b.branch_id = t.branch_id
where t.branch_id is not null and b.branch_id is null
order by table_name;

-- 3) Detail samples: inspect up to 50 rows per table with missing branch_id.
select id, username, role, branch_id
from public.employee_accounts
where branch_id is null
limit 50;

select appointment_id, owner_id, pet_id, appointment_date, appointment_time, status, branch_id
from public.appointments
where branch_id is null
limit 50;

select walkin_id, first_name, last_name, pet_name, appointment_date, appointment_time, status, branch_id
from public.walkin_appointments
where branch_id is null
limit 50;

select notification_id, module, event_type, entity_type, entity_id, created_at, branch_id
from public.admin_notifications
where branch_id is null
limit 50;

select inventory_item_id, item_code, item_name, category, branch_id
from public.inventory_items
where branch_id is null
limit 50;

select inventory_transaction_id, transaction_type, reference_number, transaction_timestamp, branch_id
from public.inventory_transactions
where branch_id is null
limit 50;

select billing_invoice_id, invoice_number, customer_name, invoice_date, status, branch_id
from public.billing_invoices
where branch_id is null
limit 50;

select medical_record_visit_id, medical_record_id, source_type, source_id, visit_date, branch_id
from public.medical_record_visits
where branch_id is null
limit 50;
