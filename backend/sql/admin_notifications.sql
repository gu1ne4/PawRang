-- Admin notifications schema for shared module notifications with per-admin read state.
-- If you need a clean rerun:
-- drop table if exists public.admin_notification_reads cascade;
-- drop table if exists public.admin_notifications cascade;

create extension if not exists pgcrypto;

create table if not exists public.admin_notifications (
  notification_id bigserial primary key,
  branch_id bigint not null references public.branches(branch_id),
  module text not null default 'inventory' check (module in ('inventory')),
  event_type text not null,
  severity text not null default 'info' check (severity in ('info', 'success', 'warning', 'error')),
  title text not null,
  message text not null,
  link text null,
  actor_id uuid null references public.employee_accounts(id),
  entity_type text null,
  entity_id bigint null,
  event_key text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_admin_notifications_branch_created
  on public.admin_notifications(branch_id, created_at desc);

create index if not exists idx_admin_notifications_module_created
  on public.admin_notifications(module, created_at desc);

create index if not exists idx_admin_notifications_event_type
  on public.admin_notifications(event_type);

create index if not exists idx_admin_notifications_actor
  on public.admin_notifications(actor_id);

create index if not exists idx_admin_notifications_event_key
  on public.admin_notifications(event_key)
  where event_key is not null;

create index if not exists idx_admin_notifications_metadata
  on public.admin_notifications
  using gin (metadata);

create table if not exists public.admin_notification_reads (
  notification_id bigint not null references public.admin_notifications(notification_id) on delete cascade,
  admin_user_id uuid not null references public.employee_accounts(id) on delete cascade,
  read_at timestamptz not null default timezone('utc', now()),
  primary key (notification_id, admin_user_id)
);

create index if not exists idx_admin_notification_reads_admin
  on public.admin_notification_reads(admin_user_id, read_at desc);

comment on table public.admin_notifications is 'Shared admin-facing notifications for operational modules such as inventory.';
comment on table public.admin_notification_reads is 'Per-admin read receipts for shared admin notifications.';
