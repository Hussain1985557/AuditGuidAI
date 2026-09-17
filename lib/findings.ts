import { supabase } from './supabaseClient';
import type { Finding } from './types';

interface FindingRow {
  finding_id: string;
  related_run_id: string;
  title: string;
  audit_area: string;
  risk_rating: Finding['riskRating'];
  status: Finding['status'];
  criteria: string;
  condition: string;
  cause: string;
  risk_impact: string;
  recommendation: string;
  prepared_by: string;
  preparation_date: string | null;
  reviewed_by: string;
  review_date: string | null;
  management_response: string;
  action_owner: string;
  target_date: string | null;
  supporting_exception_evidence: Finding['supportingExceptionEvidence'];
  branch: string | null;
}

function fromRow(row: FindingRow): Finding {
  return {
    findingId: row.finding_id,
    relatedRunId: row.related_run_id || '',
    title: row.title || '',
    auditArea: row.audit_area || '',
    riskRating: row.risk_rating,
    status: row.status,
    criteria: row.criteria || '',
    condition: row.condition || '',
    cause: row.cause || '',
    riskImpact: row.risk_impact || '',
    recommendation: row.recommendation || '',
    preparedBy: row.prepared_by || '',
    preparationDate: row.preparation_date || '',
    reviewedBy: row.reviewed_by || '',
    reviewDate: row.review_date || '',
    managementResponse: row.management_response || '',
    actionOwner: row.action_owner || '',
    targetDate: row.target_date || '',
    supportingExceptionEvidence: row.supporting_exception_evidence || [],
    branch: row.branch || undefined,
  };
}

function toRow(finding: Finding): FindingRow {
  return {
    finding_id: finding.findingId,
    related_run_id: finding.relatedRunId,
    title: finding.title,
    audit_area: finding.auditArea,
    risk_rating: finding.riskRating,
    status: finding.status,
    criteria: finding.criteria,
    condition: finding.condition,
    cause: finding.cause,
    risk_impact: finding.riskImpact,
    recommendation: finding.recommendation,
    prepared_by: finding.preparedBy,
    preparation_date: finding.preparationDate || null,
    reviewed_by: finding.reviewedBy,
    review_date: finding.reviewDate || null,
    management_response: finding.managementResponse,
    action_owner: finding.actionOwner,
    target_date: finding.targetDate || null,
    supporting_exception_evidence: finding.supportingExceptionEvidence,
    branch: finding.branch || null,
  };
}

export async function getFindings(): Promise<Finding[]> {
  const { data, error } = await supabase.from('findings').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data as FindingRow[]).map(fromRow);
}

export async function generateFindingId(): Promise<string> {
  const year = new Date().getFullYear();
  const findings = await getFindings();
  const highest = findings.reduce((max, finding) => {
    const match = String(finding.findingId || '').match(new RegExp(`^F-${year}-(\\d{6})$`));
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `F-${year}-${String(highest + 1).padStart(6, '0')}`;
}

export async function upsertFinding(finding: Finding): Promise<void> {
  const { error } = await supabase.from('findings').upsert(toRow(finding));
  if (error) throw error;
}
