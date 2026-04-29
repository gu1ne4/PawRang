alter table public.special_dates
add column if not exists event_description text;

alter table public.special_dates
add column if not exists event_recurrence text not null default 'once';

alter table public.special_dates
add column if not exists event_month smallint;

alter table public.special_dates
add column if not exists event_day smallint;

update public.special_dates
set
  event_recurrence = coalesce(event_recurrence, 'once'),
  event_month = coalesce(event_month, extract(month from event_date)::smallint),
  event_day = coalesce(event_day, extract(day from event_date)::smallint)
where event_date is not null;

alter table public.special_dates
alter column event_date drop not null;

alter table public.special_dates
drop constraint if exists special_dates_recurrence_check;

alter table public.special_dates
add constraint special_dates_recurrence_check
check (event_recurrence in ('once', 'annual'));

create unique index if not exists idx_special_dates_once_date
on public.special_dates (event_date)
where event_recurrence = 'once' and event_date is not null;

create unique index if not exists idx_special_dates_annual_day
on public.special_dates (event_month, event_day)
where event_recurrence = 'annual';
