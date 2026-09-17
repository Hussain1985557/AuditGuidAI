import { downloadCsv, normalizeHeader, parseCSV } from './csv';
import { getFindings } from './findings';
import { supabase } from './supabaseClient';
import type {
  BranchRiskMetric,
  BranchRiskSourceKey,
  BranchRiskStore,
  BranchRiskWeights,
  BranchSourceRecord,
  BranchUploadMeta,
  PendingBranchImport,
} from './types';

export const branchRiskDefaultWeights: BranchRiskWeights = {
  complaints: 15,
  gl: 20,
  access: 15,
  shortages: 20,
  incidents: 10,
  findings: 10,
  controls: 10,
};

export interface BranchRiskSourceDefinition {
  key: BranchRiskSourceKey;
  label: string;
  department: string;
  icon: string;
}

export const branchRiskSourceDefinitions: BranchRiskSourceDefinition[] = [
  { key: 'complaints', label: 'Customer Complaints', department: 'Compliance / Complaints Officer', icon: '☷' },
  { key: 'gl', label: 'GL Transactions', department: 'Finance / Core Banking', icon: '∑' },
  { key: 'access', label: 'Branch Access Logs', department: 'Security / Access Control System', icon: '⌁' },
  { key: 'shortages', label: 'Teller Cash Shortages', department: 'Zone Managers / Branch Operations', icon: '¤' },
  { key: 'incidents', label: 'Incident Reports', department: 'Zone Managers / Branch Management', icon: '⚑' },
];

export const branchRiskDemoSources: Record<BranchRiskSourceKey, BranchSourceRecord[]> = {
  complaints: [
    { complaintId: 'CMP-004-01', complaintDate: '2026-09-03', branch: 'Branch 004', complaintCategory: 'Teller service', complaintDescription: 'Long wait and transaction handling concern', status: 'Open', outcome: '', severity: 'Medium' },
    { complaintId: 'CMP-004-02', complaintDate: '2026-09-05', branch: 'Branch 004', complaintCategory: 'Incorrect information from branch staff', complaintDescription: 'Customer received conflicting information', status: 'Under Review', outcome: '', severity: 'High' },
    { complaintId: 'CMP-005-01', complaintDate: '2026-09-04', branch: 'Branch 005', complaintCategory: 'Service quality', complaintDescription: 'Service delay', status: 'Closed', outcome: 'Resolved', severity: 'Low' },
  ],
  gl: [
    { transactionId: 'GL-004-01', branch: 'Branch 004', userId: 'E104', employeeId: 'E104', date: '2026-09-03', time: '23:51', glAccount: '7001', transactionType: 'Manual Adjustment', amount: '8200', manualEntry: 'Yes', reversal: 'No', authorizationUser: 'M201' },
    { transactionId: 'GL-004-02', branch: 'Branch 004', userId: 'E104', employeeId: 'E104', date: '2026-09-06', time: '22:18', glAccount: '7001', transactionType: 'Manual Adjustment', amount: '6100', manualEntry: 'Yes', reversal: 'Yes', authorizationUser: 'M201' },
    { transactionId: 'GL-005-01', branch: 'Branch 005', userId: 'T104', employeeId: 'T104', date: '2026-09-02', time: '10:14', glAccount: '7001', transactionType: 'Manual Adjustment', amount: '480', manualEntry: 'Yes', reversal: 'No', authorizationUser: 'M202' },
  ],
  access: [
    { employeeId: 'E104', employeeName: 'Demo Employee', branch: 'Branch 004', accessDate: '2026-09-03', entryTime: '23:42', exitTime: '23:59', accessPoint: 'Main Entrance' },
    { employeeId: 'E104', employeeName: 'Demo Employee', branch: 'Branch 004', accessDate: '2026-09-06', entryTime: '22:02', exitTime: '22:35', accessPoint: 'Back Office' },
    { employeeId: 'T104', employeeName: 'Demo Teller', branch: 'Branch 005', accessDate: '2026-09-02', entryTime: '06:45', exitTime: '07:10', accessPoint: 'Main Entrance' },
  ],
  shortages: [
    { branch: 'Branch 005', date: '2026-09-02', tellerUserId: 'T104', employeeId: 'T104', shortageAmount: '120', currency: 'BHD', reason: 'Cash count variance', incidentReportNumber: 'INC-005-01', investigationResult: 'Open', recovered: 'No', repeatIncident: 'Yes' },
    { branch: 'Branch 005', date: '2026-09-05', tellerUserId: 'T104', employeeId: 'T104', shortageAmount: '180', currency: 'BHD', reason: 'Cash count variance', incidentReportNumber: 'INC-005-02', investigationResult: 'Open', recovered: 'No', repeatIncident: 'Yes' },
    { branch: 'Branch 004', date: '2026-09-06', tellerUserId: 'T204', employeeId: 'T204', shortageAmount: '80', currency: 'BHD', reason: 'Unresolved difference', incidentReportNumber: 'INC-004-01', investigationResult: 'Open', recovered: 'No', repeatIncident: 'No' },
  ],
  incidents: [
    { incidentId: 'INC-005-01', branch: 'Branch 005', date: '2026-09-02', employeeUser: 'T104', incidentType: 'Cash shortage', description: 'Teller shortage recorded', rootCause: '', zoneManager: 'Manager 005', managementResponse: '', status: 'Open' },
    { incidentId: 'INC-005-02', branch: 'Branch 005', date: '2026-09-05', employeeUser: 'T104', incidentType: 'Cash shortage', description: 'Repeat teller shortage recorded', rootCause: '', zoneManager: 'Manager 005', managementResponse: '', status: 'Open' },
    { incidentId: 'INC-004-01', branch: 'Branch 004', date: '2026-09-06', employeeUser: 'T204', incidentType: 'Cash shortage', description: 'Shortage requires review', rootCause: '', zoneManager: 'Manager 004', managementResponse: '', status: 'Open' },
  ],
};

