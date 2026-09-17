# AuditGuard AI

An audit analytics dashboard built with Next.js (App Router), TypeScript, and Supabase.

## Set up Supabase

1. Create a project at [supabase.com](https://supabase.com) (or use an existing one).
2. Open the SQL editor in your Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) once. It creates all the tables the app needs and enables Row Level Security with a permissive policy (see the security note at the top of that file — there is no login yet, so treat this as a prototype, not a place for real audit data).
3. Copy `.env.local.example` to `.env.local` and fill in your project's URL and anon key (Project Settings -> API in the Supabase dashboard). `.env.local` is gitignored — never commit real keys.

## Set up Saqer (the AI assistant)

Saqer is a chat assistant (bottom-right corner of every page) that can answer questions about findings, controls, audit trail runs, remediation, and branch risk, and can create findings/controls or update remediation on request.

1. Get an API key from [console.anthropic.com](https://console.anthropic.com).
2. Add it to `.env.local` as `CLAUDE_API=...` (see `.env.local.example`). This key is server-only and is never sent to the browser.
3. Saqer's server route (`app/api/saqer/route.ts`) uses this key on every request it handles — those requests cost money per Anthropic's pricing, and since this app has no login, anyone who can reach it can trigger them. Don't deploy this publicly without adding auth or another access gate in front of it.

## Run locally
 test
```bash
npm install
npm run dev
```

Then open http://localhost:3000 in your browser.

## Structure

- `app/` – routes (Overview, Raffle Validation, Branch Risk Intelligence, Audit Trail, Controls, Findings, Remediation)
- `components/` – shared UI (sidebar navigation)
- `lib/` – business logic and Supabase-backed data access (CSV parsing, raffle validation, branch risk scoring, findings/controls/remediation/audit trail storage)
- `supabase/schema.sql` – database schema; run this in the Supabase SQL editor before first use

Data is stored in Supabase (Postgres) as a single shared workspace — there is currently no login, so anyone with the project URL and anon key can read and write all data. Sample data files (`raffle-test-data.csv`, `complaints-test-data.csv`) are provided for manual testing via the Raffle Validation and Branch Risk upload flows.
