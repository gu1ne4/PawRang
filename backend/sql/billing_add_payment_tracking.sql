alter table if exists public.billing_invoices
add column if not exists amount_paid numeric(12, 2) not null default 0;

alter table if exists public.billing_invoices
add column if not exists remaining_balance numeric(12, 2) not null default 0;

update public.billing_invoices
set
  amount_paid = case
    when payment_status = 'paid' then coalesce(total_amount, 0)
    else 0
  end,
  remaining_balance = case
    when payment_status = 'paid' then 0
    else greatest(coalesce(total_amount, 0), 0)
  end
where amount_paid = 0 and remaining_balance = 0;

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

alter table if exists public.billing_invoice_payments
add column if not exists payment_reference text null;

create index if not exists idx_billing_invoice_payments_invoice
on public.billing_invoice_payments(billing_invoice_id, payment_date desc, payment_time desc);