export function canonicalBranchId(value: unknown): string {
  const normalized = String(value || '').trim().replace(/^branch\s*/i, '').trim();
  if (!normalized) {
    return '';
  }

  const numericId = normalized.match(/^\d+$/);
  return numericId ? numericId[0].padStart(3, '0') : normalized.toUpperCase();
}

export function branchDisplayName(branchId: string): string {
  return /^\d+$/.test(branchId) ? `Branch ${branchId}` : branchId;
}

// --- Supabase-backed store ---

interface BranchRiskRecordRow {
  id: number;
  source_key: BranchRiskSourceKey;
  canonical_branch_id: string;
  branch: string;
  data: BranchSourceRecord;
}

function recordFromRow(row: BranchRiskRecordRow): BranchSourceRecord {
  return { ...row.data, canonicalBranchId: row.canonical_branch_id, branch: row.branch };
}

function recordToRow(sourceKey: BranchRiskSourceKey, record: BranchSourceRecord) {
  const rawBranch =
    record.canonicalBranchId || record.branch || record.Branch || record.branchId || record.Branch_ID || record.Branch_Name || '';
  const canonicalId = canonicalBranchId(rawBranch);
  return {
    source_key: sourceKey,
    canonical_branch_id: canonicalId,
    branch: canonicalId ? branchDisplayName(canonicalId) : '',
    data: record,
  };
}

interface BranchUploadRow {
  source_key: BranchRiskSourceKey;
  file_name: string;
  worksheet_name: string;
  detected_columns: string[];
  upload_date: string;
  import_batch_id: string;
  records: number;
  invalid_records: number;
  duplicate_records: number;
  status: string;
}

function uploadFromRow(row: BranchUploadRow): BranchUploadMeta {
  return {
    fileName: row.file_name,
    worksheetName: row.worksheet_name,
    detectedColumns: row.detected_columns,
    uploadDate: row.upload_date,
    importBatchId: row.import_batch_id,
    records: row.records,
    invalidRecords: row.invalid_records,
    duplicateRecords: row.duplicate_records,
    status: row.status,
  };
}

