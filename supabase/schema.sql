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
