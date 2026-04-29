alter table public.medical_information
add column if not exists reported_symptoms jsonb not null default '[]'::jsonb;

alter table public.medical_information
add column if not exists owner_symptom_notes text;

alter table public.medical_information
add column if not exists symptom_duration text;

alter table public.medical_information
add column if not exists eating_status text;

alter table public.medical_information
add column if not exists drinking_status text;

alter table public.medical_information
add column if not exists worsening_status text;

alter table public.medical_information
add column if not exists ai_symptom_summary text;
