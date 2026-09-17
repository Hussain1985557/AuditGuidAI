import { CONTROLS_STORAGE_KEY, readStorage, writeStorage } from './storage';
import type { Control } from './types';

export function getControls(): Control[] {
  return readStorage<Control[]>(CONTROLS_STORAGE_KEY, []);
}

export function saveControls(controls: Control[]): void {
  writeStorage(CONTROLS_STORAGE_KEY, controls);
}

export function generateControlId(): string {
  const year = new Date().getFullYear();
  const highest = getControls().reduce((max, control) => {
    const match = String(control.controlId || '').match(new RegExp(`^C-${year}-(\\d{6})$`));
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `C-${year}-${String(highest + 1).padStart(6, '0')}`;
}

export function upsertControl(control: Control): void {
  const controls = getControls();
  const existingIndex = controls.findIndex((item) => item.controlId === control.controlId);
  if (existingIndex >= 0) {
    controls[existingIndex] = control;
  } else {
    controls.push(control);
  }
  saveControls(controls);
}

export function ensureSeededControl(): void {
  if (getControls().length) {
    return;
  }
  saveControls([
    {
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
    },
  ]);
}
