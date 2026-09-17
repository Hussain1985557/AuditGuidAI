'use client';

import { useEffect, useState } from 'react';
import { getRunEvidence, getAuditTrailEntries } from '@/lib/auditTrail';
import { useCrossView } from '@/lib/crossView';
import { generateFindingId, getFindings, upsertFinding } from '@/lib/findings';
import type { ExceptionEvidenceRecord, Finding, FindingStatus, RiskRating } from '@/lib/types';

const EMPTY_FORM = {
  relatedRunId: '',
  title: '',
  auditArea: '',
  riskRating: 'Low' as RiskRating,
  status: 'Draft' as FindingStatus,
  criteria: '',
  condition: '',
  cause: '',
  riskImpact: '',
  recommendation: '',
  preparedBy: '',
  preparationDate: '',
  reviewedBy: '',
  reviewDate: '',
  managementResponse: '',
  actionOwner: '',
  targetDate: '',
};

export default function FindingsPage() {
  const { intent, setIntent } = useCrossView();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingFindingId, setEditingFindingId] = useState<string | null>(null);
  const [notFoundId, setNotFoundId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [evidence, setEvidence] = useState<ExceptionEvidenceRecord[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<Set<number>>(new Set());

  useEffect(() => {
    setFindings(getFindings());
  }, []);

  useEffect(() => {
    if (intent?.type === 'openFinding') {
      const finding = getFindings().find((item) => item.findingId === intent.findingId);
      if (finding) {
        openEditor(finding);
      } else {
        setNotFoundId(intent.findingId);
        setShowEditor(true);
      }
      setIntent(null);
    } else if (intent?.type === 'createFinding') {
      openEditor(null);
      setForm((prev) => ({
        ...prev,
        auditArea: intent.prefill.auditArea || prev.auditArea,
        condition: intent.prefill.condition || prev.condition,
      }));
      setIntent(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent]);

  function evidenceKey(record: ExceptionEvidenceRecord) {
    return `${record.transactionId}|${record.transactionDate}|${record.customerId}`;
  }

  function loadEvidenceFor(runId: string, preselected: ExceptionEvidenceRecord[]) {
    const runEvidence = getRunEvidence(runId);
    setEvidence(runEvidence);
    const selectedKeys = new Set(preselected.map(evidenceKey));
    setSelectedEvidence(new Set(runEvidence.map((record, index) => (selectedKeys.has(evidenceKey(record)) ? index : -1)).filter((i) => i >= 0)));
  }

  function openEditor(finding: Finding | null) {
    setNotFoundId(null);
    setEditingFindingId(finding ? finding.findingId : null);
    setError('');
    const completedRuns = getAuditTrailEntries().filter((entry) => entry.status === 'Completed');
    const defaultRunId = finding?.relatedRunId || completedRuns[0]?.runId || '';
    setForm(
      finding
        ? {
            relatedRunId: finding.relatedRunId,
            title: finding.title,
            auditArea: finding.auditArea,
            riskRating: finding.riskRating,
            status: finding.status,
            criteria: finding.criteria,
            condition: finding.condition,
            cause: finding.cause,
            riskImpact: finding.riskImpact,
            recommendation: finding.recommendation,
            preparedBy: finding.preparedBy,
            preparationDate: finding.preparationDate,
            reviewedBy: finding.reviewedBy,
            reviewDate: finding.reviewDate,
            managementResponse: finding.managementResponse,
            actionOwner: finding.actionOwner,
            targetDate: finding.targetDate,
          }
        : { ...EMPTY_FORM, relatedRunId: defaultRunId }
    );
    loadEvidenceFor(defaultRunId, finding?.supportingExceptionEvidence || []);
    setShowEditor(true);
  }

  function backToRegister() {
    setShowEditor(false);
    setEditingFindingId(null);
    setNotFoundId(null);
    setFindings(getFindings());
  }

  function handleRunChange(runId: string) {
    setForm({ ...form, relatedRunId: runId });
    loadEvidenceFor(runId, []);
  }

  function toggleEvidence(index: number) {
    setSelectedEvidence((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function handleSave() {
    if (!form.relatedRunId) {
      setError('Select a completed validation Run ID before saving the finding.');
      return;
    }
    if (!form.title.trim()) {
      setError('Enter a finding title before saving.');
      return;
    }

    const finding: Finding = {
      ...form,
      findingId: editingFindingId || generateFindingId(),
      supportingExceptionEvidence: Array.from(selectedEvidence)
        .sort((a, b) => a - b)
        .map((index) => evidence[index])
        .filter(Boolean),
    };
    upsertFinding(finding);
    backToRegister();
  }

  const completedRuns = getAuditTrailEntries().filter((entry) => entry.status === 'Completed');

  return (
    <div>
      <header className="topbar">
        <div>
          <p className="eyebrow">Auditor-managed records</p>
          <h1>Findings</h1>
        </div>
        <div className="topbar-actions">
          <button type="button" className="primary-button" onClick={() => openEditor(null)}>
            Create New Finding
          </button>
        </div>
      </header>

      {!showEditor ? (
        <section className="panel findings-list-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Local storage</p>
              <h2>Audit Findings</h2>
            </div>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Finding ID</th>
                  <th>Title</th>
                  <th>Related Run ID</th>
                  <th>Audit Area</th>
                  <th>Risk Rating</th>
                  <th>Status</th>
                  <th>Prepared By</th>
                  <th>Preparation Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {findings.length ? (
                  findings
                    .slice()
                    .reverse()
                    .map((finding) => (
                      <tr key={finding.findingId}>
                        <td>{finding.findingId}</td>
                        <td>{finding.title || 'Untitled finding'}</td>
                        <td>{finding.relatedRunId}</td>
                        <td>{finding.auditArea}</td>
                        <td>{finding.riskRating}</td>
                        <td>{finding.status}</td>
                        <td>{finding.preparedBy}</td>
                        <td>{finding.preparationDate}</td>
                        <td>
                          <button type="button" className="audit-trail-button" onClick={() => openEditor(finding)}>
                            View / Edit
                          </button>
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan={8}>No findings created yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="panel finding-editor-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Auditor input</p>
              <h2>{notFoundId ? 'Finding Details' : editingFindingId ? 'Edit Finding' : 'Create Finding'}</h2>
            </div>
          </div>

          {notFoundId ? (
            <div className="validation-error" role="alert">
              Related finding not found: {notFoundId}
            </div>
          ) : (
            <>
              {error ? (
                <div className="validation-error" role="alert">
                  {error}
                </div>
              ) : null}

              <div className="finding-form-grid">
                <div className="detail-item">
                  <span>Finding ID</span>
                  <strong>{editingFindingId || 'New finding ID will be assigned on save'}</strong>
                </div>
                <label className="rule-field">
                  <span>Related Run ID</span>
                  <select value={form.relatedRunId} onChange={(event) => handleRunChange(event.target.value)}>
                    {completedRuns.length ? (
                      completedRuns.map((run) => (
                        <option key={run.runId} value={run.runId}>
                          {run.runId} - {run.fileName}
                        </option>
                      ))
                    ) : (
                      <option value="">No completed validation runs available</option>
                    )}
                  </select>
                </label>
                <label className="rule-field finding-wide-field">
                  <span>Finding Title</span>
                  <input type="text" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
                </label>
                <label className="rule-field">
                  <span>Audit Area</span>
                  <input type="text" value={form.auditArea} onChange={(event) => setForm({ ...form, auditArea: event.target.value })} />
                </label>
                <label className="rule-field">
                  <span>Risk Rating</span>
                  <select value={form.riskRating} onChange={(event) => setForm({ ...form, riskRating: event.target.value as RiskRating })}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </label>
                <label className="rule-field">
                  <span>Finding Status</span>
                  <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as FindingStatus })}>
                    <option value="Draft">Draft</option>
                    <option value="Open">Open</option>
                    <option value="Agreed">Agreed</option>
                    <option value="Closed">Closed</option>
                  </select>
                </label>
                <label className="rule-field">
                  <span>Prepared By</span>
                  <input type="text" value={form.preparedBy} onChange={(event) => setForm({ ...form, preparedBy: event.target.value })} />
                </label>
                <label className="rule-field">
                  <span>Preparation Date</span>
                  <input type="date" value={form.preparationDate} onChange={(event) => setForm({ ...form, preparationDate: event.target.value })} />
                </label>
                <label className="rule-field">
                  <span>Reviewed By</span>
                  <input type="text" value={form.reviewedBy} onChange={(event) => setForm({ ...form, reviewedBy: event.target.value })} />
                </label>
                <label className="rule-field">
                  <span>Review Date</span>
                  <input type="date" value={form.reviewDate} onChange={(event) => setForm({ ...form, reviewDate: event.target.value })} />
                </label>
                <label className="rule-field finding-wide-field">
                  <span>Criteria</span>
                  <textarea rows={3} value={form.criteria} onChange={(event) => setForm({ ...form, criteria: event.target.value })} />
                </label>
                <label className="rule-field finding-wide-field">
                  <span>Condition</span>
                  <textarea rows={3} value={form.condition} onChange={(event) => setForm({ ...form, condition: event.target.value })} />
                </label>
                <label className="rule-field finding-wide-field">
                  <span>Cause</span>
                  <textarea rows={3} value={form.cause} onChange={(event) => setForm({ ...form, cause: event.target.value })} />
                </label>
                <label className="rule-field finding-wide-field">
                  <span>Risk / Impact</span>
                  <textarea rows={3} value={form.riskImpact} onChange={(event) => setForm({ ...form, riskImpact: event.target.value })} />
                </label>
                <label className="rule-field finding-wide-field">
                  <span>Recommendation</span>
                  <textarea rows={3} value={form.recommendation} onChange={(event) => setForm({ ...form, recommendation: event.target.value })} />
                </label>
                <label className="rule-field finding-wide-field">
                  <span>Management Response</span>
                  <textarea rows={3} value={form.managementResponse} onChange={(event) => setForm({ ...form, managementResponse: event.target.value })} />
                </label>
                <label className="rule-field">
                  <span>Responsible Person / Action Owner</span>
                  <input type="text" value={form.actionOwner} onChange={(event) => setForm({ ...form, actionOwner: event.target.value })} />
                </label>
                <label className="rule-field">
                  <span>Target Completion Date</span>
                  <input type="date" value={form.targetDate} onChange={(event) => setForm({ ...form, targetDate: event.target.value })} />
                </label>
              </div>

              <div className="finding-evidence-section">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Read-only historical evidence</p>
                    <h3>Supporting Exception Evidence</h3>
                  </div>
                </div>
                {evidence.length ? (
                  <>
                    <p className="finding-evidence-message">
                      Select one or more retained exception transactions. The evidence shown below is read-only.
                    </p>
                    <div className="finding-evidence-list">
                      {evidence.map((record, index) => (
                        <label className="finding-evidence-row" key={`${record.transactionId}-${index}`}>
                          <input type="checkbox" checked={selectedEvidence.has(index)} onChange={() => toggleEvidence(index)} />
                          <span>
                            <strong>{record.transactionId || 'No transaction ID'}</strong> | {record.transactionDate} | {record.customerId} |{' '}
                            {record.transactionAmount}
                          </span>
                          <small>{record.exceptionReasons.join('; ')}</small>
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="finding-evidence-message">
                    No retained transaction-level exception evidence is available for this validation run. Historical
                    summary data is not converted into fabricated evidence.
                  </p>
                )}
              </div>

              <div className="working-paper-actions">
                <button type="button" className="primary-button" onClick={handleSave}>
                  Save Finding
                </button>
                <button type="button" className="ghost-button" onClick={backToRegister}>
                  Back to Findings
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
