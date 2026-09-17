-- AuditGuard AI schema
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query) on a fresh project.
--
-- Security note: this app currently has no login (single shared workspace, per product decision).
-- RLS is enabled on every table with a permissive "allow all to anon" policy so the app keeps working
-- without auth. That means anyone with the project URL + anon key (both are embedded in the client
-- bundle) can read and write every row below. That is acceptable only because this is a prototype with
-- no real user accounts yet. Before putting real audit data in here, add Supabase Auth and replace these
-- policies with ones scoped to auth.uid().

-- ---------------------------------------------------------------------------
-- Raffle validation / audit trail
-- ---------------------------------------------------------------------------

create table if not exists audit_trail_entries (
  run_id text primary key,
  date_time timestamptz not null default now(),
  file_name text not null,
  campaign_start_date date,
  campaign_end_date date,
  minimum_eligible_amount numeric not null default 0,
  entries_per_eligible_amount numeric not null default 0,
  exclude_employees boolean not null default true,
  exclude_reversed_transactions boolean not null default true,
  total_records_tested integer not null default 0,
  valid_records integer not null default 0,
  invalid_records integer not null default 0,
  duplicate_records integer not null default 0,
  reversed_transactions integer not null default 0,
  outside_campaign_period integer not null default 0,
  exception_evidence jsonb,
  status text not null default 'Completed',
  created_at timestamptz not null default now()
);

create table if not exists working_papers (
  run_id text primary key references audit_trail_entries (run_id) on delete cascade,
  auditor_notes text not null default '',
  conclusion text not null default '',
  prepared_by text not null default '',
  reviewed_by text not null default '',
  review_status text not null default 'Draft',
  preparation_date date,
  review_date date
);

-- ---------------------------------------------------------------------------
-- Findings / Controls / Remediation
-- ---------------------------------------------------------------------------

create table if not exists findings (
  finding_id text primary key,
  related_run_id text not null default '',
  title text not null default '',
  audit_area text not null default '',
  risk_rating text not null default 'Low',
  status text not null default 'Draft',
  criteria text not null default '',
  condition text not null default '',
  cause text not null default '',
  risk_impact text not null default '',
  recommendation text not null default '',
  prepared_by text not null default '',
  preparation_date date,
  reviewed_by text not null default '',
  review_date date,
  management_response text not null default '',
  action_owner text not null default '',
  target_date date,
  supporting_exception_evidence jsonb not null default '[]',
  branch text,
  created_at timestamptz not null default now()
);

create table if not exists controls (
  control_id text primary key,
  control_name text not null default '',
  audit_area text not null default '',
  control_objective text not null default '',
  risk_addressed text not null default '',
  control_type text not null default 'Preventive',
  control_nature text not null default 'Manual',
  frequency text not null default 'Per Transaction',
  control_owner text not null default '',
  control_status text not null default 'Active',
  related_run_id text not null default '',
  related_finding_id text not null default '',
  design_effectiveness text not null default 'Not Assessed',
  operating_effectiveness text not null default 'Not Tested',
  auditor_notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists remediation (
  finding_id text primary key references findings (finding_id) on delete cascade,
  status text not null default 'Not Started',
  follow_up_date date,
  auditor_comments text not null default '',
  closure_result text not null default '',
  evidence text not null default '',
  validation_performed text not null default '',
  validation_date date,
  validation_result text not null default ''
);

create table if not exists remediation_audit_events (
  id bigint generated always as identity primary key,
  date_time timestamptz not null default now(),
  finding_id text not null,
  related_run_id text not null default '',
  remediation_status text not null default '',
  validation_result text not null default '',
  change text not null default ''
);

-- ---------------------------------------------------------------------------
-- Branch Risk Intelligence
-- ---------------------------------------------------------------------------

create table if not exists branch_risk_records (
  id bigint generated always as identity primary key,
  source_key text not null check (source_key in ('complaints', 'gl', 'access', 'shortages', 'incidents')),
  canonical_branch_id text not null default '',
  branch text not null default '',
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists branch_risk_records_source_key_idx on branch_risk_records (source_key);
create index if not exists branch_risk_records_canonical_branch_id_idx on branch_risk_records (canonical_branch_id);

create table if not exists branch_risk_uploads (
  source_key text primary key check (source_key in ('complaints', 'gl', 'access', 'shortages', 'incidents')),
  file_name text not null default '',
  worksheet_name text not null default '',
  detected_columns jsonb not null default '[]',
  upload_date timestamptz not null default now(),
  import_batch_id text not null default '',
  records integer not null default 0,
  invalid_records integer not null default 0,
  duplicate_records integer not null default 0,
  status text not null default ''
);

create table if not exists branch_risk_settings (
  id integer primary key default 1 check (id = 1),
  weights jsonb not null default '{"complaints":15,"gl":20,"access":15,"shortages":20,"incidents":10,"findings":10,"controls":10}',
  demo boolean not null default true,
  -- Flips true exactly once via an atomic conditional UPDATE, so demo data is seeded exactly one
  -- time ever (not re-seeded every time the app checks whether it should seed) even under
  -- concurrent calls, e.g. React Strict Mode's double effect invocation in dev.
  demo_seeded boolean not null default false
);

alter table branch_risk_settings add column if not exists demo_seeded boolean not null default false;

insert into branch_risk_settings (id) values (1) on conflict (id) do nothing;

-- Backfill: if branch risk records already exist (e.g. from before demo_seeded existed), mark
-- seeding as already done so it isn't repeated.
update branch_risk_settings
set demo_seeded = true
where id = 1 and exists (select 1 from branch_risk_records limit 1);

-- ---------------------------------------------------------------------------
-- Row Level Security (see security note at the top of this file)
-- ---------------------------------------------------------------------------

alter table audit_trail_entries enable row level security;
alter table working_papers enable row level security;
alter table findings enable row level security;
alter table controls enable row level security;
alter table remediation enable row level security;
alter table remediation_audit_events enable row level security;
alter table branch_risk_records enable row level security;
alter table branch_risk_uploads enable row level security;
alter table branch_risk_settings enable row level security;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'audit_trail_entries', 'working_papers', 'findings', 'controls', 'remediation',
      'remediation_audit_events', 'branch_risk_records', 'branch_risk_uploads', 'branch_risk_settings'
    ])
  loop
    execute format('drop policy if exists "allow all to anon" on %I;', t);
    execute format(
      'create policy "allow all to anon" on %I for all to anon using (true) with check (true);',
      t
    );
  end loop;
end $$;
