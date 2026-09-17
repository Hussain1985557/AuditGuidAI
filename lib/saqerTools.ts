import type Anthropic from '@anthropic-ai/sdk';
import { getAuditTrailEntries } from './auditTrail';
import { branchRiskMetrics } from './branchRisk';
import { generateControlId, getControls, upsertControl } from './controls';
import { generateFindingId, getFindings, upsertFinding } from './findings';
import {
  getRemediationByFinding,
  getRemediationRecords,
  recordRemediationAuditEvent,
  saveRemediation,
} from './remediation';
import type { Control, Finding, Remediation } from './types';

export const SAQER_TOOLS: Anthropic.Tool[] = [
  {
    name: 'list_findings',
    description: 'List all audit findings currently recorded in the Findings register, including status, risk rating, and related run.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_controls',
    description: 'List all internal controls currently recorded in the Controls register.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_audit_trail_runs',
    description:
      'List past raffle validation runs from the Audit Trail, including run ID, file name, and result counts. Use this to find a valid relatedRunId before creating a finding or control.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_remediation_status',
    description: 'List remediation tracking status for every finding that has a remediation record.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_branch_risk_summary',
    description: 'Get current branch risk scores and ratings for all branches in Branch Risk Intelligence.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'create_finding',
    description:
      'Create a new audit finding in the Findings register. Prefer checking list_audit_trail_runs first if a related validation run is relevant, and confirm ambiguous details with the user before calling this.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short finding title (required).' },
        relatedRunId: { type: 'string', description: 'Related validation run ID, e.g. RV-2026-000005. Omit if none applies.' },
        auditArea: { type: 'string' },
        riskRating: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'] },
        status: { type: 'string', enum: ['Draft', 'Open', 'Agreed', 'Closed'] },
        criteria: { type: 'string', description: 'The standard or expectation against which the condition is measured.' },
        condition: { type: 'string', description: 'What was actually observed.' },
        cause: { type: 'string' },
        riskImpact: { type: 'string' },
        recommendation: { type: 'string' },
        managementResponse: { type: 'string' },
        actionOwner: { type: 'string' },
        targetDate: { type: 'string', description: 'YYYY-MM-DD' },
        preparedBy: { type: 'string' },
        preparationDate: { type: 'string', description: 'YYYY-MM-DD' },
        reviewedBy: { type: 'string' },
        reviewDate: { type: 'string', description: 'YYYY-MM-DD' },
        branch: { type: 'string', description: 'Canonical branch id or name this finding relates to, if any.' },
      },
      required: ['title'],
      additionalProperties: false,
    },
  },
  {
    name: 'create_control',
    description: 'Create a new internal control in the Controls register.',
    input_schema: {
      type: 'object',
      properties: {
        controlName: { type: 'string', description: 'Required.' },
        auditArea: { type: 'string' },
        controlObjective: { type: 'string' },
        riskAddressed: { type: 'string' },
        controlType: { type: 'string', enum: ['Preventive', 'Detective', 'Corrective'] },
        controlNature: { type: 'string', enum: ['Manual', 'Automated', 'IT-Dependent Manual'] },
        frequency: {
          type: 'string',
          enum: ['Per Transaction', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annually', 'Ad Hoc'],
        },
        controlOwner: { type: 'string' },
        controlStatus: { type: 'string', enum: ['Active', 'Inactive', 'Under Review'] },
        relatedRunId: { type: 'string' },
        relatedFindingId: { type: 'string' },
        designEffectiveness: { type: 'string', enum: ['Effective', 'Partially Effective', 'Ineffective', 'Not Assessed'] },
        operatingEffectiveness: { type: 'string', enum: ['Effective', 'Partially Effective', 'Ineffective', 'Not Tested'] },
        auditorNotes: { type: 'string' },
      },
      required: ['controlName'],
      additionalProperties: false,
    },
  },
  {
    name: 'update_remediation',
    description:
      "Update the remediation tracking record for an existing finding, identified by finding ID. Setting status to 'Closed' requires validationPerformed, validationDate, and validationResult to all be provided, matching the app's own validation rule.",
    input_schema: {
      type: 'object',
      properties: {
        findingId: { type: 'string', description: 'e.g. F-2026-000001 (required).' },
        status: { type: 'string', enum: ['Not Started', 'In Progress', 'Pending Validation', 'Completed', 'Closed'] },
        followUpDate: { type: 'string' },
        evidence: { type: 'string', description: 'Evidence provided by management.' },
        validationPerformed: { type: 'string', description: "Auditor's validation or re-test procedures performed." },
        validationDate: { type: 'string' },
        validationResult: { type: 'string', enum: ['Effective', 'Partially Effective', 'Ineffective'] },
        auditorComments: { type: 'string' },
        closureResult: { type: 'string' },
      },
      required: ['findingId', 'status'],
      additionalProperties: false,
    },
  },
];

