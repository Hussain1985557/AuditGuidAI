'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuditTrailEntries } from '@/lib/auditTrail';
import { useCrossView } from '@/lib/crossView';
import { ensureSeededControl, generateControlId, getControls, upsertControl } from '@/lib/controls';
import { getFindings } from '@/lib/findings';
import type {
  Control,
  ControlFrequency,
  ControlNature,
  ControlStatus,
  ControlType,
  Effectiveness,
  OperatingEffectiveness,
} from '@/lib/types';

const EMPTY_FORM = {
  controlName: '',
  auditArea: '',
  controlObjective: '',
  riskAddressed: '',
  controlType: 'Preventive' as ControlType,
  controlNature: 'Manual' as ControlNature,
  frequency: 'Per Transaction' as ControlFrequency,
  controlOwner: '',
  controlStatus: 'Active' as ControlStatus,
  relatedRunId: '',
  relatedFindingId: '',
  designEffectiveness: 'Not Assessed' as Effectiveness,
  operatingEffectiveness: 'Not Tested' as OperatingEffectiveness,
  auditorNotes: '',
};

export default function ControlsPage() {
  const router = useRouter();
  const { intent, setIntent } = useCrossView();
  const [controls, setControls] = useState<Control[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingControlId, setEditingControlId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  useEffect(() => {
    ensureSeededControl();
    setControls(getControls());
  }, []);

  useEffect(() => {
    if (intent?.type === 'openControl') {
      const control = getControls().find((item) => item.controlId === intent.controlId);
      if (control) openEditor(control);
      setIntent(null);
    } else if (intent?.type === 'createControl') {
      openEditor(null);
      setForm((prev) => ({
        ...prev,
        auditArea: intent.prefill.auditArea || prev.auditArea,
        controlName: intent.prefill.controlName || prev.controlName,
      }));
      setIntent(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent]);

  function openEditor(control: Control | null) {
    setEditingControlId(control ? control.controlId : null);
    setError('');
    setForm(
      control
        ? {
            controlName: control.controlName,
            auditArea: control.auditArea,
            controlObjective: control.controlObjective,
            riskAddressed: control.riskAddressed,
            controlType: control.controlType,
            controlNature: control.controlNature,
            frequency: control.frequency,
            controlOwner: control.controlOwner,
            controlStatus: control.controlStatus,
            relatedRunId: control.relatedRunId,
            relatedFindingId: control.relatedFindingId,
            designEffectiveness: control.designEffectiveness,
            operatingEffectiveness: control.operatingEffectiveness,
            auditorNotes: control.auditorNotes,
          }
        : EMPTY_FORM
    );
    setShowEditor(true);
  }

  function backToRegister() {
    setShowEditor(false);
    setEditingControlId(null);
    setControls(getControls());
  }

  function handleSave() {
    if (!form.controlName.trim()) {
      setError('Enter a control name before saving.');
      return;
    }
    const control: Control = { ...form, controlId: editingControlId || generateControlId() };
    upsertControl(control);
    backToRegister();
  }

  const runs = getAuditTrailEntries();
  const findings = getFindings();
  const editingControl = controls.find((item) => item.controlId === editingControlId) || null;

  return (
    <div>
      <header className="topbar">
        <div>
          <p className="eyebrow">Auditor-managed control register</p>
          <h1>Controls</h1>
        </div>
        <div className="topbar-actions">
          <button type="button" className="primary-button" onClick={() => openEditor(null)}>
            Create New Control
          </button>
        </div>
      </header>

      {!showEditor ? (
        <section className="panel controls-register-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Risk to closure</p>
              <h2>Internal Control Register</h2>
            </div>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Control ID</th>
                  <th>Control Name</th>
                  <th>Audit Area</th>
                  <th>Control Type</th>
                  <th>Frequency</th>
                  <th>Control Owner</th>
                  <th>Status</th>
                  <th>Related Run ID</th>
                  <th>Related Finding ID</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {controls.length ? (
                  controls
                    .slice()
                    .reverse()
                    .map((control) => (
                      <tr key={control.controlId}>
                        <td>{control.controlId}</td>
                        <td>{control.controlName}</td>
                        <td>{control.auditArea}</td>
                        <td>{control.controlType}</td>
                        <td>{control.frequency}</td>
                        <td>{control.controlOwner}</td>
                        <td>{control.controlStatus}</td>
                        <td>{control.relatedRunId || 'None'}</td>
                        <td>{control.relatedFindingId || 'None'}</td>
                        <td>
                          <button type="button" className="audit-trail-button" onClick={() => openEditor(control)}>
                            View / Edit
                          </button>
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan={10}>No controls created yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="panel control-editor-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Auditor input</p>
              <h2>{editingControlId ? 'Edit Control' : 'Create Control'}</h2>
            </div>
          </div>

          {error ? (
            <div className="validation-error" role="alert">
              {error}
            </div>
          ) : null}

          <div className="control-form-grid">
            <div className="detail-item">
              <span>Control ID</span>
              <strong>{editingControlId || 'New control ID will be assigned on save'}</strong>
            </div>
            <label className="rule-field">
              <span>Control Name</span>
              <input type="text" value={form.controlName} onChange={(event) => setForm({ ...form, controlName: event.target.value })} />
            </label>
            <label className="rule-field">
              <span>Audit Area</span>
              <input type="text" value={form.auditArea} onChange={(event) => setForm({ ...form, auditArea: event.target.value })} />
            </label>
            <label className="rule-field">
              <span>Control Type</span>
              <select value={form.controlType} onChange={(event) => setForm({ ...form, controlType: event.target.value as ControlType })}>
                <option>Preventive</option>
                <option>Detective</option>
                <option>Corrective</option>
              </select>
            </label>
            <label className="rule-field">
              <span>Control Nature</span>
              <select value={form.controlNature} onChange={(event) => setForm({ ...form, controlNature: event.target.value as ControlNature })}>
                <option>Manual</option>
                <option>Automated</option>
                <option>IT-Dependent Manual</option>
              </select>
            </label>
            <label className="rule-field">
              <span>Frequency</span>
              <select value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value as ControlFrequency })}>
                <option>Per Transaction</option>
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
                <option>Quarterly</option>
                <option>Annually</option>
                <option>Ad Hoc</option>
              </select>
            </label>
            <label className="rule-field">
              <span>Control Owner</span>
              <input type="text" value={form.controlOwner} onChange={(event) => setForm({ ...form, controlOwner: event.target.value })} />
            </label>
            <label className="rule-field">
              <span>Control Status</span>
              <select value={form.controlStatus} onChange={(event) => setForm({ ...form, controlStatus: event.target.value as ControlStatus })}>
                <option>Active</option>
                <option>Inactive</option>
                <option>Under Review</option>
              </select>
            </label>
            <label className="rule-field">
              <span>Related Run ID</span>
              <select value={form.relatedRunId} onChange={(event) => setForm({ ...form, relatedRunId: event.target.value })}>
                <option value="">None</option>
                {runs.map((run) => (
                  <option key={run.runId} value={run.runId}>
                    {run.runId} - {run.fileName}
                  </option>
                ))}
              </select>
            </label>
            <label className="rule-field">
              <span>Related Finding ID</span>
              <select value={form.relatedFindingId} onChange={(event) => setForm({ ...form, relatedFindingId: event.target.value })}>
                <option value="">None</option>
                {findings.map((finding) => (
                  <option key={finding.findingId} value={finding.findingId}>
                    {finding.findingId} - {finding.title || 'Untitled finding'}
                  </option>
                ))}
              </select>
            </label>
            <label className="rule-field">
              <span>Design Effectiveness</span>
              <select
                value={form.designEffectiveness}
                onChange={(event) => setForm({ ...form, designEffectiveness: event.target.value as Effectiveness })}
              >
                <option>Effective</option>
                <option>Partially Effective</option>
                <option>Ineffective</option>
                <option>Not Assessed</option>
              </select>
            </label>
            <label className="rule-field">
              <span>Operating Effectiveness</span>
              <select
                value={form.operatingEffectiveness}
                onChange={(event) => setForm({ ...form, operatingEffectiveness: event.target.value as OperatingEffectiveness })}
              >
                <option>Effective</option>
                <option>Partially Effective</option>
                <option>Ineffective</option>
                <option>Not Tested</option>
              </select>
            </label>
            <label className="rule-field control-wide-field">
              <span>Control Objective</span>
              <textarea rows={3} value={form.controlObjective} onChange={(event) => setForm({ ...form, controlObjective: event.target.value })} />
            </label>
            <label className="rule-field control-wide-field">
              <span>Risk Addressed</span>
              <textarea rows={3} value={form.riskAddressed} onChange={(event) => setForm({ ...form, riskAddressed: event.target.value })} />
            </label>
            <label className="rule-field control-wide-field">
              <span>Auditor Notes</span>
              <textarea rows={4} value={form.auditorNotes} onChange={(event) => setForm({ ...form, auditorNotes: event.target.value })} />
            </label>
          </div>

          {editingControl && (editingControl.relatedRunId || editingControl.relatedFindingId) ? (
            <div className="control-links">
              <span>Linked audit records</span>
              {editingControl.relatedRunId ? (
                <button
                  type="button"
                  className="audit-trail-button"
                  onClick={() => {
                    setIntent({ type: 'openAuditTrailRun', runId: editingControl.relatedRunId, mode: 'details' });
                    router.push('/audit-trail');
                  }}
                >
                  Open Related Run in Audit Trail
                </button>
              ) : null}
              {editingControl.relatedFindingId ? (
                <button
                  type="button"
                  className="audit-trail-button"
                  onClick={() => {
                    setIntent({ type: 'openFinding', findingId: editingControl.relatedFindingId });
                    router.push('/findings');
                  }}
                >
                  Open Related Finding
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="working-paper-actions">
            <button type="button" className="primary-button" onClick={handleSave}>
              Save Control
            </button>
            <button type="button" className="ghost-button" onClick={backToRegister}>
              Cancel / Back to Controls
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