export async function getBranchRiskStore(): Promise<BranchRiskStore> {
  const [recordsRes, uploadsRes, settingsRes] = await Promise.all([
    supabase.from('branch_risk_records').select('*'),
    supabase.from('branch_risk_uploads').select('*'),
    supabase.from('branch_risk_settings').select('*').eq('id', 1).maybeSingle(),
  ]);
  if (recordsRes.error) throw recordsRes.error;
  if (uploadsRes.error) throw uploadsRes.error;
  if (settingsRes.error) throw settingsRes.error;

  const sources: BranchRiskStore['sources'] = {};
  (recordsRes.data as BranchRiskRecordRow[]).forEach((row) => {
    const key = row.source_key;
    const bucket = sources[key] || [];
    bucket.push(recordFromRow(row));
    sources[key] = bucket;
  });

  const uploads: BranchRiskStore['uploads'] = {};
  (uploadsRes.data as BranchUploadRow[]).forEach((row) => {
    uploads[row.source_key] = uploadFromRow(row);
  });

  const settings = settingsRes.data as { weights: BranchRiskWeights; demo: boolean } | null;

  return {
    sources,
    uploads,
    weights: settings?.weights || branchRiskDefaultWeights,
    demo: settings?.demo ?? true,
  };
}

export function branchRiskRecords(store: BranchRiskStore, key: BranchRiskSourceKey): BranchSourceRecord[] {
  return store.sources[key] || [];
}

export async function ensureBranchRiskDemoData(): Promise<void> {
  // Atomic compare-and-set: only a call that actually flips demo_seeded false -> true proceeds to
  // seed. This makes seeding happen exactly once ever, safely under concurrent calls, and means a
  // later "Clear Demo Branch Data" stays cleared instead of being re-seeded on the next visit.
  const { data: won, error: lockError } = await supabase
    .from('branch_risk_settings')
    .update({ demo_seeded: true })
    .eq('id', 1)
    .eq('demo_seeded', false)
    .select('id');
  if (lockError) throw lockError;
  if (!won?.length) return;

  const rows = (Object.entries(branchRiskDemoSources) as [BranchRiskSourceKey, BranchSourceRecord[]][]).flatMap(
    ([sourceKey, records]) => records.map((record) => recordToRow(sourceKey, record))
  );
  const { error: insertError } = await supabase.from('branch_risk_records').insert(rows);
  if (insertError) throw insertError;

  const { error: settingsError } = await supabase
    .from('branch_risk_settings')
    .update({ weights: branchRiskDefaultWeights, demo: true })
    .eq('id', 1);
  if (settingsError) throw settingsError;
}

async function replaceBranchRiskSource(sourceKey: BranchRiskSourceKey, records: BranchSourceRecord[]): Promise<void> {
  const { error: deleteError } = await supabase.from('branch_risk_records').delete().eq('source_key', sourceKey);
  if (deleteError) throw deleteError;
  if (!records.length) return;
  const rows = records.map((record) => recordToRow(sourceKey, record));
  const { error: insertError } = await supabase.from('branch_risk_records').insert(rows);
  if (insertError) throw insertError;
}

export async function saveBranchRiskWeights(weights: BranchRiskWeights): Promise<void> {
  const { error } = await supabase.from('branch_risk_settings').upsert({ id: 1, weights });
  if (error) throw error;
}

export async function clearAllBranchRiskData(): Promise<void> {
  const { error: recordsError } = await supabase.from('branch_risk_records').delete().not('id', 'is', null);
  if (recordsError) throw recordsError;
  const { error: uploadsError } = await supabase.from('branch_risk_uploads').delete().not('source_key', 'is', null);
  if (uploadsError) throw uploadsError;
  const { error: settingsError } = await supabase.from('branch_risk_settings').update({ demo: false }).eq('id', 1);
  if (settingsError) throw settingsError;
}

export function branchName(record: BranchSourceRecord): string {
  return canonicalBranchId(
    record.canonicalBranchId ||
      record.branch ||
      record.Branch ||
      record.branchId ||
      record.Branch_ID ||
      record.Branch_Name ||
      ''
  );
}

