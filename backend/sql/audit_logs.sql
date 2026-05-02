-- System audit log schema for PawRang / PetShield
-- Run this in the Supabase SQL editor before using the System Audit page.

create extension if not exists pgcrypto;

create table if not exists public.audit_logs (
  audit_log_id bigserial primary key,
  module text not null,
  event text not null,
  actor text not null,
  actor_account_id uuid null,
  actor_account_type text null check (
    actor_account_type is null
    or actor_account_type in ('employee', 'patient', 'system', 'unknown')
  ),
  actor_role text not null default 'System',
  target text not null default 'System',
  target_type text null,
  target_id text null,
  summary text not null default '',
  status text not null default 'Success' check (status in ('Success', 'Warning', 'Failed')),
  branch_id bigint null references public.branches(branch_id),
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet null,
  user_agent text null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_audit_logs_created_at
  on public.audit_logs (created_at desc);

create index if not exists idx_audit_logs_module_created
  on public.audit_logs (module, created_at desc);

create index if not exists idx_audit_logs_status_created
  on public.audit_logs (status, created_at desc);

create index if not exists idx_audit_logs_actor_account
  on public.audit_logs (actor_account_id, created_at desc);

create index if not exists idx_audit_logs_role_created
  on public.audit_logs (actor_role, created_at desc);

create index if not exists idx_audit_logs_search
  on public.audit_logs using gin (
    to_tsvector(
      'simple',
      coalesce(module, '') || ' ' ||
      coalesce(event, '') || ' ' ||
      coalesce(actor, '') || ' ' ||
      coalesce(actor_role, '') || ' ' ||
      coalesce(target, '') || ' ' ||
      coalesce(summary, '')
    )
  );

comment on table public.audit_logs is 'Central audit trail for authentication, account, appointment, settings, inventory, EMR, and billing actions.';
comment on column public.audit_logs.module is 'UI grouping such as Authentication, Settings, Inventory, EMR, or Billing.';
comment on column public.audit_logs.event is 'Short human-readable action name, for example Login Successful or Service Price Changed.';
comment on column public.audit_logs.actor is 'Display name or username responsible for the event.';
comment on column public.audit_logs.actor_account_id is 'Optional Supabase auth/profile UUID for the actor.';
comment on column public.audit_logs.actor_role is 'Normalized role label shown in the audit UI.';
comment on column public.audit_logs.target is 'Record, screen, pet, invoice, appointment, or setting affected by the event.';
