-- One-off cleanup: clears out test/demo artifacts (duplicate branch risk demo rows from the
-- pre-fix race condition, plus smoke-test controls/findings/raffle runs) and resets the app to a
-- clean empty state. Safe to run any time you want a fresh start — it does not drop any tables.
--
-- After running this, branch risk demo data will be re-seeded exactly once, automatically, the
-- next time you open the Branch Risk Intelligence page.

delete from remediation_audit_events;
delete from remediation;
delete from working_papers;
delete from findings;
delete from controls;
delete from audit_trail_entries;
delete from branch_risk_records;
delete from branch_risk_uploads;

update branch_risk_settings
set demo_seeded = false,
    demo = true,
    weights = '{"complaints":15,"gl":20,"access":15,"shortages":20,"incidents":10,"findings":10,"controls":10}'
where id = 1;
