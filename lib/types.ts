export interface RaffleRow {
  Customer_ID: string;
  Transaction_ID: string;
  Transaction_Date: string;
  Amount: string;
  Entries: string;
  Employee: string;
  Reversed: string;
  _rowNumber: number;
}

export interface ValidatedRaffleRow extends RaffleRow {
  actualEntries: string;
  expectedEntries: number;
  exceptions: string[];
  isValid: boolean;
}

export interface ExceptionEvidenceRecord {
  transactionId: string;
  transactionDate: string;
  transactionAmount: string;
  customerId: string;
  raffleEntries: string;
  validationResult: string;
  exceptionReasons: string[];
}

export interface ValidationRules {
  startDate: string;
  endDate: string;
  minimumEligibleAmount: number;
  entriesPerEligibleAmount: number;
  excludeEmployees: boolean;
  excludeReversed: boolean;
}

export interface ValidationSummary {
  totalRecordsTested: number;
  validRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
  reversedTransactions: number;
  outsideCampaignPeriod: number;
}

export interface AuditTrailEntry extends ValidationSummary {
  runId: string;
  dateTime: string;
  fileName: string;
  campaignStartDate: string;
  campaignEndDate: string;
  minimumEligibleAmount: number;
  entriesPerEligibleAmount: number;
  excludeEmployees: 'Yes' | 'No';
  excludeReversedTransactions: 'Yes' | 'No';
  exceptionEvidence: ExceptionEvidenceRecord[] | null;
  status: 'Completed';
}

export type ReviewStatus = 'Draft' | 'Prepared' | 'Reviewed';

export interface WorkingPaper {
  runId: string;
  auditorNotes: string;
  conclusion: string;
  preparedBy: string;
  reviewedBy: string;
  reviewStatus: ReviewStatus;
  preparationDate: string;
  reviewDate: string;
}

export type FindingStatus = 'Draft' | 'Open' | 'Agreed' | 'Closed';
export type RiskRating = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Finding {
  findingId: string;
  relatedRunId: string;
  title: string;
  auditArea: string;
  riskRating: RiskRating;
  status: FindingStatus;
  criteria: string;
  condition: string;
  cause: string;
  riskImpact: string;
  recommendation: string;
  preparedBy: string;
  preparationDate: string;
  reviewedBy: string;
  reviewDate: string;
  managementResponse: string;
  actionOwner: string;
  targetDate: string;
  supportingExceptionEvidence: ExceptionEvidenceRecord[];
  branch?: string;
}

export type RemediationStatus = 'Not Started' | 'In Progress' | 'Pending Validation' | 'Completed' | 'Closed';
export type ValidationResult = '' | 'Effective' | 'Partially Effective' | 'Ineffective';

export interface Remediation {
  findingId: string;
  status: RemediationStatus;
  followUpDate: string;
  auditorComments: string;
  closureResult: string;
  evidence: string;
  validationPerformed: string;
  validationDate: string;
  validationResult: ValidationResult;
}

export interface RemediationAuditEvent {
  dateTime: string;
  findingId: string;
  relatedRunId: string;
  remediationStatus: RemediationStatus;
  validationResult: string;
  change: string;
}

export type ControlType = 'Preventive' | 'Detective' | 'Corrective';
export type ControlNature = 'Manual' | 'Automated' | 'IT-Dependent Manual';
export type ControlFrequency = 'Per Transaction' | 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Annually' | 'Ad Hoc';
export type ControlStatus = 'Active' | 'Inactive' | 'Under Review';
export type Effectiveness = 'Effective' | 'Partially Effective' | 'Ineffective' | 'Not Assessed';
export type OperatingEffectiveness = 'Effective' | 'Partially Effective' | 'Ineffective' | 'Not Tested';

export interface Control {
  controlId: string;
  controlName: string;
  auditArea: string;
  controlObjective: string;
  riskAddressed: string;
  controlType: ControlType;
  controlNature: ControlNature;
  frequency: ControlFrequency;
  controlOwner: string;
  controlStatus: ControlStatus;
  relatedRunId: string;
  relatedFindingId: string;
  designEffectiveness: Effectiveness;
  operatingEffectiveness: OperatingEffectiveness;
  auditorNotes: string;
}

export type BranchRiskSourceKey = 'complaints' | 'gl' | 'access' | 'shortages' | 'incidents';

export interface BranchRiskWeights {
  complaints: number;
  gl: number;
  access: number;
  shortages: number;
  incidents: number;
  findings: number;
  controls: number;
}

export interface BranchSourceRecord {
  [key: string]: unknown;
  canonicalBranchId?: string;
  branch?: string;
}

export interface BranchUploadMeta {
  fileName: string;
  worksheetName?: string;
  detectedColumns?: string[];
  uploadDate: string;
  importBatchId: string;
  records: number;
  invalidRecords: number;
  duplicateRecords: number;
  status: string;
}

export interface BranchRiskStore {
  sources: Partial<Record<BranchRiskSourceKey, BranchSourceRecord[]>>;
  weights: BranchRiskWeights;
  demo: boolean;
  uploads: Partial<Record<BranchRiskSourceKey, BranchUploadMeta>>;
}

export interface PendingBranchImport {
  sourceKey: BranchRiskSourceKey;
  fileName: string;
  worksheetName?: string;
  detectedColumns?: string[];
  data: BranchSourceRecord[];
  records: number;
  mappedRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
  uploadDate: string;
}

export interface BranchRiskMetric {
  branch: string;
  displayBranch: string;
  score: number;
  rating: 'Critical' | 'High' | 'Moderate' | 'Low';
  complaints: BranchSourceRecord[];
  gl: BranchSourceRecord[];
  access: BranchSourceRecord[];
  shortages: BranchSourceRecord[];
  incidents: BranchSourceRecord[];
  glExceptions: BranchSourceRecord[];
  accessExceptions: BranchSourceRecord[];
  openFindings: Finding[];
  overdueActions: Finding[];
  contributions: BranchRiskWeights;
  riskEvents: number;
}
