import { supabase } from './supabaseClient';
import type { Control } from './types';

interface ControlRow {
  control_id: string;
  control_name: string;
  audit_area: string;
  control_objective: string;
  risk_addressed: string;
  control_type: Control['controlType'];
  control_nature: Control['controlNature'];
  frequency: Control['frequency'];
  control_owner: string;
  control_status: Control['controlStatus'];
  related_run_id: string;
  related_finding_id: string;
  design_effectiveness: Control['designEffectiveness'];
  operating_effectiveness: Control['operatingEffectiveness'];
  auditor_notes: string;
}

function fromRow(row: ControlRow): Control {
  return {
    controlId: row.control_id,
    controlName: row.control_name || '',
    auditArea: row.audit_area || '',
    controlObjective: row.control_objective || '',
    riskAddressed: row.risk_addressed || '',
    controlType: row.control_type,
    controlNature: row.control_nature,
    frequency: row.frequency,
    controlOwner: row.control_owner || '',
    controlStatus: row.control_status,
    relatedRunId: row.related_run_id || '',
    relatedFindingId: row.related_finding_id || '',
    designEffectiveness: row.design_effectiveness,
    operatingEffectiveness: row.operating_effectiveness,
    auditorNotes: row.auditor_notes || '',
  };
}

function toRow(control: Control): ControlRow {
  return {
    control_id: control.controlId,
    control_name: control.controlName,
    audit_area: control.auditArea,
    control_objective: control.controlObjective,
    risk_addressed: control.riskAddressed,
    control_type: control.controlType,
    control_nature: control.controlNature,
    frequency: control.frequency,
    control_owner: control.controlOwner,
    control_status: control.controlStatus,
    related_run_id: control.relatedRunId,
    related_finding_id: control.relatedFindingId,
    design_effectiveness: control.designEffectiveness,
    operating_effectiveness: control.operatingEffectiveness,
    auditor_notes: control.auditorNotes,
  };
}

export async function getControls(): Promise<Control[]> {
  const { data, error } = await supabase.from('controls').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data as ControlRow[]).map(fromRow);
}

export async function generateControlId(): Promise<string> {
  const year = new Date().getFullYear();
  const controls = await getControls();
  const highest = controls.reduce((max, control) => {
    const match = String(control.controlId || '').match(new RegExp(`^C-${year}-(\\d{6})$`));
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `C-${year}-${String(highest + 1).padStart(6, '0')}`;
}

export async function upsertControl(control: Control): Promise<void> {
  const { error } = await supabase.from('controls').upsert(toRow(control));
  if (error) throw error;
}

export async function ensureSeededControl(): Promise<void> {
  const { count, error } = await supabase.from('controls').select('control_id', { count: 'exact', head: true });
  if (error) throw error;
  if (count) return;

  const seed: Control = {
    controlId: 'C-2026-000001',
    controlName: 'Raffle Entry Eligibility Validation',
    auditArea: 'Raffle Campaign Controls',
    controlObjective:
      'Ensure raffle entries are issued only to eligible transactions in accordance with approved campaign rules.',
    riskAddressed:
      'Ineligible, duplicate, reversed, employee, out-of-period, or incorrectly calculated transactions may receive raffle entries.',
    controlType: 'Preventive',
    controlNature: 'Automated',
    frequency: 'Per Transaction',
    controlOwner: 'IT Manager',
    controlStatus: 'Active',
    relatedRunId: 'RV-2026-000008',
    relatedFindingId: 'F-2026-000001',
    designEffectiveness: 'Effective',
    operatingEffectiveness: 'Ineffective',
    auditorNotes:
      'Testing identified exceptions in the operation of the raffle eligibility control. The related finding and remediation record provide the detailed audit trail.',
  };

  const { error: insertError } = await supabase.from('controls').insert(toRow(seed));
  // 23505 = unique_violation: another concurrent call (e.g. React Strict Mode's double effect
  // invocation in dev) already inserted the seed row first, which is fine.
  if (insertError && insertError.code !== '23505') throw insertError;
}
