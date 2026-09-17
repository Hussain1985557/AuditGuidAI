import { supabase } from './supabaseClient';
import type {
  AuditTrailEntry,
  ValidatedRaffleRow,
  ValidationRules,
  ValidationSummary,
  WorkingPaper,
} from './types';

interface AuditTrailRow {
  run_id: string;
  date_time: string;
  file_name: string;
  campaign_start_date: string | null;
  campaign_end_date: string | null;
  minimum_eligible_amount: number;
  entries_per_eligible_amount: number;
  exclude_employees: boolean;
  exclude_reversed_transactions: boolean;
  total_records_tested: number;
  valid_records: number;
  invalid_records: number;
  duplicate_records: number;
  reversed_transactions: number;
  outside_campaign_period: number;
  exception_evidence: AuditTrailEntry['exceptionEvidence'];
  status: string;
}

function fromRow(row: AuditTrailRow): AuditTrailEntry {
  return {
    runId: row.run_id,
    dateTime: row.date_time,
    fileName: row.file_name,
    campaignStartDate: row.campaign_start_date || '',
    campaignEndDate: row.campaign_end_date || '',
    minimumEligibleAmount: row.minimum_eligible_amount,
    entriesPerEligibleAmount: row.entries_per_eligible_amount,
    excludeEmployees: row.exclude_employees ? 'Yes' : 'No',
    excludeReversedTransactions: row.exclude_reversed_transactions ? 'Yes' : 'No',
    totalRecordsTested: row.total_records_tested,
    validRecords: row.valid_records,
    invalidRecords: row.invalid_records,
    duplicateRecords: row.duplicate_records,
    reversedTransactions: row.reversed_transactions,
    outsideCampaignPeriod: row.outside_campaign_period,
    exceptionEvidence: row.exception_evidence,
    status: 'Completed',
  };
}

function toRow(entry: AuditTrailEntry): Omit<AuditTrailRow, 'status'> & { status: string } {
  return {
    run_id: entry.runId,
    date_time: entry.dateTime,
    file_name: entry.fileName,
    campaign_start_date: entry.campaignStartDate || null,
    campaign_end_date: entry.campaignEndDate || null,
    minimum_eligible_amount: entry.minimumEligibleAmount,
    entries_per_eligible_amount: entry.entriesPerEligibleAmount,
    exclude_employees: entry.excludeEmployees === 'Yes',
    exclude_reversed_transactions: entry.excludeReversedTransactions === 'Yes',
    total_records_tested: entry.totalRecordsTested,
    valid_records: entry.validRecords,
    invalid_records: entry.invalidRecords,
    duplicate_records: entry.duplicateRecords,
    reversed_transactions: entry.reversedTransactions,
    outside_campaign_period: entry.outsideCampaignPeriod,
    exception_evidence: entry.exceptionEvidence,
    status: entry.status,
  };
}

export async function getAuditTrailEntries(): Promise<AuditTrailEntry[]> {
  const { data, error } = await supabase.from('audit_trail_entries').select('*').order('date_time', { ascending: true });
  if (error) throw error;
  return (data as AuditTrailRow[]).map(fromRow);
}

export async function generateRunId(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const entries = await getAuditTrailEntries();
  const yearEntries = entries.filter((entry) => entry.runId && entry.runId.startsWith(`RV-${currentYear}-`));
  const highest = yearEntries.reduce((max, entry) => {
    const match = entry.runId.match(/RV-(\d{4})-(\d{6})$/);
    if (!match) {
      return max;
    }
    return Math.max(max, Number(match[2]));
  }, 0);

  const nextSequence = highest + 1;
  return `RV-${currentYear}-${String(nextSequence).padStart(6, '0')}`;
}

export async function buildAuditTrailRecord(
  fileName: string,
  rules: ValidationRules,
  summary: ValidationSummary,
  invalidRows: ValidatedRaffleRow[]
): Promise<AuditTrailEntry> {
  return {
    runId: await generateRunId(),
    dateTime: new Date().toISOString(),
    fileName,
    campaignStartDate: rules.startDate,
    campaignEndDate: rules.endDate,
    minimumEligibleAmount: rules.minimumEligibleAmount,
    entriesPerEligibleAmount: rules.entriesPerEligibleAmount,
    excludeEmployees: rules.excludeEmployees ? 'Yes' : 'No',
    excludeReversedTransactions: rules.excludeReversed ? 'Yes' : 'No',
    totalRecordsTested: summary.totalRecordsTested,
    validRecords: summary.validRecords,
    invalidRecords: summary.invalidRecords,
    duplicateRecords: summary.duplicateRecords,
    reversedTransactions: summary.reversedTransactions,
    outsideCampaignPeriod: summary.outsideCampaignPeriod,
    exceptionEvidence: invalidRows.map((row) => ({
      transactionId: row.Transaction_ID || '',
      transactionDate: row.Transaction_Date || '',
      transactionAmount: row.Amount || '',
      customerId: row.Customer_ID || '',
      raffleEntries: row.Entries || '0',
      validationResult: 'Invalid',
      exceptionReasons: Array.isArray(row.exceptions) ? row.exceptions.slice() : [],
    })),
    status: 'Completed',
  };
}

