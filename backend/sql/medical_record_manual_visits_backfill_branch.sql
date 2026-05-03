-- Backfill branch_id for old manual EMR visits when the branch can be inferred safely.
-- This only updates records whose pet has appointments in exactly one branch.
-- Rows for pets with no appointment history or multiple branch histories stay NULL for manual review.

with single_branch_medical_records as (
  select
    mr.medical_record_id,
    min(a.branch_id) as branch_id,
    count(distinct a.branch_id) as branch_count
  from public.medical_records mr
  join public.appointments a
    on a.pet_id = mr.pet_id
  where a.branch_id is not null
  group by mr.medical_record_id
)
update public.medical_record_visits v
set branch_id = s.branch_id
from single_branch_medical_records s
where v.medical_record_id = s.medical_record_id
  and v.branch_id is null
  and s.branch_count = 1;

-- Check what is still unresolved after the safe backfill.
select
  v.medical_record_visit_id,
  v.medical_record_id,
  mr.pet_id,
  v.source_type,
  v.source_id,
  v.visit_date,
  v.branch_id,
  count(distinct a.branch_id) as appointment_branch_count,
  array_remove(array_agg(distinct a.branch_id), null) as appointment_branch_ids
from public.medical_record_visits v
left join public.medical_records mr
  on mr.medical_record_id = v.medical_record_id
left join public.appointments a
  on a.pet_id = mr.pet_id
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