export function isAfterHours(time: unknown): boolean {
  const hour = Number(String(time || '').split(':')[0]);
  return Number.isFinite(hour) && (hour < 7 || hour >= 20);
}

export function isWeekend(date: unknown): boolean {
  const parsed = new Date(String(date));
  return !Number.isNaN(parsed.getTime()) && [0, 6].includes(parsed.getDay());
}

export function branchRiskRating(score: number): BranchRiskMetric['rating'] {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 30) return 'Moderate';
  return 'Low';
}

export interface BranchRiskSourceMeta {
  sourceType: string;
  department: string;
  sourceFile: string;
  imported: string;
  importBatch: string;
}

export function branchRiskSourceMeta(sourceKey: BranchRiskSourceKey, store: BranchRiskStore): BranchRiskSourceMeta {
  const definition = branchRiskSourceDefinitions.find((source) => source.key === sourceKey);
  const upload = store.uploads?.[sourceKey];
  return {
    sourceType: definition?.label || sourceKey,
    department: definition?.department || 'Not recorded',
    sourceFile: upload?.fileName || (store.demo ? 'Branch Risk demo dataset' : 'Not recorded'),
    imported: upload?.uploadDate ? new Date(upload.uploadDate).toLocaleString() : 'Not recorded',
    importBatch: upload?.importBatchId || 'Not recorded',
  };
}

export function branchRecordReference(record: BranchSourceRecord, sourceKey: string): string {
  return String(
    record.complaintReference ||
      record.complaintId ||
      record.transactionId ||
      record.referenceNumber ||
      record.incidentId ||
      record.incidentReportNumber ||
      record.employeeId ||
      `${sourceKey}-record`
  );
}

export function branchEvidenceFields(record: BranchSourceRecord, sourceKey: BranchRiskSourceKey): [string, unknown][] {
  if (sourceKey === 'complaints') {
    return [
      ['Complaint Reference', branchRecordReference(record, sourceKey)],
      ['Date', record.complaintDate || record.date],
      ['Branch', record.branch || record.branchName],
      ['Category', record.category || record.complaintCategory],
      ['Employee/User', record.employeeId],
      ['Description', record.description || record.complaintDescription],
      ['Classification', record.classification || 'Branch record retained in source'],
      ['Scoring Reason', 'Stored branch complaint included in the current complaint contribution.'],
    ];
  }
  if (sourceKey === 'gl') {
    return [
      ['Transaction Reference', branchRecordReference(record, sourceKey)],
      ['Date', record.date],
      ['Time', record.time],
      ['Branch', record.branch],
      ['Employee/User ID', record.employeeId || record.userId],
      ['GL Account', record.glAccount],
      ['Amount', record.amount],
      ['Exception Type', 'GL Timing / Manual / Amount / Reversal indicator'],
      ['Reason Flagged', 'Matched the existing GL exception predicate.'],
    ];
  }
  if (sourceKey === 'access') {
    return [
      ['Access Event ID', branchRecordReference(record, sourceKey)],
      ['Date', record.accessDate],
      ['Time', record.entryTime],
      ['Branch', record.branch],
      ['Employee/User ID', record.employeeId],
      ['Access Point', record.accessPoint],
      ['Event Type', 'Access exception'],
      ['Reason Flagged', 'After-hours or weekend access matched the existing predicate.'],
    ];
  }
  if (sourceKey === 'shortages') {
    return [
      ['Shortage Reference', branchRecordReference(record, sourceKey)],
      ['Date', record.date],
      ['Branch', record.branch],
      ['Teller/User ID', record.tellerUserId || record.employeeId],
      ['Amount', record.shortageAmount],
      ['Reason', record.reason],
      ['Incident Reference', record.incidentReportNumber],
      ['Status', record.investigationResult || record.status],
      ['Scoring Reason', 'Stored shortage record counted by the existing methodology.'],
    ];
  }
  return [
    ['Incident Reference', branchRecordReference(record, sourceKey)],
    ['Date', record.date],
    ['Branch', record.branch],
    ['Employee/User', record.employeeUser || record.employeeId],
    ['Incident Type', record.incidentType],
    ['Description', record.description],
    ['Root Cause', record.rootCause],
    ['Corrective Action', record.managementResponse],
    ['Status', record.status],
    ['Scoring Reason', 'Stored incident record counted by the existing methodology.'],
  ];
}

