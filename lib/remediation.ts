import {
  REMEDIATION_AUDIT_EVENTS_STORAGE_KEY,
  REMEDIATION_STORAGE_KEY,
  readStorage,
  writeStorage,
} from './storage';
import type { Finding, Remediation, RemediationAuditEvent } from './types';

export function getRemediationRecords(): Record<string, Remediation> {
  return readStorage<Record<string, Remediation>>(REMEDIATION_STORAGE_KEY, {});
}

export function saveRemediationRecords(records: Record<string, Remediation>): void {
  writeStorage(REMEDIATION_STORAGE_KEY, records);
}

export function getRemediationByFinding(findingId: string): Remediation {
  const stored = getRemediationRecords()[findingId];
  return stored
    ? {
        findingId,
        status: (['Not Started', 'In Progress', 'Pending Validation', 'Completed', 'Closed'] as const).includes(
          stored.status
        )
          ? stored.status
          : 'Not Started',
        followUpDate: stored.followUpDate || '',
        auditorComments: stored.auditorComments || '',
        closureResult: stored.closureResult || '',
        evidence: stored.evidence || '',
        validationPerformed: stored.validationPerformed || '',
        validationDate: stored.validationDate || '',
        validationResult: (['Effective', 'Partially Effective', 'Ineffective'] as const).includes(
          stored.validationResult as 'Effective' | 'Partially Effective' | 'Ineffective'
        )
          ? stored.validationResult
          : '',
      }
    : {
        findingId,
        status: 'Not Started',
        followUpDate: '',
        auditorComments: '',
        closureResult: '',
        evidence: '',
        validationPerformed: '',
        validationDate: '',
        validationResult: '',
      };
}

export function hasRemediationRecord(findingId: string): boolean {
  return Boolean(getRemediationRecords()[findingId]);
}

export function saveRemediation(remediation: Remediation): void {
  const records = getRemediationRecords();
  records[remediation.findingId] = remediation;
  saveRemediationRecords(records);
}

export function getRemediationAuditEvents(): RemediationAuditEvent[] {
  return readStorage<RemediationAuditEvent[]>(REMEDIATION_AUDIT_EVENTS_STORAGE_KEY, []);
}

export function saveRemediationAuditEvents(events: RemediationAuditEvent[]): void {
  writeStorage(REMEDIATION_AUDIT_EVENTS_STORAGE_KEY, events);
}

export function recordRemediationAuditEvent(finding: Finding, remediation: Remediation, change: string): void {
  const events = getRemediationAuditEvents();
  events.push({
    dateTime: new Date().toISOString(),
    findingId: finding.findingId,
    relatedRunId: finding.relatedRunId,
    remediationStatus: remediation.status,
    validationResult: remediation.validationResult || 'Not completed',
    change,
  });
  saveRemediationAuditEvents(events);
}