export async function persistAuditTrail(
  fileName: string,
  rules: ValidationRules,
  validRows: ValidatedRaffleRow[]
): Promise<AuditTrailEntry> {
  const totalRecordsTested = validRows.length;
  const validRecords = validRows.filter((row) => row.isValid).length;
  const invalidRecords = totalRecordsTested - validRecords;
  const duplicateRecords = validRows.filter((row) => row.exceptions.includes('Duplicate Transaction')).length;
  const reversedTransactions = validRows.filter((row) => row.exceptions.includes('Reversed Transaction')).length;
  const outsideCampaignPeriod = validRows.filter((row) => row.exceptions.includes('Outside Campaign Period')).length;

  const summary: ValidationSummary = {
    totalRecordsTested,
    validRecords,
    invalidRecords,
    duplicateRecords,
    reversedTransactions,
    outsideCampaignPeriod,
  };

  const record = await buildAuditTrailRecord(fileName, rules, summary, validRows.filter((row) => !row.isValid));
  const { error } = await supabase.from('audit_trail_entries').insert(toRow(record));
  if (error) throw error;
  return record;
}

export async function ensureSeededHistoricalRun(): Promise<void> {
  const { data, error } = await supabase
    .from('audit_trail_entries')
    .select('run_id')
    .eq('run_id', 'RV-2026-000004')
    .maybeSingle();
  if (error) throw error;
  if (data) return;

  const seed: AuditTrailEntry = {
    runId: 'RV-2026-000004',
    dateTime: '2026-03-15T10:42:00.000Z',
    fileName: 'raffle-test-data.csv',
    campaignStartDate: '2026-01-15',
    campaignEndDate: '2026-03-31',
    minimumEligibleAmount: 10,
    entriesPerEligibleAmount: 1,
    excludeEmployees: 'Yes',
    excludeReversedTransactions: 'Yes',
    totalRecordsTested: 13,
    validRecords: 3,
    invalidRecords: 10,
    duplicateRecords: 2,
    reversedTransactions: 2,
    outsideCampaignPeriod: 3,
    exceptionEvidence: null,
    status: 'Completed',
  };

  const { error: insertError } = await supabase.from('audit_trail_entries').insert(toRow(seed));
  // 23505 = unique_violation: another concurrent call (e.g. React Strict Mode's double effect
  // invocation in dev) already inserted the seed row first, which is fine.
  if (insertError && insertError.code !== '23505') throw insertError;
}

export async function getRunById(runId: string): Promise<AuditTrailEntry | null> {
  const { data, error } = await supabase.from('audit_trail_entries').select('*').eq('run_id', runId).maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as AuditTrailRow) : null;
}

export async function getRunEvidence(runId: string) {
  const run = await getRunById(runId);
  return run && Array.isArray(run.exceptionEvidence) ? run.exceptionEvidence : [];
}

interface WorkingPaperRow {
  run_id: string;
  auditor_notes: string;
  conclusion: string;
  prepared_by: string;
  reviewed_by: string;
  review_status: string;
  preparation_date: string | null;
  review_date: string | null;
}

function workingPaperFromRow(row: WorkingPaperRow): WorkingPaper {
  return {
    runId: row.run_id,
    auditorNotes: row.auditor_notes || '',
    conclusion: row.conclusion || '',
    preparedBy: row.prepared_by || '',
    reviewedBy: row.reviewed_by || '',
    reviewStatus: (['Draft', 'Prepared', 'Reviewed'] as const).includes(row.review_status as 'Draft' | 'Prepared' | 'Reviewed')
      ? (row.review_status as WorkingPaper['reviewStatus'])
      : 'Draft',
    preparationDate: row.preparation_date || '',
    reviewDate: row.review_date || '',
  };
}

export async function getWorkingPaperByRun(runId: string): Promise<WorkingPaper> {
  const { data, error } = await supabase.from('working_papers').select('*').eq('run_id', runId).maybeSingle();
  if (error) throw error;
  return data
    ? workingPaperFromRow(data as WorkingPaperRow)
    : {
        runId,
        auditorNotes: '',
        conclusion: '',
        preparedBy: '',
        reviewedBy: '',
        reviewStatus: 'Draft',
        preparationDate: '',
        reviewDate: '',
      };
}

export async function saveWorkingPaperByRun(runId: string, data: Omit<WorkingPaper, 'runId'>): Promise<void> {
  const { error } = await supabase.from('working_papers').upsert({
    run_id: runId,
    auditor_notes: data.auditorNotes || '',
    conclusion: data.conclusion || '',
    prepared_by: data.preparedBy || '',
    reviewed_by: data.reviewedBy || '',
    review_status: data.reviewStatus || 'Draft',
    preparation_date: data.preparationDate || null,
    review_date: data.reviewDate || null,
  });
  if (error) throw error;
}
