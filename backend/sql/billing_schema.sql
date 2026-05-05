-- Billing schema for PawRang
-- Run this after your core clinic tables already exist.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.billing_services (
  billing_service_id bigserial primary key,
  service_code text not null unique,
  service_name text not null unique,
  service_category text not null,
  service_subcategory text null,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  description text null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_billing_services_active on public.billing_services(is_active);
create index if not exists idx_billing_services_category on public.billing_services(service_category, service_name);

drop trigger if exists trg_billing_services_updated_at on public.billing_services;
create trigger trg_billing_services_updated_at
before update on public.billing_services
for each row
execute function public.set_updated_at();

create table if not exists public.billing_invoices (
  billing_invoice_id bigserial primary key,
  invoice_number text not null unique,
  invoice_type text not null check (invoice_type in ('appointment', 'walkin')),
  source_record_type text null check (source_record_type in ('appointment', 'walkin', 'visit')),
  source_record_id bigint null,
  branch_id bigint null references public.branches(branch_id),
  customer_name text not null,
  customer_email text null,
  customer_phone text null,
  pet_name text not null,
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  tax_rate numeric(6, 4) not null default 0.12 check (tax_rate >= 0),
  tax_amount numeric(12, 2) not null default 0 check (tax_amount >= 0),
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  discount_type text null,
  discount_value numeric(12, 2) null,
  discount_is_percentage boolean null,
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  amount_paid numeric(12, 2) not null default 0 check (amount_paid >= 0),
  remaining_balance numeric(12, 2) not null default 0 check (remaining_balance >= 0),
  installment_months integer null check (installment_months is null or installment_months in (3, 6, 9)),
  installment_interest_rate numeric(6, 4) not null default 0 check (installment_interest_rate >= 0),
  installment_interest_amount numeric(12, 2) not null default 0 check (installment_interest_amount >= 0),
  installment_monthly_due numeric(12, 2) not null default 0 check (installment_monthly_due >= 0),
  payment_method text not null check (payment_method in ('cash', 'gcash', 'installment')),
  payment_status text not null check (payment_status in ('paid', 'pending', 'partial')),
  status text not null default 'completed' check (status in ('completed', 'cancelled', 'refunded')),
  notes text null,
  invoice_date date not null default current_date,
  invoice_time time not null default localtime,
  created_by uuid null references public.employee_accounts(id),
  updated_by uuid null references public.employee_accounts(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_billing_invoices_date on public.billing_invoices(invoice_date desc);
create index if not exists idx_billing_invoices_type on public.billing_invoices(invoice_type, payment_status);
create index if not exists idx_billing_invoices_source on public.billing_invoices(source_record_type, source_record_id);

drop trigger if exists trg_billing_invoices_updated_at on public.billing_invoices;
create trigger trg_billing_invoices_updated_at
before update on public.billing_invoices
for each row
execute function public.set_updated_at();

create table if not exists public.billing_invoice_service_items (
  billing_invoice_service_item_id bigserial primary key,
  billing_invoice_id bigint not null references public.billing_invoices(billing_invoice_id) on delete cascade,
  billing_service_id bigint null references public.billing_services(billing_service_id),
  item_name text not null,
  item_description text null,
  item_category text null,
  item_subcategory text null,
  quantity integer not null check (quantity >= 1),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  sort_order integer not null default 1,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_billing_invoice_service_items_invoice on public.billing_invoice_service_items(billing_invoice_id, sort_order);

create table if not exists public.billing_invoice_product_items (
  billing_invoice_product_item_id bigserial primary key,
  billing_invoice_id bigint not null references public.billing_invoices(billing_invoice_id) on delete cascade,
  inventory_item_id bigint null references public.inventory_items(inventory_item_id),
  item_name text not null,
  sku text null,
  item_description text null,
  item_category text null,
  quantity integer not null check (quantity >= 1),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  sort_order integer not null default 1,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_billing_invoice_product_items_invoice on public.billing_invoice_product_items(billing_invoice_id, sort_order);

create table if not exists public.billing_invoice_payments (
  billing_invoice_payment_id bigserial primary key,
  billing_invoice_id bigint not null references public.billing_invoices(billing_invoice_id) on delete cascade,
  payment_amount numeric(12, 2) not null check (payment_amount > 0),
  payment_method text not null check (payment_method in ('cash', 'gcash')),
  payment_reference text null,
  payment_date date not null default current_date,
  payment_time time not null default localtime,
  notes text null,
  created_by uuid null references public.employee_accounts(id),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_billing_invoice_payments_invoice on public.billing_invoice_payments(billing_invoice_id, payment_date desc, payment_time desc);

insert into public.billing_services (
  service_code,
  service_name,
  service_category,
  service_subcategory,
  unit_price,
  description
)
values
  ('GROOM-BASIC', 'Basic Grooming', 'Grooming', 'Pet Grooming', 500.00, 'Bath, brush, nail trim'),
  ('GROOM-FULL', 'Full Grooming', 'Grooming', 'Pet Grooming', 800.00, 'Bath, haircut, nail trim, ear cleaning'),
  ('GROOM-DELUXE', 'Deluxe Grooming', 'Grooming', 'Pet Grooming', 1200.00, 'Full grooming plus teeth brushing and perfume'),
  ('GROOM-NAIL', 'Nail Trim Only', 'Grooming', 'Pet Grooming', 200.00, 'Nail clipping and filing'),
  ('GROOM-BATH', 'Bath Only', 'Grooming', 'Pet Grooming', 300.00, 'Shampoo, conditioner, blow dry'),
  ('CONSULT-CHECKUP', 'Consultation & Check-Up', 'Consultation', 'Consultation & Check-Up', 500.00, 'Preventative service to assess your pet''s overall health'),
  ('DENTAL-PROPHY', 'Dental Prophylaxis', 'Dental', 'Dental Prophylaxis', 800.00, 'Teeth cleaning, plaque removal, oral health check'),
  ('BOARDING', 'Pet Boarding', 'Boarding', 'Pet Boarding', 1200.00, 'Overnight stay, feeding, supervision'),
  ('CONFINEMENT', 'Confinement', 'Confinement', 'Confinement', 2500.00, 'Medical care, monitoring, IV fluids, medication'),
  ('XRAY', 'X-Ray', 'Diagnostics', 'Imaging', 1500.00, 'Radiography for bone, chest, abdominal imaging'),
  ('ULTRASOUND', 'Ultrasound', 'Diagnostics', 'Imaging', 2000.00, 'Soft tissue, abdominal, cardiac, pregnancy check'),
  ('LAB-CBC', 'Complete Blood Count', 'Diagnostics', 'Laboratory Tests', 800.00, 'CBC with differential'),
  ('LAB-CHEM', 'Blood Chemistry', 'Diagnostics', 'Laboratory Tests', 1200.00, 'Liver, kidney, glucose levels'),
  ('LAB-URINALYSIS', 'Urinalysis', 'Diagnostics', 'Laboratory Tests', 400.00, 'Complete urine analysis'),
  ('LAB-FECAL', 'Fecal Examination', 'Diagnostics', 'Laboratory Tests', 350.00, 'Parasite and bacteria check'),
  ('VACCINATIONS', 'Vaccinations', 'Vaccinations', 'Vaccinations', 1200.00, 'Core vaccines, boosters, rabies shot')
on conflict (service_code) do update
set
  service_name = excluded.service_name,
  service_category = excluded.service_category,
  service_subcategory = excluded.service_subcategory,
  unit_price = excluded.unit_price,
  description = excluded.description,
  is_active = true,
  updated_at = timezone('utc', now());
