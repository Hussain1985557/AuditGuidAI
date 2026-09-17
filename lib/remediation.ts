import { supabase } from './supabaseClient';
import type { Finding, Remediation, RemediationAuditEvent } from './types';

interface RemediationRow {
  finding_id: string;
  status: Remediation['status'];
  follow_up_date: string | null;
  auditor_comments: string;
  closure_result: string;
  evidence: string;
  validation_performed: string;
  validation_date: string | null;
  validation_result: string;
}

function defaultRemediation(findingId: string): Remediation {
  return {
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

function fromRow(row: RemediationRow): Remediation {
  return {
    findingId: row.finding_id,
    status: (['Not Started', 'In Progress', 'Pending Validation', 'Completed', 'Closed'] as const).includes(row.status)
      ? row.status
      : 'Not Started',
    followUpDate: row.follow_up_date || '',
    auditorComments: row.auditor_comments || '',
    closureResult: row.closure_result || '',
    evidence: row.evidence || '',
    validationPerformed: row.validation_performed || '',
    validationDate: row.validation_date || '',
    validationResult: (['Effective', 'Partially Effective', 'Ineffective'] as const).includes(
      row.validation_result as 'Effective' | 'Partially Effective' | 'Ineffective'
    )
      ? (row.validation_result as Remediation['validationResult'])
      : '',
  };
}

function toRow(remediation: Remediation): RemediationRow {
  return {
    finding_id: remediation.findingId,
    status: remediation.status,
    follow_up_date: remediation.followUpDate || null,
    auditor_comments: remediation.auditorComments,
    closure_result: remediation.closureResult,
    evidence: remediation.evidence,
    validation_performed: remediation.validationPerformed,
    validation_date: remediation.validationDate || null,
    validation_result: remediation.validationResult,
  };
}

/** Bulk-fetches every remediation record, keyed by finding id. Use this for list views to avoid N+1 queries. */
export async function getRemediationRecords(): Promise<Record<string, Remediation>> {
  const { data, error } = await supabase.from('remediation').select('*');
  if (error) throw error;
  const map: Record<string, Remediation> = {};
  (data as RemediationRow[]).forEach((row) => {
    map[row.finding_id] = fromRow(row);
  });
  return map;
}

/** Looks up a remediation record from an already-fetched bulk map, filling in defaults if absent. */
export function remediationFromMap(map: Record<string, Remediation>, findingId: string): Remediation {
  return map[findingId] || defaultRemediation(findingId);
}

export async function getRemediationByFinding(findingId: string): Promise<Remediation> {
  const { data, error } = await supabase.from('remediation').select('*').eq('finding_id', findingId).maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as RemediationRow) : defaultRemediation(findingId);
}

export async function hasRemediationRecord(findingId: string): Promise<boolean> {
  const { data, error } = await supabase.from('remediation').select('finding_id').eq('finding_id', findingId).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function saveRemediation(remediation: Remediation): Promise<void> {
  const { error } = await supabase.from('remediation').upsert(toRow(remediation));
  if (error) throw error;
}

export async function getRemediationAuditEvents(): Promise<RemediationAuditEvent[]> {
  const { data, error } = await supabase.from('remediation_audit_events').select('*').order('date_time', { ascending: true });
  if (error) throw error;
  return data.map((row) => ({
    dateTime: row.date_time,
    findingId: row.finding_id,
    relatedRunId: row.related_run_id,
    remediationStatus: row.remediation_status,
    validationResult: row.validation_result,
    change: row.change,
  }));
}

export async function recordRemediationAuditEvent(finding: Finding, remediation: Remediation, change: string): Promise<void> {
  const { error } = await supabase.from('remediation_audit_events').insert({
    date_time: new Date().toISOString(),
    finding_id: finding.findingId,
    related_run_id: finding.relatedRunId,
    remediation_status: remediation.status,
    validation_result: remediation.validationResult || 'Not completed',
    change,
  });
  if (error) throw error;
}
