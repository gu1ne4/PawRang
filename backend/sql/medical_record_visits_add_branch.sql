alter table public.medical_record_visits
  add column if not exists branch_id bigint null references public.branches(branch_id);

create index if not exists idx_medical_record_visits_branch
  on public.medical_record_visits(branch_id);

update public.medical_record_visits v
set branch_id = a.branch_id
from public.appointments a
where lower(coalesce(v.source_type, '')) = 'appointment'
  and v.source_id = a.appointment_id
  and v.branch_id is null;

update public.medical_record_visits v
set branch_id = w.branch_id
from public.walkin_appointments w
where lower(coalesce(v.source_type, '')) = 'walkin'
  and v.source_id = w.walkin_id
  and v.branch_id is null;

notify pgrst, 'reload schema';