export async function branchRiskMetrics(): Promise<BranchRiskMetric[]> {
  const [store, findings] = await Promise.all([getBranchRiskStore(), getFindings()]);
  const branches = new Set<string>();
  branchRiskSourceDefinitions.forEach(({ key }) =>
    branchRiskRecords(store, key).forEach((record) => {
      if (branchName(record)) branches.add(branchName(record));
    })
  );
  const scores: BranchRiskMetric[] = [];
  branches.forEach((branch) => {
    const complaints = branchRiskRecords(store, 'complaints').filter((r) => branchName(r) === branch);
    const gl = branchRiskRecords(store, 'gl').filter((r) => branchName(r) === branch);
    const access = branchRiskRecords(store, 'access').filter((r) => branchName(r) === branch);
    const shortages = branchRiskRecords(store, 'shortages').filter((r) => branchName(r) === branch);
    const incidents = branchRiskRecords(store, 'incidents').filter((r) => branchName(r) === branch);
    const openFindings = findings.filter(
      (finding) => canonicalBranchId(finding.branch) === branch && finding.status !== 'Closed'
    );
    const overdueActions = openFindings.filter(
      (finding) => finding.targetDate && new Date(finding.targetDate) < new Date()
    );
    const glExceptions = gl.filter(
      (r) =>
        isAfterHours(r.time) ||
        String(r.manualEntry).toLowerCase() === 'yes' ||
        Number(r.amount) >= 5000 ||
        String(r.reversal).toLowerCase() === 'yes'
    );
    const accessExceptions = access.filter((r) => isAfterHours(r.entryTime) || isWeekend(r.accessDate));
    const riskEvents =
      complaints.length +
      glExceptions.length +
      accessExceptions.length +
      shortages.length +
      incidents.length +
      openFindings.length +
      overdueActions.length;
    const weights = store.weights || branchRiskDefaultWeights;
    const contributions: BranchRiskWeights = {
      complaints: Math.min(weights.complaints, complaints.length * 5),
      gl: Math.min(weights.gl, glExceptions.length * 7),
      access: Math.min(weights.access, accessExceptions.length * 7),
      shortages: Math.min(weights.shortages, shortages.length * 7),
      incidents: Math.min(weights.incidents, incidents.length * 5),
      findings: Math.min(weights.findings, openFindings.length * 5),
      controls: overdueActions.length ? Math.min(weights.controls, overdueActions.length * 5) : 0,
    };
    const score = Math.min(100, Object.values(contributions).reduce((sum, value) => sum + value, 0));
    scores.push({
      branch,
      displayBranch: branchDisplayName(branch),
      score,
      rating: branchRiskRating(score),
      complaints,
      gl,
      access,
      shortages,
      incidents,
      glExceptions,
      accessExceptions,
      openFindings,
      overdueActions,
      contributions,
      riskEvents,
    });
  });
  return scores.sort((a, b) => b.score - a.score);
}

// --- Complaint workbook import ---

export const complaintHeaderAliases: Record<string, string[]> = {
  reference: ['complaint reference', 'complaint ref', 'complaint id', 'complaint number', 'complaint no', 'reference', 'reference number', 'case id', 'ticket id'],
  date: ['complaint date', 'date', 'received date', 'date received', 'created date'],
  branchId: ['branch id', 'branch code', 'branch number', 'branch no'],
  branchName: ['branch name', 'branch'],
  customerId: ['customer id', 'customer number', 'client id'],
  employeeId: ['employee id', 'employee number', 'user id', 'staff id'],
  category: ['complaint category', 'category', 'complaint type', 'type'],
  description: ['complaint description', 'description', 'details', 'complaint details'],
  status: ['complaint status', 'status', 'case status'],
  outcome: ['resolution', 'outcome', 'resolution outcome', 'result'],
};

