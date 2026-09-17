# AuditGuard AI

An audit analytics dashboard built with Next.js (App Router) and TypeScript.

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
- `lib/` – business logic and localStorage-backed data access (CSV parsing, raffle validation, branch risk scoring, findings/controls/remediation/audit trail storage)

Data is stored in the browser's `localStorage`; there is no backend. Sample data files (`raffle-test-data.csv`, `complaints-test-data.csv`) are provided for manual testing via the Raffle Validation and Branch Risk upload flows.
