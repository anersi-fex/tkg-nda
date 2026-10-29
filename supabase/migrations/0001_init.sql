-- Ink (tkg-nda), migration 0001: agreements signed on a phone, with a record of every tap.
-- Paste into the Supabase SQL editor once. Safe to run twice.
--
-- Access model: the browser never talks to the database. The app's server code uses the
-- service role key after checking the owner's session or the signing link's token. Row Level
-- Security is on for every table with no policies, so the anon and authenticated roles can read
-- and write nothing.
--
-- Nothing here is ever deleted: a signed agreement, its PDF and its events are legal records.
-- An agreement the owner cancels is marked voided and kept.

create extension if not exists pgcrypto;

-- One envelope = one agreement, one person, one private link.
create table if not exists envelopes (
  id uuid primary key default gen_random_uuid(),
  -- The signing link's key: 32 random bytes, base64url. Only the app's server reads this table.
  token text not null unique check (char_length(token) between 32 and 64),
  status text not null default 'sent' check (status in ('sent', 'opened', 'completed', 'voided')),
  -- The agreement wording frozen at issue time (company names filled in), as JSON.
  document jsonb not null,
  template_version text not null check (char_length(template_version) <= 40),
  -- What the owner typed when issuing (the signer confirms or fixes it).
  signer_name_hint text check (signer_name_hint is null or char_length(signer_name_hint) <= 80),
  signer_email_hint text check (signer_email_hint is null or char_length(signer_email_hint) <= 120),
  note text check (note is null or char_length(note) <= 120),
  -- What the signer typed and adopted.
  signer_name text check (signer_name is null or char_length(signer_name) <= 80),
  signer_email text check (signer_email is null or char_length(signer_email) <= 120),
  signature_method text check (signature_method is null or signature_method in ('typed', 'drawn')),
  signature_style text check (signature_style is null or char_length(signature_style) <= 40),
  -- PNG data URLs drawn in the signer's browser (the same pixels go on the PDF).
  signature_png text check (signature_png is null or char_length(signature_png) <= 400000),
  initials_png text check (initials_png is null or char_length(initials_png) <= 400000),
  -- Fingerprints written when the agreement is completed.
  document_sha256 text check (document_sha256 is null or document_sha256 ~ '^[0-9a-f]{64}$'),
  pdf_sha256 text check (pdf_sha256 is null or pdf_sha256 ~ '^[0-9a-f]{64}$'),
  issued_by text not null check (char_length(issued_by) <= 80),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  opened_at timestamptz,
  completed_at timestamptz,
  voided_at timestamptz
);
create index if not exists envelopes_created_idx on envelopes (created_at desc);

-- Every step, stamped by the server: never updated, never deleted.
create table if not exists events (
  id bigint generated always as identity primary key,
  envelope_id uuid not null references envelopes(id) on delete restrict,
  kind text not null check (kind in ('issued', 'opened', 'consented', 'adopted', 'initialed', 'signed', 'completed', 'viewed_pdf', 'voided', 'copy_sent', 'copy_failed')),
  section_key text check (section_key is null or char_length(section_key) <= 60),
  at timestamptz not null default now(),
  -- Where the tap came from: the network address, the browser, Vercel's approximate location.
  ip text check (ip is null or char_length(ip) <= 64),
  user_agent text check (user_agent is null or char_length(user_agent) <= 400),
  geo jsonb,
  details jsonb
);
create index if not exists events_envelope_idx on events (envelope_id, at, id);

-- The sealed PDF of each completed agreement (base64), with its SHA-256.
create table if not exists signed_pdfs (
  envelope_id uuid primary key references envelopes(id) on delete restrict,
  pdf_base64 text not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  bytes integer not null check (bytes > 0),
  created_at timestamptz not null default now()
);

-- Key/value settings: "app" holds the company and owner names printed on agreements.
create table if not exists settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Failed sign-ins, for the login throttle (an IP only, kept short).
create table if not exists login_attempts (
  id bigint generated always as identity primary key,
  ip text not null check (char_length(ip) <= 64),
  at timestamptz not null default now()
);
create index if not exists login_attempts_at_idx on login_attempts (at);

-- Lock every table to the service role (no policies: anon and authenticated get nothing).
alter table envelopes enable row level security;
alter table events enable row level security;
alter table signed_pdfs enable row level security;
alter table settings enable row level security;
alter table login_attempts enable row level security;

-- And take the table grants away from the API roles too, so the public keys get an error, not
-- an empty list.
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on all tables in schema public from %I', r);
      execute format('revoke all on all sequences in schema public from %I', r);
      execute format('revoke execute on all functions in schema public from %I', r);
    end if;
  end loop;
end $$;

-- Supabase's API gateway needs to know about new tables.
notify pgrst, 'reload schema';
