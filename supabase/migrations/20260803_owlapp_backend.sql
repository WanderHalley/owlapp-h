create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.apps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  app_name text not null check (char_length(app_name) between 2 and 120),
  description text,
  category text,
  visibility text not null default 'private' check (visibility in ('private','public')),
  status text not null default 'active' check (status in ('active','inactive','archived')),
  primary_color text not null default '#7c3aed',
  secondary_color text not null default '#06b6d4',
  app_icon_url text,
  app_logo_url text,
  login_email_enabled boolean not null default true,
  require_approval boolean not null default false,
  enable_community boolean not null default true,
  enable_feed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.app_slugs (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'),
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index app_slugs_one_primary on public.app_slugs(app_id) where is_primary;

create table public.app_domains (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  domain text not null unique,
  status text not null default 'pending' check (status in ('pending','verified','failed')),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 160),
  description text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  access_type text not null default 'free' check (access_type in ('free','paid','restricted')),
  cover_image_url text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contents (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 200),
  description text,
  content_type text not null default 'video',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  is_free boolean not null default false,
  video_url text,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  text_body text,
  image_url text,
  audio_url text,
  file_url text,
  file_name text,
  embed_url text,
  embed_code text,
  quiz_url text,
  paint_bg_url text,
  thumbnail_url text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  status text not null default 'pending' check (status in ('pending','approved','blocked')),
  notes text,
  origin text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(app_id, email)
);

create table public.app_user_access (
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (app_user_id, module_id)
);

create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  subscription_tier text not null default 'basic',
  status text not null default 'active',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index apps_owner_id_idx on public.apps(owner_id);
create index app_slugs_app_id_idx on public.app_slugs(app_id);
create index app_domains_app_id_idx on public.app_domains(app_id);
create index modules_app_id_position_idx on public.modules(app_id, position);
create index contents_module_id_position_idx on public.contents(module_id, position);
create index app_users_app_id_idx on public.app_users(app_id);
create index app_user_access_module_id_idx on public.app_user_access(module_id);

create or replace function private.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''), coalesce(new.email, ''));
  insert into public.subscriptions(user_id) values (new.id);
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

create trigger profiles_updated before update on public.profiles for each row execute function private.set_updated_at();
create trigger apps_updated before update on public.apps for each row execute function private.set_updated_at();
create trigger modules_updated before update on public.modules for each row execute function private.set_updated_at();
create trigger contents_updated before update on public.contents for each row execute function private.set_updated_at();
create trigger app_users_updated before update on public.app_users for each row execute function private.set_updated_at();
create trigger subscriptions_updated before update on public.subscriptions for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.apps enable row level security;
alter table public.app_slugs enable row level security;
alter table public.app_domains enable row level security;
alter table public.modules enable row level security;
alter table public.contents enable row level security;
alter table public.app_users enable row level security;
alter table public.app_user_access enable row level security;
alter table public.subscriptions enable row level security;

create policy profiles_own on public.profiles for all to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy apps_own on public.apps for all to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy app_slugs_owner on public.app_slugs for all to authenticated
using (exists (select 1 from public.apps a where a.id = app_id and a.owner_id = (select auth.uid())))
with check (exists (select 1 from public.apps a where a.id = app_id and a.owner_id = (select auth.uid())));
create policy app_domains_owner on public.app_domains for all to authenticated
using (exists (select 1 from public.apps a where a.id = app_id and a.owner_id = (select auth.uid())))
with check (exists (select 1 from public.apps a where a.id = app_id and a.owner_id = (select auth.uid())));
create policy modules_owner on public.modules for all to authenticated
using (exists (select 1 from public.apps a where a.id = app_id and a.owner_id = (select auth.uid())))
with check (exists (select 1 from public.apps a where a.id = app_id and a.owner_id = (select auth.uid())));
create policy contents_owner on public.contents for all to authenticated
using (exists (select 1 from public.modules m join public.apps a on a.id = m.app_id where m.id = module_id and a.owner_id = (select auth.uid())))
with check (exists (select 1 from public.modules m join public.apps a on a.id = m.app_id where m.id = module_id and a.owner_id = (select auth.uid())));
create policy app_users_owner on public.app_users for all to authenticated
using (exists (select 1 from public.apps a where a.id = app_id and a.owner_id = (select auth.uid())))
with check (exists (select 1 from public.apps a where a.id = app_id and a.owner_id = (select auth.uid())));
create policy app_user_access_owner on public.app_user_access for all to authenticated
using (exists (select 1 from public.app_users u join public.apps a on a.id = u.app_id where u.id = app_user_id and a.owner_id = (select auth.uid())))
with check (exists (select 1 from public.app_users u join public.apps a on a.id = u.app_id where u.id = app_user_id and a.owner_id = (select auth.uid())));
create policy subscriptions_own on public.subscriptions for select to authenticated
using ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles, public.apps, public.app_slugs, public.app_domains, public.modules, public.contents, public.app_users, public.app_user_access to authenticated;
grant select on public.subscriptions to authenticated;
revoke all on all tables in schema public from anon;
