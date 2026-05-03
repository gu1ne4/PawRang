-- Resolve ambiguous old manual EMR visits by matching the visit date to the pet's appointment date.
-- This is safer than assigning by pet history alone because some pets have appointments in both branches.
-- It only updates when all appointments for that pet on the same date belong to exactly one branch.

with same_date_single_branch as (
  select
    v.medical_record_visit_id,
    min(a.branch_id) as branch_id,
    count(distinct a.branch_id) as branch_count
  from public.medical_record_visits v
  join public.medical_records mr
    on mr.medical_record_id = v.medical_record_id
  join public.appointments a
    on a.pet_id = mr.pet_id
   and a.appointment_date = v.visit_date
  where v.branch_id is null
    and a.branch_id is not null
  group by v.medical_record_visit_id
)
update public.medical_record_visits v
set branch_id = s.branch_id
from same_date_single_branch s
where v.medical_record_visit_id = s.medical_record_visit_id
  and v.branch_id is null
  and s.branch_count = 1;

-- Preview any rows that still need a manual branch choice.
select
  v.medical_record_visit_id,
  v.medical_record_id,
  mr.pet_id,
  v.source_type,
  v.source_id,
  v.visit_date,
  v.branch_id,
  array_remove(array_agg(distinct a.branch_id), null) as same_date_branch_ids,
  string_agg(
    distinct concat(
      'appointment_id=', a.appointment_id,
      ', branch_id=', a.branch_id,
      ', date=', a.appointment_date,
      ', time=', coalesce(a.appointment_time::text, '')
    ),
    ' | '
  ) filter (where a.appointment_id is not null) as same_date_appointments
from public.medical_record_visits v
left join public.medical_records mr
  on mr.medical_record_id = v.medical_record_id
left join public.appointments a
  on a.pet_id = mr.pet_id
 and a.appointment_date = v.visit_date
where v.branch_id is null
group by
  v.medical_record_visit_id,
  v.medical_record_id,
  mr.pet_id,
  v.source_type,
  v.source_id,
  v.visit_date,
  v.branch_id
order by v.visit_date desc, v.medical_record_visit_id desc;

notify pgrst, 'reload schema';
