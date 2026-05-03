alter table public.employee_accounts
  add column if not exists branch_id bigint null references public.branches(branch_id);

create index if not exists idx_employee_accounts_branch
  on public.employee_accounts(branch_id);

insert into public.branches (branch_name)
select 'Both Branches'
where not exists (
  select 1
  from public.branches
  where branch_name ilike '%both%'
     or branch_name ilike '%main%'
     or branch_name ilike '%all branches%'
);

update public.employee_accounts
set branch_id = (
  select branch_id
  from public.branches
  where branch_name ilike '%taguig%'
  order by branch_id
  limit 1
)
where lower(coalesce(username, '')) = 'jjdoe';

update public.employee_accounts
set branch_id = (
  select branch_id
  from public.branches
  where branch_name ilike '%both%'
     or branch_name ilike '%main%'
     or branch_name ilike '%all branches%'
  order by branch_id
  limit 1
)
where lower(coalesce(role, '')) = 'admin'
  and branch_id is null;

notify pgrst, 'reload schema';