export function normalizedHeader(value: unknown): string {
  return String(value || '').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function findComplaintColumn(headers: string[], aliases: string[]): string | undefined {
  return headers.find((header) => aliases.includes(normalizedHeader(header)));
}

export function classifyComplaint(complaint: { category?: string; description?: string }): string {
  const text = `${complaint.category || ''} ${complaint.description || ''}`.toLowerCase();
  const physicalBranchIndicators = [
    'physical branch', 'branch service', 'branch operation', 'branch operations', 'branch teller',
    'branch cashier', 'branch staff', 'branch employee', 'teller', 'cashier', 'cash deposit',
    'cash withdrawal', 'cash handling', 'cash shortage', 'cash overage', 'customer service at branch',
    'transaction handled at branch', 'branch queue', 'branch waiting',
  ];
  const centralizedChannelIndicators = [
    'mobile banking', 'mobile application', 'mobile app', 'digital banking', 'internet banking',
    'online banking', 'website', 'web banking', 'call centre', 'call center', 'call-centre',
    'telephone banking', 'telephone service', 'phone banking', 'online card transaction',
    'online card transactions', 'digital channel', 'centralized channel', 'centralised channel',
  ];
  const hasPhysicalBranchEvidence = physicalBranchIndicators.some((indicator) => text.includes(indicator));
  const hasCentralizedChannelEvidence = centralizedChannelIndicators.some((indicator) => text.includes(indicator));
  const atmHasBranchContext = text.includes('atm') && (text.includes('branch') || text.includes('teller') || text.includes('cashier'));

  if (hasCentralizedChannelEvidence && !hasPhysicalBranchEvidence && !atmHasBranchContext) {
    return 'Non-Branch Related';
  }
  if (hasPhysicalBranchEvidence || atmHasBranchContext) {
    return 'Branch Related';
  }
  return 'Requires Auditor Review';
}

export function complaintMappingStatus(complaint: { branchId?: string }): string {
  if (complaint.branchId) return 'Mapped';
  return 'Branch Mapping Required';
}

export interface ComplaintWorkbookData {
  worksheetName: string;
  headers: string[];
  rows: Record<string, unknown>[];
  columns: Record<string, string | undefined>;
}

export async function readComplaintWorkbook(file: File): Promise<ComplaintWorkbookData> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const worksheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[worksheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '', raw: false });
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const columns = Object.fromEntries(
    Object.entries(complaintHeaderAliases).map(([key, aliases]) => [key, findComplaintColumn(headers, aliases)])
  );
  return { worksheetName, headers, rows, columns };
}

export async function buildPendingComplaintImport(file: File): Promise<PendingBranchImport> {
  const workbookData = await readComplaintWorkbook(file);
  const { rows, columns } = workbookData;
  const complaints = rows.map((row, index) => {
    const value = (key: string) => (columns[key] ? String(row[columns[key] as string] ?? '').trim() : '');
    const complaint: BranchSourceRecord = {
      originalRecord: row,
      rowNumber: index + 2,
      complaintReference: value('reference'),
      complaintDate: value('date'),
      branchId: value('branchId'),
      branchName: value('branchName'),
      customerId: value('customerId'),
      employeeId: value('employeeId'),
      category: value('category'),
      description: value('description'),
      status: value('status'),
      outcome: value('outcome'),
    };
    complaint.classification = classifyComplaint(complaint as { category?: string; description?: string });
    complaint.canonicalBranchId = canonicalBranchId(complaint.branchId || complaint.branchName);
    complaint.mappingStatus =
      complaint.classification === 'Branch Related'
        ? complaintMappingStatus(complaint as { branchId?: string })
        : 'Not Applicable';
    complaint.include = complaint.classification === 'Branch Related' && complaint.mappingStatus === 'Mapped';
    complaint.invalid =
      !complaint.complaintReference ||
      !complaint.complaintDate ||
      Number.isNaN(new Date(String(complaint.complaintDate)).getTime());
    complaint.shortDescription = String(complaint.description || '').slice(0, 120);
    return complaint;
  });
  const references = complaints.map((complaint) => String(complaint.complaintReference || '')).filter(Boolean);
  const duplicateReferences = new Set(references.filter((reference, index) => references.indexOf(reference) !== index));
  complaints.forEach((complaint) => {
    complaint.duplicate = Boolean(complaint.complaintReference && duplicateReferences.has(String(complaint.complaintReference)));
  });
  const invalidRecords = complaints.filter((complaint) => complaint.invalid).length;
  return {
    sourceKey: 'complaints',
    fileName: file.name,
    worksheetName: workbookData.worksheetName,
    detectedColumns: workbookData.headers,
    data: complaints,
    records: complaints.length,
    mappedRecords: complaints.filter((complaint) => complaint.mappingStatus === 'Mapped').length,
    invalidRecords,
    duplicateRecords: complaints.filter((complaint) => complaint.duplicate).length,
    uploadDate: new Date().toISOString(),
  };
}

