-- ==============================================================================
-- Supabase Schema Migration for Bhookr Backend
-- Creates the 5 core tables replacing Google Sheets & Firestore:
-- 1. leads
-- 2. subscriptions
-- 3. customers
-- 4. orders
-- 5. crm_users
-- ==============================================================================

-- 0. Enable pgcrypto / uuid extension (standard in Supabase)
create extension if not exists "pgcrypto";

-- Helper function to auto-update 'updated_at' timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ==============================================================================
-- 1. TABLE: leads
-- Replaces: Google Sheets Leads Sheet + Client Form Sheet
-- ==============================================================================
create table if not exists leads (
  id                      uuid primary key default gen_random_uuid(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  -- Identity
  name                    text,
  email                   text,
  phone_number            text,
  session_id              text,

  -- Profile
  age                     int,
  gender                  text,
  height                  numeric,
  weight                  numeric,
  goal                    text,
  diet                    text,
  food_preference         text,
  physical_state          text,
  food_love               text,

  -- Address / Delivery details
  address                 text,
  city                    text,
  state                   text,
  pin_code                text,

  -- Subscription intent
  subscription_type       text,
  plan                    text,
  subscription_start_date date,

  -- Tracking, Funnel & Repeat Submissions
  status                  text default 'lead',
  last_step_completed     int default 0,
  total_steps             int default 9,
  form_status             text default 'partial', -- 'partial' | 'completed'
  is_repeat               boolean default false,
  first_lead_id           uuid,
  checkout_visited        boolean default false,
  utm_source              text,
  utm_sub_source          text,
  lead_source             text default 'website', -- 'website' | 'client_form'

  -- Constraints
  constraint leads_session_id_unique unique (session_id)
);

create index if not exists idx_leads_created_at on leads (created_at desc);
create index if not exists idx_leads_session_id on leads (session_id);
create index if not exists idx_leads_first_lead_id on leads (first_lead_id);
create index if not exists idx_leads_is_repeat on leads (is_repeat);
create index if not exists idx_leads_form_status on leads (form_status);
create index if not exists idx_leads_email on leads (email);
create index if not exists idx_leads_phone on leads (phone_number);
create index if not exists idx_leads_status on leads (status);
create index if not exists idx_leads_source on leads (lead_source);

create or replace trigger trg_leads_updated_at
  before update on leads
  for each row
  execute function update_updated_at_column();

-- ==============================================================================
-- 2. TABLE: subscriptions
-- Replaces: Google Sheets Subscriptions Sheet
-- ==============================================================================
create table if not exists subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  -- Customer identity
  name                    text not null,
  email                   text not null,
  phone_number            text,

  -- Profile snapshot at purchase
  age                     int,
  gender                  text,
  height                  numeric,
  weight                  numeric,
  goal                    text,
  diet                    text,
  food_preference         text,
  physical_state          text,

  -- Subscription details
  subscription_type       text,
  plan                    text,
  subscription_start_date date,
  subscription_end_date   date,
  status                  text default 'active', -- 'active' | 'cancelled' | 'expired'

  -- Delivery address
  delivery_full_name      text,
  delivery_phone          text,
  delivery_address        text,
  delivery_city           text,
  delivery_state          text,
  delivery_pin_code       text,

  -- Payment & Order
  payment_status          text, -- 'success' | 'failed' | 'pending'
  transaction_id          text unique,
  order_id                text unique,
  amount_paid             numeric,
  payment_method          text,
  payment_timestamp       timestamptz,

  -- Cancellation
  cancelled_at            timestamptz,
  cancellation_reason     text
);

create index if not exists idx_subscriptions_created_at on subscriptions (created_at desc);
create index if not exists idx_subscriptions_email on subscriptions (email);
create index if not exists idx_subscriptions_order_id on subscriptions (order_id);
create index if not exists idx_subscriptions_status on subscriptions (status);

