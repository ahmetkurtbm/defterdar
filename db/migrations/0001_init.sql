-- Defterdar şeması.
-- Kiracı = müşavir ofisi (offices). Kiracı verisi taşıyan her tablo office_id içerir ve
-- RLS ile app.office_id ayarına bağlanır. Uygulama sorgularını `app_user` rolüyle çalıştırır;
-- FORCE row level security olmadan tablo sahibi politikaları atlar.

create extension if not exists pgcrypto;

do $$
begin
  create role app_user nologin;
exception when duplicate_object then null;
end
$$;

-- Bağlantı kullanıcısı `set role app_user` yapabilmeli.
do $$
begin
  execute format('grant app_user to %I', current_user);
exception when others then null;
end
$$;

-- Transaction boyunca ayarlanan kiracı. Ayarlanmamışsa null döner ve hiçbir satır eşleşmez.
create or replace function app_office_id() returns uuid
language sql stable
as $$ select nullif(current_setting('app.office_id', true), '')::uuid $$;

------------------------------------------------------------------------------
-- Kimlik: ofisler, kullanıcılar, oturumlar
------------------------------------------------------------------------------

create table offices (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 120),
  -- Mükelleften evrakın en geç teslim edileceği gün (takip eden ayın günü).
  collection_day smallint not null default 20 check (collection_day between 1 and 28),
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references offices (id) on delete cascade,
  email text not null,
  name text not null check (length(name) between 2 and 120),
  password_hash text not null,
  role text not null default 'staff' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);
create unique index users_email_key on users (lower(email));
create index users_office_idx on users (office_id);

-- Oturum token'ı yalnızca SHA-256 özeti olarak tutulur.
create table sessions (
  token_hash text primary key,
  user_id uuid not null references users (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index sessions_user_idx on sessions (user_id);

------------------------------------------------------------------------------
-- Kiracı verisi
------------------------------------------------------------------------------

create table document_types (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references offices (id) on delete cascade,
  code text not null check (code ~ '^[a-z0-9_]{2,40}$'),
  name text not null check (length(name) between 2 and 80),
  hint text,
  sort_order int not null default 0,
  archived boolean not null default false,
  unique (office_id, code)
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references offices (id) on delete cascade,
  name text not null check (length(name) between 2 and 160),
  kind text not null default 'sahis' check (kind in ('sahis', 'limited', 'anonim', 'serbest_meslek')),
  tax_id text check (tax_id is null or tax_id ~ '^[0-9]{10,11}$'),
  contact_name text,
  phone text,
  email text,
  -- Portal linkindeki token sunucu sırrından türetilir (HMAC(id, sürüm)); burada yalnızca
  -- arama için SHA-256 özeti durur. Sürüm artırılınca eski link geçersiz olur.
  portal_token_hash text not null unique,
  portal_token_version int not null default 1,
  portal_enabled boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index clients_office_idx on clients (office_id) where archived_at is null;

-- Bu mükelleften her ay beklenen evrak türleri.
create table client_requirements (
  office_id uuid not null references offices (id) on delete cascade,
  client_id uuid not null references clients (id) on delete cascade,
  document_type_id uuid not null references document_types (id) on delete cascade,
  primary key (client_id, document_type_id)
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references offices (id) on delete cascade,
  client_id uuid not null references clients (id) on delete cascade,
  period_year smallint not null check (period_year between 2000 and 2100),
  period_month smallint not null check (period_month between 1 and 12),
  document_type_id uuid references document_types (id) on delete set null,
  original_name text not null,
  mime_type text not null,
  size_bytes int not null check (size_bytes > 0),
  sha256 text not null,
  storage_key text not null,
  source text not null check (source in ('portal', 'office')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  reject_reason text,
  ai_status text not null default 'queued' check (ai_status in ('queued', 'done', 'failed', 'skipped')),
  ai_type_id uuid references document_types (id) on delete set null,
  ai_confidence numeric(4, 3) check (ai_confidence between 0 and 1),
  ai_note text,
  uploaded_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references users (id) on delete set null,
  -- Aynı dosya aynı döneme iki kez yüklenmez.
  unique (client_id, period_year, period_month, sha256)
);
create index documents_period_idx on documents (office_id, period_year, period_month);
create index documents_pending_idx on documents (office_id, uploaded_at desc) where status = 'pending';

-- Dönemin müşavir tarafından kapatılması (evrak toplama bitti).
create table period_closures (
  office_id uuid not null references offices (id) on delete cascade,
  client_id uuid not null references clients (id) on delete cascade,
  period_year smallint not null,
  period_month smallint not null,
  closed_at timestamptz not null default now(),
  closed_by uuid references users (id) on delete set null,
  primary key (client_id, period_year, period_month)
);

create table reminders (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references offices (id) on delete cascade,
  client_id uuid not null references clients (id) on delete cascade,
  period_year smallint not null,
  period_month smallint not null,
  channel text not null check (channel in ('whatsapp', 'copy')),
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index reminders_client_idx on reminders (client_id, created_at desc);

create table audit_log (
  id bigserial primary key,
  office_id uuid not null references offices (id) on delete cascade,
  actor text not null,
  action text not null,
  entity text not null,
  entity_id uuid,
  detail jsonb,
  at timestamptz not null default now()
);
create index audit_log_office_idx on audit_log (office_id, at desc);

------------------------------------------------------------------------------
-- Row Level Security
------------------------------------------------------------------------------

alter table offices enable row level security;
alter table offices force row level security;
create policy offices_tenant on offices using (id = app_office_id()) with check (id = app_office_id());

alter table users enable row level security;
alter table users force row level security;
create policy users_tenant on users using (office_id = app_office_id()) with check (office_id = app_office_id());

do $$
declare
  t text;
begin
  foreach t in array array[
    'document_types', 'clients', 'client_requirements', 'documents',
    'period_closures', 'reminders', 'audit_log'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format(
      'create policy %I on %I using (office_id = app_office_id()) with check (office_id = app_office_id())',
      t || '_tenant', t
    );
  end loop;
end
$$;

-- Oturumlar uygulama rolüne hiç açılmaz; yalnızca kimlik doğrulama katmanı (sistem bağlamı) okur.
alter table sessions enable row level security;
alter table sessions force row level security;

grant usage on schema public to app_user;
grant select, update on offices to app_user;
grant select on users to app_user;
grant select, insert, update on document_types to app_user;
grant select, insert, update on clients to app_user;
grant select, insert, delete on client_requirements to app_user;
grant select, insert, update on documents to app_user;
grant select, insert, delete on period_closures to app_user;
grant select, insert on reminders to app_user;
grant select, insert on audit_log to app_user;
grant usage on sequence audit_log_id_seq to app_user;
grant execute on function app_office_id() to app_user;

-- Portal: token özetinden mükellefi ve ofisini bulur. RLS'i yalnızca bu dar sorgu için aşar;
-- sonraki tüm işlemler bulunan ofis bağlamında app_user rolüyle yapılır.
create or replace function portal_lookup(p_token_hash text)
returns table (office_id uuid, client_id uuid)
language sql stable security definer
set search_path = public
as $$
  select c.office_id, c.id
  from clients c
  where c.portal_token_hash = p_token_hash
    and c.portal_enabled
    and c.archived_at is null
$$;
revoke all on function portal_lookup(text) from public;
grant execute on function portal_lookup(text) to app_user;
