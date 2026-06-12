-- ============================================================
-- Salesforce Clone — full metadata-engine schema
-- Apply to a fresh Supabase project (SQL editor or `supabase db push`).
-- All tables are sf_ prefixed and RLS-enabled (authenticated access).
-- ============================================================

create or replace function sf_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- Core metadata ----------
create table if not exists sf_objects (
  id uuid primary key default gen_random_uuid(),
  api_name text not null unique,
  label text not null,
  plural_label text not null,
  description text,
  icon text default 'Box',
  is_custom boolean default true,
  enable_record_types boolean default false,
  enable_activities boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists sf_record_types (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references sf_objects(id) on delete cascade,
  api_name text not null,
  label text not null,
  description text,
  is_default boolean default false,
  active boolean default true,
  created_at timestamptz default now(),
  unique (object_id, api_name)
);

create table if not exists sf_fields (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references sf_objects(id) on delete cascade,
  api_name text not null,
  label text not null,
  type text not null default 'text',
  required boolean default false,
  is_unique boolean default false,
  is_custom boolean default true,
  default_value text,
  help_text text,
  picklist_values jsonb default '[]'::jsonb,
  reference_object_id uuid references sf_objects(id) on delete set null,
  formula text,
  length int, precision int, scale int,
  display_order int default 0,
  created_at timestamptz default now(),
  unique (object_id, api_name)
);

create table if not exists sf_records (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references sf_objects(id) on delete cascade,
  record_type_id uuid references sf_record_types(id) on delete set null,
  owner_id uuid references auth.users(id) on delete set null,
  name text,
  data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists sf_records_object_idx on sf_records(object_id);
create index if not exists sf_records_data_idx on sf_records using gin(data);
create trigger sf_records_updated before update on sf_records for each row execute function sf_set_updated_at();
create trigger sf_objects_updated before update on sf_objects for each row execute function sf_set_updated_at();

create table if not exists sf_validation_rules (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references sf_objects(id) on delete cascade,
  name text not null, description text,
  condition jsonb not null default '{}'::jsonb,
  error_message text not null,
  error_location text default 'TOP',
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists sf_list_views (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references sf_objects(id) on delete cascade,
  api_name text not null, label text not null,
  columns jsonb not null default '[]'::jsonb,
  filters jsonb not null default '[]'::jsonb,
  sort jsonb default '{}'::jsonb,
  is_default boolean default false,
  created_at timestamptz default now(),
  unique (object_id, api_name)
);

-- ---------- UI metadata ----------
create table if not exists sf_page_layouts (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references sf_objects(id) on delete cascade,
  record_type_id uuid references sf_record_types(id) on delete cascade,
  name text not null,
  sections jsonb not null default '[]'::jsonb,
  related_lists jsonb not null default '[]'::jsonb,
  is_default boolean default false,
  created_at timestamptz default now()
);

create table if not exists sf_lightning_pages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'record',
  object_id uuid references sf_objects(id) on delete cascade,
  regions jsonb not null default '{"main":[],"sidebar":[]}'::jsonb,
  is_default boolean default false,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger sf_lpages_updated before update on sf_lightning_pages for each row execute function sf_set_updated_at();

create table if not exists sf_apps (
  id uuid primary key default gen_random_uuid(),
  api_name text not null unique,
  label text not null, description text,
  icon text default 'AppWindow', color text default '#2563eb',
  nav_items jsonb not null default '[]'::jsonb,
  is_default boolean default false,
  created_at timestamptz default now()
);

create table if not exists sf_tabs (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  type text not null default 'object',
  object_id uuid references sf_objects(id) on delete cascade,
  lightning_page_id uuid references sf_lightning_pages(id) on delete cascade,
  url text, icon text default 'Box',
  created_at timestamptz default now()
);

-- ---------- Security ----------
create table if not exists sf_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, description text,
  is_admin boolean default false,
  created_at timestamptz default now()
);

create table if not exists sf_permission_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, label text not null, description text,
  created_at timestamptz default now()
);

create table if not exists sf_object_permissions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references sf_profiles(id) on delete cascade,
  permission_set_id uuid references sf_permission_sets(id) on delete cascade,
  object_id uuid not null references sf_objects(id) on delete cascade,
  can_read boolean default true, can_create boolean default false,
  can_edit boolean default false, can_delete boolean default false,
  view_all boolean default false, modify_all boolean default false,
  check (profile_id is not null or permission_set_id is not null)
);

