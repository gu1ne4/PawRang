-- Manual assignment helper for old EMR visits that still have branch_id = NULL.
-- Use this only for rows that could not be inferred by:
-- 1) medical_record_manual_visits_backfill_branch.sql
-- 2) medical_record_manual_visits_resolve_by_visit_date.sql

-- Check branch IDs before assigning.
select branch_id, branch_name
from public.branches
order by branch_id;

-- Review each unresolved visit with that pet's appointment history.
select
  v.medical_record_visit_id,
  v.medical_record_id,
  mr.pet_id,
  v.source_type,
  v.source_id,
  v.visit_date,
  v.branch_id,
  history.appointments as pet_appointment_history
from public.medical_record_visits v
left join public.medical_records mr
  on mr.medical_record_id = v.medical_record_id
left join lateral (
  select jsonb_agg(
    jsonb_build_object(
      'appointment_id', a.appointment_id,
      'branch_id', a.branch_id,
      'appointment_date', a.appointment_date,
      'appointment_time', a.appointment_time,
      'status', a.status
    )
    order by a.appointment_date desc, a.appointment_time desc
  ) as appointments
  from public.appointments a
  where a.pet_id = mr.pet_id
) history on true
where v.branch_id is null
order by v.visit_date desc, v.medical_record_visit_id desc;

-- After reviewing the branch_id for each row, edit the branch_id values below.
-- Delete any WHEN line you are not ready to assign.
/*
update public.medical_record_visits as v
set branch_id = case v.medical_record_visit_id
  when 125 then 1
  when 116 then 1
  when 124 then 1
  when 123 then 1
  when 122 then 1
  when 120 then 1
  when 119 then 1
  when 118 then 1
  when 3 then 1
  else v.branch_id
end
where v.medical_record_visit_id in (125, 116, 124, 123, 122, 120, 119, 118, 3);
*/

-- Confirm what remains unresolved.
select medical_record_visit_id, medical_record_id, source_type, source_id, visit_date, branch_id
from public.medical_record_visits
where branch_id is null
order by visit_date desc, medical_record_visit_id desc;

notify pgrst, 'reload schema';
