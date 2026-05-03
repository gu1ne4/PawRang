-- Assign remaining unresolved old manual EMR visits to the Taguig branch.
-- Use this only after confirming these legacy manual visits should belong to Taguig.

-- First result: confirm which branch row will be used.
-- The app maps branch_id 1 to Taguig. If the branch name does not contain
-- "taguig", this script falls back to branch_id 1.
select branch_id, branch_name
from public.branches
where lower(branch_name) like '%taguig%'
   or branch_id = 1
order by branch_id;

with taguig_branch as (
  select branch_id
  from public.branches
  where lower(branch_name) like '%taguig%'
     or branch_id = 1
  order by case when lower(branch_name) like '%taguig%' then 0 else 1 end, branch_id
  limit 1
)
update public.medical_record_visits v
set branch_id = (select branch_id from taguig_branch)
where v.branch_id is null
  and lower(coalesce(v.source_type, '')) = 'manual'
  and exists (select 1 from taguig_branch);

-- Confirm what remains unresolved.
select medical_record_visit_id, medical_record_id, source_type, source_id, visit_date, branch_id
from public.medical_record_visits
where branch_id is null
order by visit_date desc, medical_record_visit_id desc;

notify pgrst, 'reload schema';
