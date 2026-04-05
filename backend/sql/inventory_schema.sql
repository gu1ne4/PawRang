-- Inventory schema for PawRang / PetShield
-- If you are rerunning this during setup, drop the existing inventory objects first:
-- drop view if exists public.inventory_logs_view;
-- drop table if exists public.inventory_transaction_items cascade;
-- drop table if exists public.inventory_transactions cascade;
-- drop table if exists public.inventory_items cascade;
-- drop function if exists public.set_updated_at();

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.inventory_items (
  inventory_item_id bigserial primary key,
  branch_id bigint not null references public.branches(branch_id),
  item_code text not null,
  item_name text not null,
  category text not null check (
    category in (
      'Pet Supplies',
      'Deworming',
      'Vitamins',
      'Food',
      'Accessories',
      'Medication'
    )
  ),
  base_price numeric(12, 2) not null check (base_price > 0),
  selling_price numeric(12, 2) not null check (selling_price > 0 and selling_price >= base_price),
  current_stock integer not null default 0 check (current_stock >= 0),
  critical_stock_level integer not null default 10 check (critical_stock_level >= 1),
  expiration_date date null,
  no_expiration boolean not null default false,
  max_quantity integer null check (max_quantity is null or max_quantity >= 1),
  use_max_quantity boolean not null default false,
  is_archived boolean not null default false,
  archived_at timestamptz null,
  archived_by uuid null references public.employee_accounts(id),
  archive_reason text null,
  stock_status text generated always as (
    case
      when current_stock = 0 then 'Critical Stock'
      when current_stock <= critical_stock_level then 'Critical Stock'
      when current_stock <= (critical_stock_level + 10) then 'Low Stock'
      when current_stock >= 50 then 'High Stock'
      else 'Average Stock'
    end
  ) stored,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid null references public.employee_accounts(id),
  updated_by uuid null references public.employee_accounts(id),
  unique (branch_id, item_code),
  check (
    (no_expiration = true and expiration_date is null)
    or (no_expiration = false)
  ),
  check (
    (use_max_quantity = false)
    or (use_max_quantity = true and max_quantity is not null)
  )
);

create index if not exists idx_inventory_items_branch on public.inventory_items(branch_id);
create index if not exists idx_inventory_items_branch_archived on public.inventory_items(branch_id, is_archived);
create index if not exists idx_inventory_items_branch_category on public.inventory_items(branch_id, category);
create index if not exists idx_inventory_items_stock_status on public.inventory_items(branch_id, stock_status);
create index if not exists idx_inventory_items_name_search on public.inventory_items using gin (to_tsvector('simple', item_name || ' ' || item_code));

drop trigger if exists trg_inventory_items_updated_at on public.inventory_items;
create trigger trg_inventory_items_updated_at
before update on public.inventory_items
for each row
execute function public.set_updated_at();

create table if not exists public.inventory_transactions (
  inventory_transaction_id bigserial primary key,
  branch_id bigint not null references public.branches(branch_id),
  transaction_type text not null check (
    transaction_type in ('IN', 'OUT', 'ADJUSTMENT', 'ARCHIVE', 'RESTORE')
  ),
  reference_number text not null,
  reason text not null,
  counterparty_name text null,
  notes text null,
  total_amount numeric(12, 2) not null default 0,
  status text not null default 'posted' check (status in ('draft', 'posted', 'void')),
  processed_by uuid null references public.employee_accounts(id),
  transaction_timestamp timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, reference_number)
);

create index if not exists idx_inventory_transactions_branch on public.inventory_transactions(branch_id);
create index if not exists idx_inventory_transactions_type on public.inventory_transactions(branch_id, transaction_type);
create index if not exists idx_inventory_transactions_timestamp on public.inventory_transactions(transaction_timestamp desc);

drop trigger if exists trg_inventory_transactions_updated_at on public.inventory_transactions;
create trigger trg_inventory_transactions_updated_at
before update on public.inventory_transactions
for each row
execute function public.set_updated_at();

create table if not exists public.inventory_transaction_items (
  inventory_transaction_item_id bigserial primary key,
  inventory_transaction_id bigint not null references public.inventory_transactions(inventory_transaction_id) on delete cascade,
  inventory_item_id bigint not null references public.inventory_items(inventory_item_id),
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12, 2) null check (unit_cost is null or unit_cost >= 0),
  unit_price numeric(12, 2) null check (unit_price is null or unit_price >= 0),
  line_total numeric(12, 2) generated always as (
    quantity * coalesce(unit_price, unit_cost, 0)
  ) stored,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_inventory_transaction_items_tx on public.inventory_transaction_items(inventory_transaction_id);
create index if not exists idx_inventory_transaction_items_item on public.inventory_transaction_items(inventory_item_id);

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
  ii.inventory_item_id
from public.inventory_transaction_items iti
join public.inventory_transactions it
  on it.inventory_transaction_id = iti.inventory_transaction_id
join public.inventory_items ii
  on ii.inventory_item_id = iti.inventory_item_id
left join public.employee_accounts ea
  on ea.id = it.processed_by;

comment on table public.inventory_items is 'Master inventory table for products tracked per branch.';
comment on table public.inventory_transactions is 'Header record for stock in, stock out, archive, restore, and adjustment events.';
comment on table public.inventory_transaction_items is 'Line items attached to inventory transaction headers.';
comment on view public.inventory_logs_view is 'UI-friendly inventory log projection that mirrors the current frontend log fields.';
