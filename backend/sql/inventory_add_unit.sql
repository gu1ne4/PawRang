alter table public.inventory_items
add column if not exists unit text;

update public.inventory_items
set unit = 'Piece'
where unit is null or btrim(unit) = '';

alter table public.inventory_items
alter column unit set default 'Piece';

alter table public.inventory_items
alter column unit set not null;

create or replace view public.inventory_logs_view as
select
  iti.inventory_transaction_item_id as id,
  to_char(it.transaction_timestamp at time zone 'UTC', 'YYYY-MM-DD') as date,
  to_char(it.transaction_timestamp at time zone 'UTC', 'HH24:MI:SS') as time,
  ii.item_code as "productCode",
  ii.item_name as "productName",
  it.transaction_type as type,
  iti.quantity,
  it.reference_number as "referenceNumber",
  it.reason,
  coalesce(it.counterparty_name, 'N/A') as "supplierOrIssuedTo",
  trim(
    coalesce(ea.first_name, '') || ' ' || coalesce(ea.last_name, '')
  ) as "user",
  coalesce(it.notes, '') as notes,
  case
    when it.transaction_type = 'IN' then iti.unit_cost
    else iti.unit_price
  end as "unitCost",
  iti.line_total as "totalCost",
  it.branch_id,
  ii.inventory_item_id,
  ii.unit as unit
from public.inventory_transaction_items iti
join public.inventory_transactions it
  on it.inventory_transaction_id = iti.inventory_transaction_id
join public.inventory_items ii
  on ii.inventory_item_id = iti.inventory_item_id
left join public.employee_accounts ea
  on ea.id = it.processed_by;
