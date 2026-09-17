import { AUDIT_TRAIL_STORAGE_KEY, WORKING_PAPER_STORAGE_KEY, readStorage, writeStorage } from './storage';
import type {
  AuditTrailEntry,
  ValidatedRaffleRow,
  ValidationRules,
  ValidationSummary,
  WorkingPaper,
} from './types';

export function getAuditTrailEntries(): AuditTrailEntry[] {
  return readStorage<AuditTrailEntry[]>(AUDIT_TRAIL_STORAGE_KEY, []);
}

export function saveAuditTrailEntries(entries: AuditTrailEntry[]): void {
  writeStorage(AUDIT_TRAIL_STORAGE_KEY, entries);
}

export function generateRunId(): string {
  const currentYear = new Date().getFullYear();
  const entries = getAuditTrailEntries();
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

export function buildAuditTrailRecord(
  fileName: string,
  rules: ValidationRules,
  summary: ValidationSummary,
  invalidRows: ValidatedRaffleRow[]
): AuditTrailEntry {
  return {
    runId: generateRunId(),
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

export function persistAuditTrail(fileName: string, rules: ValidationRules, validRows: ValidatedRaffleRow[]): AuditTrailEntry {
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

  const record = buildAuditTrailRecord(fileName, rules, summary, validRows.filter((row) => !row.isValid));
  const entries = getAuditTrailEntries();
  entries.push(record);
  saveAuditTrailEntries(entries);
  return record;
}

export function ensureSeededHistoricalRun(): void {
  const entries = getAuditTrailEntries();
  if (entries.some((entry) => entry.runId === 'RV-2026-000004')) {
    return;
  }

  entries.push({
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
  });

  saveAuditTrailEntries(entries);
}

export function getRunById(runId: string): AuditTrailEntry | null {
  return getAuditTrailEntries().find((entry) => entry.runId === runId) || null;
}

export function getRunEvidence(runId: string) {
  const run = getRunById(runId);
  return run && Array.isArray(run.exceptionEvidence) ? run.exceptionEvidence : [];
}

export function getWorkingPapers(): Record<string, WorkingPaper> {
  return readStorage<Record<string, WorkingPaper>>(WORKING_PAPER_STORAGE_KEY, {});
}

export function saveWorkingPapers(workingPapers: Record<string, WorkingPaper>): void {
  writeStorage(WORKING_PAPER_STORAGE_KEY, workingPapers);
}

export function getWorkingPaperByRun(runId: string): WorkingPaper {
  const workingPapers = getWorkingPapers();
  const stored = workingPapers[runId];
  return stored
    ? {
        runId,
        auditorNotes: stored.auditorNotes || '',
        conclusion: stored.conclusion || '',
        preparedBy: stored.preparedBy || '',
        reviewedBy: stored.reviewedBy || '',
        reviewStatus: (['Draft', 'Prepared', 'Reviewed'] as const).includes(stored.reviewStatus)
          ? stored.reviewStatus
          : 'Draft',
        preparationDate: stored.preparationDate || '',
        reviewDate: stored.reviewDate || '',
      }
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

export function saveWorkingPaperByRun(runId: string, data: Omit<WorkingPaper, 'runId'>): void {
  const workingPapers = getWorkingPapers();
  workingPapers[runId] = {
    runId,
    auditorNotes: data.auditorNotes || '',
    conclusion: data.conclusion || '',
    preparedBy: data.preparedBy || '',
    reviewedBy: data.reviewedBy || '',
    reviewStatus: data.reviewStatus || 'Draft',
    preparationDate: data.preparationDate || '',
    reviewDate: data.reviewDate || '',
  };
  saveWorkingPapers(workingPapers);
}