create or replace trigger trg_subscriptions_updated_at
  before update on subscriptions
  for each row
  execute function update_updated_at_column();

-- ==============================================================================
-- 3. TABLE: customers
-- Replaces: Google Sheets Active Customers / Print Sheet + Firestore crm_manual_customers
-- ==============================================================================
create table if not exists customers (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Delivery & Identification
  delivery_code text unique not null,
  name          text not null,
  mobile        text,
  location      text,
  zone          text,

  -- Subscription & Meal details
  status        text, -- 'PRIORITY' | 'NORMAL', etc.
  plan          text, -- 'ELITE' | 'LITE', etc.
  type          text, -- 'VEG' | 'NON VEG'
  meal          text, -- 'BF' | 'LUNCH' | 'DINNER'
  goal          text,
  customization text,
  inspection    text,
  recipe_id     text,

  -- Operational flag
  is_manual     boolean default false
);

create index if not exists idx_customers_delivery_code on customers (delivery_code);
create index if not exists idx_customers_mobile on customers (mobile);
create index if not exists idx_customers_zone on customers (zone);
create index if not exists idx_customers_status on customers (status);

create or replace trigger trg_customers_updated_at
  before update on customers
  for each row
  execute function update_updated_at_column();

-- ==============================================================================
-- 4. TABLE: orders
-- Replaces: Google Sheets Orders Sheet (one-off food orders)
-- ==============================================================================
create table if not exists orders (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  order_id           text unique not null,

  -- Customer
  customer_name      text,
  customer_email     text,
  customer_phone     text,

  -- Delivery address
  delivery_full_name text,
  delivery_phone     text,
  delivery_address   text,
  delivery_city      text,
  delivery_state     text,
  delivery_pin_code  text,

  -- Order line items & breakdown
  items              jsonb, -- array of {planId, name, price, quantity, total}
  item_count         int,
  subtotal           numeric,
  item_gst           numeric,
  delivery_base      numeric,
  delivery_gst       numeric,
  grand_total        numeric,

  -- Payment
  payment_status     text,
  payment_id         text,
  payment_method     text,
  payment_timestamp  timestamptz
);

create index if not exists idx_orders_created_at on orders (created_at desc);
create index if not exists idx_orders_order_id on orders (order_id);
create index if not exists idx_orders_email on orders (customer_email);
create index if not exists idx_orders_payment_status on orders (payment_status);

create or replace trigger trg_orders_updated_at
  before update on orders
  for each row
  execute function update_updated_at_column();

-- ==============================================================================
-- 5. TABLE: crm_users
-- Replaces: Firestore CRM auth
-- ==============================================================================
create table if not exists crm_users (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  email       text unique not null,
  name        text,
  role        text not null default 'telecaller', -- 'admin' | 'manager' | 'auditor' | 'telecaller'
  is_active   boolean default true,
  last_login  timestamptz
);

create index if not exists idx_crm_users_email on crm_users (email);
create index if not exists idx_crm_users_role on crm_users (role);

create or replace trigger trg_crm_users_updated_at
  before update on crm_users
  for each row
  execute function update_updated_at_column();

-- ==============================================================================
-- Enable Row Level Security (RLS)
-- Protects data so it can only be accessed securely by authenticated API routes
-- ==============================================================================
alter table leads enable row level security;
alter table subscriptions enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table crm_users enable row level security;

-- Allow service_role full access (used by server-side Next.js API routes)
create policy "Allow service_role full access on leads" on leads
  for all using (auth.role() = 'service_role');

create policy "Allow service_role full access on subscriptions" on subscriptions
  for all using (auth.role() = 'service_role');

create policy "Allow service_role full access on customers" on customers
  for all using (auth.role() = 'service_role');

create policy "Allow service_role full access on orders" on orders
  for all using (auth.role() = 'service_role');

create policy "Allow service_role full access on crm_users" on crm_users
  for all using (auth.role() = 'service_role');
