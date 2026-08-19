-- Store Count — Supabase schema
-- Run this in your Supabase project's SQL editor (Database → SQL editor).

create table if not exists users (
  id               uuid        primary key default gen_random_uuid(),
  phone            text        unique not null,   -- normalized: digits only, no leading zeros
  email            text,
  first_name       text        not null,
  last_name        text        not null,
  pin_salt         text        not null,           -- base64-encoded 16-byte random salt
  pin_hash         text        not null,           -- base64-encoded PBKDF2-SHA256 output
  pin_iterations   integer     not null default 150000,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists user_data (
  user_id       uuid        primary key references users(id) on delete cascade,
  products      jsonb       not null default '[]',
  sales         jsonb       not null default '[]',
  pending_sales jsonb       not null default '[]',
  settings      jsonb       not null default '{"businessName":"","currency":"NGN","lowStockThreshold":5}',
  updated_at    timestamptz not null default now()
);

-- Migration for existing installs: add the pay-later holds column if missing.
alter table user_data
  add column if not exists pending_sales jsonb not null default '[]';

-- All access goes through the service-role key via Next.js API routes,
-- so no client-facing RLS policies are needed — just enable RLS to block
-- any accidental direct client access.
alter table users     enable row level security;
alter table user_data enable row level security;


-- ============================================================================
-- Storefront
--
-- Everything below lives OUTSIDE user_data on purpose. The merchant's sync push
-- is a last-write-wins full-blob overwrite, so anything it can reach it can
-- destroy. Orders must survive it.
--
-- Note on id column types: product ids come from lib/id.ts createId(), which
-- falls back to a non-UUID string when crypto.randomUUID is unavailable. Every
-- column holding a merchant-generated id is therefore TEXT, not UUID.
-- ============================================================================

create table if not exists stores (
  id                 uuid          primary key default gen_random_uuid(),
  user_id            uuid          not null unique references users(id) on delete cascade,
  slug               text          not null unique,
  name               text          not null,
  description        text,
  -- Public contact. Deliberately NOT users.phone: that one is a login
  -- credential and must never be printed on a public page.
  phone              text,
  address            text,
  currency           text          not null default 'NGN',
  is_open            boolean       not null default false,
  is_published       boolean       not null default false,
  accepts_delivery   boolean       not null default true,
  accepts_pickup     boolean       not null default true,
  delivery_fee       numeric(12,2) not null default 0 check (delivery_fee >= 0),
  delivery_note      text,
  min_order_total    numeric(12,2) not null default 0 check (min_order_total >= 0),
  -- Bumped by trigger on any order insert or status change. Lets the merchant
  -- poll one indexed row instead of scanning orders.
  orders_changed_at  timestamptz   not null default now(),
  -- sha256 of the published product subset. sync/push skips re-projection when
  -- unchanged — most pushes are sales, not catalog edits.
  catalog_digest     text,
  created_at         timestamptz   not null default now(),
  updated_at         timestamptz   not null default now(),
  constraint stores_slug_format
    check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$')
);

-- Read model projected from user_data.products on every sync push.
-- Derived, never authoritative — safe to rebuild from scratch at any time.
create table if not exists store_products (
  store_id           uuid          not null references stores(id) on delete cascade,
  product_id         text          not null,
  name               text          not null,
  description        text,
  category           text,
  price              numeric(12,2) not null check (price >= 0),
  -- Stale-tolerant hint. The merchant's device is authoritative for stock, and
  -- the merchant accepts before stock moves, so overselling is recoverable.
  available_quantity integer       not null default 0 check (available_quantity >= 0),
  image_url          text,
  -- sha256 of the source data URL; lets projection skip re-uploading.
  image_hash         text,
  updated_at         timestamptz   not null default now(),
  primary key (store_id, product_id)
);

create index if not exists store_products_store_name_idx
  on store_products (store_id, name);

-- Guest identity. Phase 1 never authenticates against this table — order
-- tracking is by opaque per-order token only. Phase 2 adds a credential column.
create table if not exists customers (
  id          uuid        primary key default gen_random_uuid(),
  -- Normalized digits-only, same rule as users.phone (lib/auth.ts normalizePhone).
  phone       text        not null unique,
  name        text        not null,
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists orders (
  id                 uuid          primary key default gen_random_uuid(),
  store_id           uuid          not null references stores(id) on delete cascade,
  customer_id        uuid          references customers(id) on delete set null,
  -- Human reference shown on both sides, e.g. "OD-7K4M9Q". DISPLAY ONLY — the
  -- alphabet is far too small to authenticate with.
  ref                text          not null,
  -- 32 random bytes, base64url. The ONLY thing authenticating a guest to their
  -- own order.
  tracking_token     text          not null unique,

  status             text          not null default 'pending'
    check (status in ('pending','accepted','out_for_delivery',
                      'delivered','rejected','cancelled')),
  payment_method     text          not null default 'cash_on_delivery'
    check (payment_method in ('cash_on_delivery','online')),
  payment_status     text          not null default 'unpaid'
    check (payment_status in ('unpaid','paid','refunded')),
  fulfilment_method  text          not null default 'delivery'
    check (fulfilment_method in ('delivery','pickup')),

  -- Snapshotted at order time. Mirrors SaleItem minus `cost`:
  -- [{ productId, name, price, quantity }]
  items              jsonb         not null,
  total_quantity     integer       not null check (total_quantity > 0),
  subtotal           numeric(12,2) not null check (subtotal >= 0),
  delivery_fee       numeric(12,2) not null default 0 check (delivery_fee >= 0),
  total              numeric(12,2) not null check (total >= 0),
  currency           text          not null default 'NGN',

  customer_name      text          not null,
  customer_phone     text          not null,
  delivery_address   text,
  customer_note      text,

  -- Links back into the merchant's local blob.
  pending_sale_id    text,   -- set on accept
  sale_id            text,   -- set on delivered
  sale_ref           text,
  decline_reason     text,

  placed_at          timestamptz   not null default now(),
  accepted_at        timestamptz,
  dispatched_at      timestamptz,
  delivered_at       timestamptz,
  updated_at         timestamptz   not null default now(),

  constraint orders_ref_unique_per_store unique (store_id, ref),
  constraint orders_delivery_needs_address
    check (fulfilment_method <> 'delivery' or delivery_address is not null),
  constraint orders_total_matches
    check (total = subtotal + delivery_fee)
);

create index if not exists orders_store_status_idx
  on orders (store_id, status, placed_at desc);
create index if not exists orders_store_updated_idx
  on orders (store_id, updated_at desc);
create index if not exists orders_customer_idx
  on orders (customer_id, placed_at desc);

-- Append-only audit trail. Cheap, and the only way to debug a disputed order.
create table if not exists order_events (
  id          bigserial   primary key,
  order_id    uuid        not null references orders(id) on delete cascade,
  from_status text,
  to_status   text        not null,
  actor       text        not null check (actor in ('customer','merchant','system')),
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists order_events_order_idx
  on order_events (order_id, created_at);

-- Login throttle.
--
-- The PIN is 4 digits — a 10,000-value keyspace. That was survivable while an
-- attacker also had to know a merchant's phone number, but merchant phone
-- numbers are now printed on public storefront pages, which turns an unthrottled
-- login into a working account-takeover path. Keyed by normalized phone AND by
-- IP hash so neither a single target nor a single source can grind.
create table if not exists login_attempts (
  key         text        primary key,  -- 'phone:<normalized>' or 'ip:<sha256>'
  fails       integer     not null default 0,
  locked_until timestamptz,
  updated_at  timestamptz not null default now()
);

create index if not exists login_attempts_updated_idx
  on login_attempts (updated_at);

-- DB-backed throttle for the public order endpoint. In-memory buckets are
-- useless on serverless (per-instance), so count in Postgres.
create table if not exists order_throttle (
  bucket     text        primary key,  -- sha256(ip)|YYYYMMDDHHMM
  count      integer     not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists order_throttle_created_idx
  on order_throttle (created_at);

create or replace function bump_store_orders_changed() returns trigger
language plpgsql as $$
begin
  update stores set orders_changed_at = now() where id = new.store_id;
  return new;
end;
$$;

drop trigger if exists orders_bump_store on orders;
create trigger orders_bump_store
  after insert or update of status on orders
  for each row execute function bump_store_orders_changed();

-- Same RLS stance as users/user_data: enabled with ZERO policies, so the only
-- way in is the service-role key inside a route handler.
--
-- HARDENING PATH (Phase 2): the storefront deployment holds that service-role
-- key, so an SSRF or dependency compromise there reads every merchant's sales
-- history and PIN hashes. Move storefront reads to the anon key with narrow
-- policies (public read of published stores and their products only), keeping
-- the service role for the order-insert route. That shrinks the blast radius
-- to "public catalogs".
alter table stores          enable row level security;
alter table store_products  enable row level security;
alter table customers       enable row level security;
alter table orders          enable row level security;
alter table order_events    enable row level security;
alter table order_throttle  enable row level security;
alter table login_attempts  enable row level security;

-- Storage bucket for projected product images. Product.image stays a data URL
-- in the merchant's local blob (offline-first); projection uploads a copy here
-- so the public catalog serves real image URLs instead of ~700KB of inline
-- base64 per visitor. Content-addressed paths: {store_id}/{product_id}-{hash}.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('store-images', 'store-images', true, 262144, array['image/jpeg'])
on conflict (id) do nothing;