function asString(value: unknown): string {
  return value === undefined || value === null || value === '' ? '' : String(value);
}

export function normalizeBranchRiskRecord(record: BranchSourceRecord, sourceKey: BranchRiskSourceKey): BranchSourceRecord {
  const normalized: BranchSourceRecord = { ...record };
  normalized.branch = asString(record.Branch_ID) || asString(record.Branch) || asString(record.branch) || asString(record.Branch_Name);
  normalized.branchName = asString(record.Branch_Name) || asString(record.branchName) || normalized.branch;
  normalized.employeeUserId =
    asString(record.Employee_ID) || asString(record.EmployeeId) || asString(record.User_ID) || asString(record.Teller_User_ID) || asString(record.Teller_ID);
  normalized.date =
    asString(record.Date) || asString(record.Transaction_Date) || asString(record.Complaint_Date) || asString(record.Access_Date) || asString(record.Incident_Date);
  normalized.time = asString(record.Time) || asString(record.Entry_Time) || asString(record.EntryTime);
  normalized.eventType =
    asString(record.Event_Type) || asString(record.Transaction_Type) || asString(record.Complaint_Category) || asString(record.Incident_Type);
  normalized.amount = asString(record.Amount) || asString(record.Shortage_Amount) || asString(record.Amount_BHD);
  normalized.description =
    asString(record.Description) || asString(record.Complaint_Description) || asString(record.Reason) || asString(record.Description_Reason);
  normalized.referenceNumber =
    asString(record.Reference_Number) ||
    asString(record.Transaction_ID) ||
    asString(record.Complaint_ID) ||
    asString(record.Incident_ID) ||
    asString(record.Incident_Report_Number);
  normalized.canonicalBranchId = canonicalBranchId(normalized.branch);
  normalized.branch = normalized.canonicalBranchId ? branchDisplayName(normalized.canonicalBranchId) : '';
  normalized.source = sourceKey;
  return normalized;
}

function branchRiskObjectsFromRows(rows: string[][]): BranchSourceRecord[] {
  if (!rows.length) return [];
  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map((row) =>
    headers.reduce<BranchSourceRecord>((record, header, index) => {
      record[header] = row[index] || '';
      return record;
    }, {})
  );
}

export async function buildPendingBranchSourceImport(
  file: File,
  sourceKey: BranchRiskSourceKey
): Promise<PendingBranchImport> {
  const rows = parseCSV(await file.text());
  const rawData = branchRiskObjectsFromRows(rows);
  const data = rawData.map((record) => normalizeBranchRiskRecord(record, sourceKey));
  const invalidRecords = data.filter(
    (row) => !row.branch || (row.date && Number.isNaN(new Date(String(row.date)).getTime()))
  ).length;
  const mappedRecords = data.filter((row) => row.branch).length;
  const duplicateRecords = Math.max(0, data.length - new Set(data.map((row) => JSON.stringify(row))).size);
  return {
    sourceKey,
    fileName: file.name,
    data,
    records: data.length,
    mappedRecords,
    invalidRecords,
    duplicateRecords,
    uploadDate: new Date().toISOString(),
  };
}

