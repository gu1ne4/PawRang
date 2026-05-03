create table if not exists ai_generated_summaries (
  summary_id bigserial primary key,
  record_type text not null check (record_type in ('appointment', 'walkin')),
  target_id bigint not null,
  summary_type text not null default 'admin_appointment',
  summary_payload jsonb not null,
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (record_type, target_id, summary_type)
);

create index if not exists idx_ai_generated_summaries_target
  on ai_generated_summaries (record_type, target_id, summary_type);
