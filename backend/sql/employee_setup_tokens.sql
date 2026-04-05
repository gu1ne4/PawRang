-- Employee first-login setup tokens
-- Run this in the Supabase SQL editor after reviewing it.

create table if not exists public.employee_setup_tokens (
  setup_token_id bigserial primary key,
  employee_id uuid not null references public.employee_accounts(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid null references public.employee_accounts(id),
  constraint employee_setup_tokens_email_check check (position('@' in email) > 1)
);

create index if not exists idx_employee_setup_tokens_employee_id
  on public.employee_setup_tokens(employee_id);

create index if not exists idx_employee_setup_tokens_expires_at
  on public.employee_setup_tokens(expires_at);

create index if not exists idx_employee_setup_tokens_used_at
  on public.employee_setup_tokens(used_at);

comment on table public.employee_setup_tokens is
  'One-time onboarding/setup tokens for employees created by admin accounts.';