function requireString(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${key} is required`);
  }
  return value;
}

function optionalString(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  return typeof value === 'string' ? value : '';
}

export async function executeSaqerTool(name: string, rawInput: unknown): Promise<unknown> {
  const input = (rawInput && typeof rawInput === 'object' ? rawInput : {}) as Record<string, unknown>;

  switch (name) {
    case 'list_findings': {
      const findings = await getFindings();
      return findings.map((f) => ({
        findingId: f.findingId,
        title: f.title,
        auditArea: f.auditArea,
        riskRating: f.riskRating,
        status: f.status,
        relatedRunId: f.relatedRunId,
        actionOwner: f.actionOwner,
        targetDate: f.targetDate,
        branch: f.branch,
      }));
    }

    case 'list_controls': {
      const controls = await getControls();
      return controls.map((c) => ({
        controlId: c.controlId,
        controlName: c.controlName,
        auditArea: c.auditArea,
        controlType: c.controlType,
        controlStatus: c.controlStatus,
        relatedRunId: c.relatedRunId,
        relatedFindingId: c.relatedFindingId,
      }));
    }

    case 'list_audit_trail_runs': {
      const runs = await getAuditTrailEntries();
      return runs.map((r) => ({
        runId: r.runId,
        fileName: r.fileName,
        dateTime: r.dateTime,
        status: r.status,
        totalRecordsTested: r.totalRecordsTested,
        validRecords: r.validRecords,
        invalidRecords: r.invalidRecords,
      }));
    }

    case 'list_remediation_status': {
      const map = await getRemediationRecords();
      return Object.values(map);
    }

    case 'get_branch_risk_summary': {
      const metrics = await branchRiskMetrics();
      return metrics.map((m) => ({ branch: m.displayBranch, score: m.score, rating: m.rating, riskEvents: m.riskEvents }));
    }

    case 'create_finding': {
      const title = requireString(input, 'title');
      const findingId = await generateFindingId();
      const finding: Finding = {
        findingId,
        relatedRunId: optionalString(input, 'relatedRunId'),
        title,
        auditArea: optionalString(input, 'auditArea'),
        riskRating: (input.riskRating as Finding['riskRating']) || 'Low',
        status: (input.status as Finding['status']) || 'Draft',
        criteria: optionalString(input, 'criteria'),
        condition: optionalString(input, 'condition'),
        cause: optionalString(input, 'cause'),
        riskImpact: optionalString(input, 'riskImpact'),
        recommendation: optionalString(input, 'recommendation'),
        preparedBy: optionalString(input, 'preparedBy'),
        preparationDate: optionalString(input, 'preparationDate'),
        reviewedBy: optionalString(input, 'reviewedBy'),
        reviewDate: optionalString(input, 'reviewDate'),
        managementResponse: optionalString(input, 'managementResponse'),
        actionOwner: optionalString(input, 'actionOwner'),
        targetDate: optionalString(input, 'targetDate'),
        supportingExceptionEvidence: [],
        branch: optionalString(input, 'branch') || undefined,
      };
      await upsertFinding(finding);
      return { created: true, findingId };
    }

    case 'create_control': {
      const controlName = requireString(input, 'controlName');
      const controlId = await generateControlId();
      const control: Control = {
        controlId,
        controlName,
        auditArea: optionalString(input, 'auditArea'),
        controlObjective: optionalString(input, 'controlObjective'),
        riskAddressed: optionalString(input, 'riskAddressed'),
        controlType: (input.controlType as Control['controlType']) || 'Preventive',
        controlNature: (input.controlNature as Control['controlNature']) || 'Manual',
        frequency: (input.frequency as Control['frequency']) || 'Per Transaction',
        controlOwner: optionalString(input, 'controlOwner'),
        controlStatus: (input.controlStatus as Control['controlStatus']) || 'Active',
        relatedRunId: optionalString(input, 'relatedRunId'),
        relatedFindingId: optionalString(input, 'relatedFindingId'),
        designEffectiveness: (input.designEffectiveness as Control['designEffectiveness']) || 'Not Assessed',
        operatingEffectiveness: (input.operatingEffectiveness as Control['operatingEffectiveness']) || 'Not Tested',
        auditorNotes: optionalString(input, 'auditorNotes'),
      };
      await upsertControl(control);
      return { created: true, controlId };
    }

    case 'update_remediation': {
      const findingId = requireString(input, 'findingId');
      const findings = await getFindings();
      const finding = findings.find((f) => f.findingId === findingId);
      if (!finding) {
        throw new Error(`No finding found with id ${findingId}`);
      }

      const status = (input.status as Remediation['status']) || 'Not Started';
      const validationPerformed = optionalString(input, 'validationPerformed');
      const validationDate = optionalString(input, 'validationDate');
      const validationResult = (input.validationResult as Remediation['validationResult']) || '';

      if (status === 'Closed' && (!validationPerformed.trim() || !validationDate || !validationResult)) {
        throw new Error(
          'Closing a remediation requires validationPerformed, validationDate, and validationResult to all be provided.'
        );
      }

      const previous = await getRemediationByFinding(findingId);
      const remediation: Remediation = {
        findingId,
        status,
        followUpDate: optionalString(input, 'followUpDate'),
        auditorComments: optionalString(input, 'auditorComments'),
        closureResult: optionalString(input, 'closureResult'),
        evidence: optionalString(input, 'evidence'),
        validationPerformed,
        validationDate,
        validationResult,
      };
      await saveRemediation(remediation);
      const change =
        previous.status !== remediation.status
          ? `Remediation status changed from ${previous.status} to ${remediation.status} (via Saqer).`
          : 'Remediation record updated (via Saqer).';
      await recordRemediationAuditEvent(finding, remediation, change);
      return { updated: true, findingId, status };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
