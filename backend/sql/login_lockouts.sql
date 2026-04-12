create table if not exists public.login_lockouts (
    account_id uuid primary key,
    email text,
    username text,
    failed_attempts integer not null default 0,
    lockout_count integer not null default 0,
    locked_until timestamptz null,
    last_failed_at timestamptz null,
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists login_lockouts_email_idx
    on public.login_lockouts (email);

create index if not exists login_lockouts_username_idx
    on public.login_lockouts (username);
