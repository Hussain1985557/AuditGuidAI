'use client';

import { useEffect, useState } from 'react';
import { useCrossView } from '@/lib/crossView';
import { getFindings } from '@/lib/findings';
import {
  getRemediationByFinding,
  getRemediationRecords,
  hasRemediationRecord,
  recordRemediationAuditEvent,
  remediationFromMap,
  saveRemediation as persistRemediation,
} from '@/lib/remediation';
import type { Finding, Remediation, RemediationStatus, ValidationResult } from '@/lib/types';

export default function RemediationPage() {
  const { intent, setIntent } = useCrossView();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [remediationMap, setRemediationMap] = useState<Record<string, Remediation>>({});
  const [showEditor, setShowEditor] = useState(false);
  const [activeFinding, setActiveFinding] = useState<Finding | null>(null);
  const [form, setForm] = useState<Remediation | null>(null);
  const [error, setError] = useState('');

  async function refreshRegister() {
    setFindings(await getFindings());
    setRemediationMap(await getRemediationRecords());
  }

  useEffect(() => {
    void refreshRegister();
  }, []);

  useEffect(() => {
    if (intent?.type === 'openRemediation') {
      void (async () => {
        const finding = (await getFindings()).find((item) => item.findingId === intent.findingId);
        if (finding) await openEditor(finding);
      })();
      setIntent(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent]);

  async function openEditor(finding: Finding) {
    setActiveFinding(finding);
    setForm(await getRemediationByFinding(finding.findingId));
    setError('');
    setShowEditor(true);
  }

  async function backToRegister() {
    await refreshRegister();
    setShowEditor(false);
    setActiveFinding(null);
    setForm(null);
  }

  async function handleSave() {
    if (!activeFinding || !form) return;

    if (form.status === 'Closed' && (!form.validationPerformed.trim() || !form.validationDate || !form.validationResult)) {
      setError(
        'A Closed remediation requires auditor validation/re-test details, a validation date, and a validation result.'
      );
      return;
    }

    const previous = await getRemediationByFinding(activeFinding.findingId);
    const hadPrevious = await hasRemediationRecord(activeFinding.findingId);
    await persistRemediation(form);
    const change = hadPrevious && previous.status !== form.status
      ? `Remediation status changed from ${previous.status} to ${form.status}.`
      : form.status === 'Closed'
        ? 'Remediation closed after auditor validation.'
        : 'Remediation record updated.';
    await recordRemediationAuditEvent(activeFinding, form, change);
    await backToRegister();
  }

  return (
    <div>
      <header className="topbar">
        <div>
          <p className="eyebrow">Auditor-managed actions</p>
          <h1>Remediation</h1>
        </div>
      </header>

      {!showEditor ? (
        <section className="panel remediation-register-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Linked to saved findings</p>
              <h2>Remediation Register</h2>
            </div>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Finding ID</th>
                  <th>Finding Title</th>
                  <th>Related Run ID</th>
                  <th>Risk Rating</th>
                  <th>Finding Status</th>
                  <th>Action Owner</th>
                  <th>Target Completion Date</th>
                  <th>Management Response</th>
                  <th>Remediation Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {findings.length ? (
                  findings
                    .slice()
                    .reverse()
                    .map((finding) => {
                      const remediation = remediationFromMap(remediationMap, finding.findingId);
                      return (
                        <tr key={finding.findingId}>
                          <td>{finding.findingId}</td>
                          <td>{finding.title || 'Untitled finding'}</td>
                          <td>{finding.relatedRunId}</td>
                          <td>{finding.riskRating}</td>
                          <td>{finding.status}</td>
                          <td>{finding.actionOwner}</td>
                          <td>{finding.targetDate}</td>
                          <td>{finding.managementResponse}</td>
                          <td>{remediation.status}</td>
                          <td>
                            <button type="button" className="audit-trail-button" onClick={() => openEditor(finding)}>
                              Open
                            </button>
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan={10}>No saved findings available for remediation.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : activeFinding && form ? (
        <section className="panel remediation-editor-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Finding-linked follow-up</p>
              <h2>Track Remediation</h2>
            </div>
          </div>

          {error ? (
            <div className="validation-error" role="alert">
              {error}
            </div>
          ) : null}

          <div className="detail-grid">
            <div className="detail-item"><span>Finding ID</span><strong>{activeFinding.findingId}</strong></div>
            <div className="detail-item"><span>Related Run ID</span><strong>{activeFinding.relatedRunId}</strong></div>
            <div className="detail-item"><span>Finding Title</span><strong>{activeFinding.title || 'Untitled finding'}</strong></div>
            <div className="detail-item"><span>Risk Rating</span><strong>{activeFinding.riskRating}</strong></div>
            <div className="detail-item"><span>Finding Status</span><strong>{activeFinding.status}</strong></div>
            <div className="detail-item"><span>Responsible Person / Action Owner</span><strong>{activeFinding.actionOwner || 'Not assigned'}</strong></div>
            <div className="detail-item"><span>Target Completion Date</span><strong>{activeFinding.targetDate || 'Not set'}</strong></div>
            <div className="detail-item"><span>Management Response</span><strong>{activeFinding.managementResponse || 'No management response recorded'}</strong></div>
          </div>

          <div className="remediation-form-grid">
            <label className="rule-field">
              <span>Remediation Status</span>
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as RemediationStatus })}>
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending Validation">Pending Validation</option>
                <option value="Completed">Completed</option>
                <option value="Closed">Closed</option>
              </select>
            </label>
            <label className="rule-field">
              <span>Follow-up Date</span>
              <input type="date" value={form.followUpDate} onChange={(event) => setForm({ ...form, followUpDate: event.target.value })} />
            </label>
            <label className="rule-field remediation-wide-field">
              <span>Remediation Evidence</span>
              <textarea
                rows={4}
                placeholder="Record evidence provided by management."
                value={form.evidence}
                onChange={(event) => setForm({ ...form, evidence: event.target.value })}
              />
            </label>
            <label className="rule-field remediation-wide-field">
              <span>Auditor Validation / Re-test Performed</span>
              <textarea
                rows={4}
                placeholder="Record the auditor's validation or re-test procedures performed."
                value={form.validationPerformed}
                onChange={(event) => setForm({ ...form, validationPerformed: event.target.value })}
              />
            </label>
            <label className="rule-field">
              <span>Validation Date</span>
              <input type="date" value={form.validationDate} onChange={(event) => setForm({ ...form, validationDate: event.target.value })} />
            </label>
            <label className="rule-field">
              <span>Validation Result</span>
              <select
                value={form.validationResult}
                onChange={(event) => setForm({ ...form, validationResult: event.target.value as ValidationResult })}
              >
                <option value="">Not completed</option>
                <option value="Effective">Effective</option>
                <option value="Partially Effective">Partially Effective</option>
                <option value="Ineffective">Ineffective</option>
              </select>
            </label>
            <label className="rule-field remediation-wide-field">
              <span>Auditor Comments</span>
              <textarea rows={4} value={form.auditorComments} onChange={(event) => setForm({ ...form, auditorComments: event.target.value })} />
            </label>
            <label className="rule-field remediation-wide-field">
              <span>Closure / Validation Result</span>
              <textarea rows={4} value={form.closureResult} onChange={(event) => setForm({ ...form, closureResult: event.target.value })} />
            </label>
          </div>

          <div className="working-paper-actions">
            <button type="button" className="primary-button" onClick={handleSave}>
              Save Remediation
            </button>
            <button type="button" className="ghost-button" onClick={backToRegister}>
              Back to Remediation
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