create table if not exists sf_field_permissions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references sf_profiles(id) on delete cascade,
  permission_set_id uuid references sf_permission_sets(id) on delete cascade,
  field_id uuid not null references sf_fields(id) on delete cascade,
  readable boolean default true, editable boolean default false,
  check (profile_id is not null or permission_set_id is not null)
);

create table if not exists sf_user_assignments (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile_id uuid references sf_profiles(id) on delete set null,
  permission_set_ids jsonb not null default '[]'::jsonb,
  full_name text, is_active boolean default true,
  created_at timestamptz default now()
);

-- ---------- Automation & code ----------
create table if not exists sf_flows (
  id uuid primary key default gen_random_uuid(),
  api_name text not null unique, label text not null, description text,
  type text not null default 'record_triggered',
  trigger_object_id uuid references sf_objects(id) on delete cascade,
  trigger_event text default 'after_create',
  definition jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  active boolean default false,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create trigger sf_flows_updated before update on sf_flows for each row execute function sf_set_updated_at();

create table if not exists sf_flow_runs (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid references sf_flows(id) on delete cascade,
  record_id uuid, status text default 'success',
  log jsonb default '[]'::jsonb, created_at timestamptz default now()
);

create table if not exists sf_apex_classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, type text not null default 'class',
  body text not null default '',
  trigger_object_id uuid references sf_objects(id) on delete cascade,
  trigger_events jsonb default '[]'::jsonb,
  active boolean default true, api_version text default '60.0',
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create trigger sf_apex_updated before update on sf_apex_classes for each row execute function sf_set_updated_at();

create table if not exists sf_lwc_components (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, label text,
  html text default '', js text default '', css text default '',
  targets jsonb default '["record","app","home"]'::jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create trigger sf_lwc_updated before update on sf_lwc_components for each row execute function sf_set_updated_at();

create table if not exists sf_vf_pages (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, label text,
  markup text default '', controller text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create trigger sf_vf_updated before update on sf_vf_pages for each row execute function sf_set_updated_at();

create table if not exists sf_custom_labels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, value text not null,
  category text, language text default 'en_US',
  created_at timestamptz default now()
);

create table if not exists sf_custom_settings (
  id uuid primary key default gen_random_uuid(),
  api_name text not null unique, label text not null,
  type text not null default 'hierarchy',
  fields jsonb not null default '[]'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ---------- RLS (authenticated full access; app enforces permissions) ----------
do $$
declare t text;
declare tbls text[] := array[
  'sf_objects','sf_record_types','sf_fields','sf_records','sf_validation_rules',
  'sf_list_views','sf_page_layouts','sf_lightning_pages','sf_apps','sf_tabs',
  'sf_profiles','sf_permission_sets','sf_object_permissions','sf_field_permissions',
  'sf_user_assignments','sf_flows','sf_flow_runs','sf_apex_classes',
  'sf_lwc_components','sf_vf_pages','sf_custom_labels','sf_custom_settings'
];
begin
  foreach t in array tbls loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists sf_auth_all on public.%I', t);
    execute format('create policy sf_auth_all on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ---------- New-user provisioning (first user becomes admin) ----------
create or replace function sf_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare admin_profile uuid;
begin
  select id into admin_profile from sf_profiles where is_admin = true limit 1;
  insert into sf_user_assignments (user_id, profile_id, full_name)
  values (new.id, admin_profile, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (user_id) do nothing;
  return new;
end $$;
drop trigger if exists sf_on_auth_user_created on auth.users;
create trigger sf_on_auth_user_created after insert on auth.users
  for each row execute function sf_handle_new_user();

-- ============================================================
-- Standard objects + fields + app + profiles seed
-- (See README; run the seed block from the project history or
--  create objects via the in-app Object Manager.)
-- ============================================================
