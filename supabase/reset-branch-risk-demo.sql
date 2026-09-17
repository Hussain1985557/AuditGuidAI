-- Resets only the Branch Risk Intelligence data (not findings/controls/audit trail) so the
-- expanded demo dataset (7 branches instead of 2, spanning Low through Critical) re-seeds
-- automatically the next time you open Branch Risk Intelligence or Risk Map.

delete from branch_risk_records;
delete from branch_risk_uploads;

update branch_risk_settings
set demo_seeded = false,
    demo = true
where id = 1;
