alter table public.special_dates
add column if not exists event_description text;

alter table public.special_dates
add column if not exists event_recurrence text not null default 'once';

alter table public.special_dates
add column if not exists event_month smallint;

alter table public.special_dates
add column if not exists event_day smallint;

alter table public.special_dates
add column if not exists special_date_id bigint;

create sequence if not exists public.special_dates_special_date_id_seq;

alter sequence public.special_dates_special_date_id_seq
owned by public.special_dates.special_date_id;

alter table public.special_dates
alter column special_date_id set default nextval('public.special_dates_special_date_id_seq');

select setval(
  'public.special_dates_special_date_id_seq',
  greatest(coalesce((select max(special_date_id) from public.special_dates), 0), 1),
  true
);

update public.special_dates
set special_date_id = nextval('public.special_dates_special_date_id_seq')
where special_date_id is null;

update public.special_dates
set
  event_recurrence = coalesce(event_recurrence, 'once'),
  event_month = coalesce(event_month, extract(month from event_date)::smallint),
  event_day = coalesce(event_day, extract(day from event_date)::smallint)
where event_date is not null;

do $$
declare
  pk_name text;
begin
  select c.conname
  into pk_name
  from pg_constraint c
  join pg_attribute a
    on a.attrelid = c.conrelid
   and a.attnum = any(c.conkey)
  where c.conrelid = 'public.special_dates'::regclass
    and c.contype = 'p'
    and a.attname = 'event_date'
  limit 1;

  if pk_name is not null then
    execute format('alter table public.special_dates drop constraint %I', pk_name);
  end if;
end $$;

alter table public.special_dates
alter column special_date_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.special_dates'::regclass
      and contype = 'p'
  ) then
    alter table public.special_dates
    add constraint special_dates_pkey primary key (special_date_id);
  end if;
end $$;

alter table public.special_dates
alter column event_date drop not null;

alter table public.special_dates
drop constraint if exists special_dates_recurrence_check;

alter table public.special_dates
add constraint special_dates_recurrence_check
check (event_recurrence in ('once', 'annual'));

alter table public.special_dates
drop constraint if exists special_dates_date_shape_check;

alter table public.special_dates
add constraint special_dates_date_shape_check
check (
  (
    event_recurrence = 'once'
    and event_date is not null
  )
  or
  (
    event_recurrence = 'annual'
    and event_month is not null
    and event_day is not null
  )
);

create unique index if not exists idx_special_dates_once_date
on public.special_dates (event_date)
where event_recurrence = 'once' and event_date is not null;

create unique index if not exists idx_special_dates_annual_day
on public.special_dates (event_month, event_day)
where event_recurrence = 'annual';