export function validateComplaintImport(pendingBranchImport: PendingBranchImport): string {
  const complaints = pendingBranchImport.data;
  const branchRelated = complaints.filter((complaint) => complaint.classification === 'Branch Related').length;
  const nonBranch = complaints.filter((complaint) => complaint.classification === 'Non-Branch Related').length;
  const requiresReview = complaints.filter((complaint) => complaint.classification === 'Requires Auditor Review').length;
  const metrics: [string, number][] = [
    ['Invalid Records', complaints.filter((complaint) => complaint.invalid).length],
    ['Duplicate Records', complaints.filter((complaint) => complaint.duplicate).length],
    [
      'Excluded Records',
      complaints.filter(
        (complaint) =>
          complaint.classification === 'Non-Branch Related' ||
          (complaint.classification === 'Branch Related' && !complaint.include && !complaint.invalid)
      ).length,
    ],
  ];
  const categoryTotal = branchRelated + nonBranch + requiresReview;
  const invalidMetric = metrics.find(([, value]) => value > complaints.length);
  if (categoryTotal !== complaints.length) {
    return `Classification totals do not reconcile: ${categoryTotal} classified for ${complaints.length} complaints.`;
  }
  if (invalidMetric) {
    return `${invalidMetric[0]} cannot exceed Total Complaints.`;
  }
  return '';
}

function nextImportBatchId(existingBatchIds: string[]): string {
  const highest = existingBatchIds.reduce((max, value) => {
    const match = value.match(/^IMP-\d{4}-(\d{4})$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `IMP-${new Date().getFullYear()}-${String(highest + 1).padStart(4, '0')}`;
}

export async function confirmBranchImport(pendingBranchImport: PendingBranchImport): Promise<void> {
  const filteredRecords =
    pendingBranchImport.sourceKey === 'complaints'
      ? pendingBranchImport.data
          .filter(
            (record) =>
              record.include && !record.invalid && record.classification === 'Branch Related' && record.mappingStatus === 'Mapped'
          )
          .map((record) => ({
            ...record,
            canonicalBranchId: canonicalBranchId(record.branchId),
            branch: branchDisplayName(canonicalBranchId(record.branchId)),
            branchName: record.branchName,
            complaintId: record.complaintReference,
            complaintDate: record.complaintDate,
            complaintCategory: record.category,
            complaintDescription: record.description,
            status: record.status,
            outcome: record.outcome,
            source: 'complaints',
          }))
      : pendingBranchImport.data.filter(
          (record) => record.branch && !Number.isNaN(new Date(String(record.date)).getTime())
        );

  await replaceBranchRiskSource(pendingBranchImport.sourceKey, filteredRecords);

  const { data: existingUploads, error: existingUploadsError } = await supabase
    .from('branch_risk_uploads')
    .select('import_batch_id');
  if (existingUploadsError) throw existingUploadsError;
  const importBatchId = nextImportBatchId((existingUploads || []).map((row) => String(row.import_batch_id || '')));

  const { error: uploadError } = await supabase.from('branch_risk_uploads').upsert({
    source_key: pendingBranchImport.sourceKey,
    file_name: pendingBranchImport.fileName,
    worksheet_name: pendingBranchImport.worksheetName || '',
    detected_columns: pendingBranchImport.detectedColumns || [],
    upload_date: pendingBranchImport.uploadDate,
    import_batch_id: importBatchId,
    records: pendingBranchImport.records,
    invalid_records: pendingBranchImport.invalidRecords,
    duplicate_records: pendingBranchImport.duplicateRecords,
    status: 'Imported and confirmed',
  });
  if (uploadError) throw uploadError;

  const { error: settingsError } = await supabase.from('branch_risk_settings').update({ demo: false }).eq('id', 1);
  if (settingsError) throw settingsError;
}

export async function exportBranchRiskAssessment(): Promise<void> {
  const metrics = await branchRiskMetrics();
  const rows: (string | number)[][] = [
    ['Branch', 'Risk Score', 'Risk Rating', 'Risk Events'],
    ...metrics.map((item) => [item.branch, item.score, item.rating, item.riskEvents]),
  ];
  downloadCsv('branch-risk-assessment.csv', rows);
}
