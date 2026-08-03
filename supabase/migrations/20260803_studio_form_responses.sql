create table if not exists public.studio_form_responses (
  id uuid primary key default gen_random_uuid(),
  app_id text not null,
  manage_hash text not null check (char_length(manage_hash) = 16),
  form_id text not null,
  form_title text not null default 'Formulário',
  user_email text,
  user_name text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists studio_form_responses_app_hash_created_idx
  on public.studio_form_responses (app_id, manage_hash, created_at desc);

alter table public.studio_form_responses enable row level security;
revoke all on table public.studio_form_responses from anon, authenticated;
grant all on table public.studio_form_responses to service_role;
