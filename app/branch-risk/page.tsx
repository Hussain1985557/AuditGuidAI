'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCrossView } from '@/lib/crossView';
import { formatNumber } from '@/lib/csv';
import { getRemediationRecords, remediationFromMap } from '@/lib/remediation';
import {
  branchRiskDefaultWeights,
  branchEvidenceFields,
  branchRecordReference,
  branchRiskMetrics,
  branchRiskSourceDefinitions,
  branchRiskSourceMeta,
  branchRiskRecords,
  buildPendingBranchSourceImport,
  buildPendingComplaintImport,
  canonicalBranchId,
  branchDisplayName,
  clearAllBranchRiskData,
  confirmBranchImport,
  ensureBranchRiskDemoData,
  exportBranchRiskAssessment,
  getBranchRiskStore,
  saveBranchRiskWeights,
  validateComplaintImport,
} from '@/lib/branchRisk';
import type {
  BranchRiskMetric,
  BranchRiskSourceKey,
  BranchRiskStore,
  BranchRiskWeights,
  PendingBranchImport,
  Remediation,
} from '@/lib/types';

const DRIVER_LABELS: Record<keyof BranchRiskWeights, string> = {
  complaints: 'Customer Complaints',
  gl: 'GL Exceptions',
  access: 'Access Exceptions',
  shortages: 'Cash/Teller Shortages',
  incidents: 'Incident Reports',
  findings: 'Previous Findings',
  controls: 'Overdue Remediation',
};

const WEIGHT_LABELS: Record<keyof BranchRiskWeights, string> = {
  complaints: 'Customer Complaints',
  gl: 'GL Activity Exceptions',
  access: 'Access Card Exceptions',
  shortages: 'Cash/Teller Shortages',
  incidents: 'Incident Reports',
  findings: 'Previous Audit Findings',
  controls: 'Control/Remediation Issues',
};

export default function BranchRiskPage() {
  const router = useRouter();
  const { intent, setIntent } = useCrossView();

  const [store, setStore] = useState<BranchRiskStore | null>(null);
  const [metrics, setMetrics] = useState<BranchRiskMetric[]>([]);
  const [remediationMap, setRemediationMap] = useState<Record<string, Remediation>>({});
  const [profileBranch, setProfileBranch] = useState<string | null>(null);
  const [showUploadCentre, setShowUploadCentre] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [weightsForm, setWeightsForm] = useState<BranchRiskWeights>(branchRiskDefaultWeights);
  const [weightError, setWeightError] = useState(false);
  const [evidenceKey, setEvidenceKey] = useState<keyof BranchRiskWeights | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingBranchImport | null>(null);
  const [importMessage, setImportMessage] = useState('');

  async function refresh() {
    const [nextStore, nextMetrics, nextRemediationMap] = await Promise.all([
      getBranchRiskStore(),
      branchRiskMetrics(),
      getRemediationRecords(),
    ]);
    setStore(nextStore);
    setMetrics(nextMetrics);
    setRemediationMap(nextRemediationMap);
  }

  useEffect(() => {
    void (async () => {
      await ensureBranchRiskDemoData();
      await refresh();
    })();
  }, []);

  useEffect(() => {
    if (intent?.type === 'openBranchProfile') {
      openProfile(intent.branch);
      setIntent(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent]);

  const profileItem = useMemo(
    () => (profileBranch ? metrics.find((item) => item.branch === profileBranch) || null : null),
    [profileBranch, metrics]
  );

  function openProfile(branch: string) {
    setProfileBranch(branch);
    setEvidenceKey(null);
    setShowUploadCentre(false);
  }

  function openUploadCentre() {
    setShowUploadCentre(true);
    setProfileBranch(null);
  }

  async function openMethodology() {
    const currentStore = await getBranchRiskStore();
    setWeightsForm(currentStore.weights || branchRiskDefaultWeights);
    setWeightError(false);
    setShowMethodology(true);
  }

  async function handleSourceUpload(sourceKey: BranchRiskSourceKey, file: File) {
    const result =
      sourceKey === 'complaints' ? await buildPendingComplaintImport(file) : await buildPendingBranchSourceImport(file, sourceKey);
    setPendingImport(result);
    const label = branchRiskSourceDefinitions.find((source) => source.key === sourceKey)?.label || sourceKey;
    setImportMessage(`${file.name} is ready for review. Existing ${label} data will be replaced only after confirmation.`);
  }

  function updateComplaintRow(index: number, patch: Partial<PendingBranchImport['data'][number]>) {
    if (!pendingImport) return;
    const data = pendingImport.data.slice();
    data[index] = { ...data[index], ...patch };
    setPendingImport({ ...pendingImport, data });
  }

  async function handleConfirmImport() {
    if (!pendingImport) return;
    if (pendingImport.sourceKey === 'complaints') {
      const validationMessage = validateComplaintImport(pendingImport);
      if (validationMessage) {
        setImportMessage(validationMessage);
        return;
      }
    }
    await confirmBranchImport(pendingImport);
    await refresh();
    setPendingImport(null);
  }

  function handleCancelImport() {
    setPendingImport(null);
  }

  async function handleSaveWeights() {
    const total = Object.values(weightsForm).reduce((sum, value) => sum + Number(value || 0), 0);
    if (total !== 100) {
      setWeightError(true);
      return;
    }
    setWeightError(false);
    await saveBranchRiskWeights(weightsForm);
    await refresh();
    setShowMethodology(false);
  }

  async function handleClearDemoData() {
    await clearAllBranchRiskData();
    await refresh();
  }

  async function handleRunAi() {
    const first = (await branchRiskMetrics())[0];
    if (first) openProfile(first.branch);
  }

  function countByRating(rating: BranchRiskMetric['rating']) {
    return metrics.filter((item) => item.rating === rating).length;
  }

  function evidenceRecords(item: BranchRiskMetric, key: keyof BranchRiskWeights) {
    if (key === 'complaints') return item.complaints;
    if (key === 'gl') return item.glExceptions;
    if (key === 'access') return item.accessExceptions;
    if (key === 'shortages') return item.shortages;
    if (key === 'incidents') return item.incidents;
    if (key === 'findings') return item.openFindings;
    return item.overdueActions;
  }

  function genericEvidenceRecords(item: BranchRiskMetric, key: BranchRiskSourceKey) {
    if (key === 'complaints') return item.complaints;
    if (key === 'gl') return item.glExceptions;
    if (key === 'access') return item.accessExceptions;
    if (key === 'shortages') return item.shortages;
    return item.incidents;
  }

  const correlations = useMemo(() => {
    if (!profileItem) return [];
    const results: { key: string; text: string }[] = [];
    const seen = new Set<string>();
    profileItem.accessExceptions.forEach((access) => {
      profileItem.glExceptions
        .filter((gl) => gl.employeeId === access.employeeId && gl.date === access.accessDate)
        .forEach((gl) => {
          const accessTime = String(access.entryTime || '');
          const glId = gl.transactionId || `${gl.glAccount || ''}|${gl.time || ''}|${gl.amount || ''}`;
          const key = [profileItem.branch, access.employeeId, access.accessDate, accessTime, glId, gl.date, gl.time, 'access-before-unusual-gl'].join('|');
          if (seen.has(key)) return;
          seen.add(key);
          results.push({
            key,
            text: `Physical branch access occurred at ${accessTime || 'an unusual time'} on ${access.accessDate} before unusual GL activity at ${gl.time || 'an unusual time'} associated with ${access.employeeId}.`,
          });
        });
    });
    return results;
  }, [profileItem]);

  return (
    <div>
      <header className="topbar">
        <div>
          <p className="eyebrow">Branch Risk Monitoring &amp; Analytics</p>
          <h1>Branch Risk Intelligence</h1>
        </div>
        <div className="topbar-actions branch-risk-actions">
          <label className="compact-field">
            <span>Reporting Period</span>
            <select defaultValue="Current Period">
              <option>Current Period</option>
              <option>Previous Quarter</option>
            </select>
          </label>
          <button type="button" className="ghost-button" onClick={openUploadCentre}>
            Data Upload Centre
          </button>
          <button type="button" className="primary-button" onClick={refresh}>
            Calculate Risk
          </button>
          <button type="button" className="ghost-button" onClick={handleRunAi}>
            Run AI Analysis
          </button>
          <button type="button" className="ghost-button" onClick={exportBranchRiskAssessment}>
            Export Risk Assessment
          </button>
        </div>
      </header>

      <section className="summary-grid branch-risk-kpis">
        <article className="summary-card">
          <div className="card-top"><span>Total Branches</span><span className="card-icon blue">⌂</span></div>
          <div className="card-figure">{formatNumber(metrics.length)}</div>
        </article>
        <article className="summary-card">
          <div className="card-top"><span>Critical Risk Branches</span><span className="card-icon red">!</span></div>
          <div className="card-figure">{formatNumber(countByRating('Critical'))}</div>
        </article>
        <article className="summary-card">
          <div className="card-top"><span>High Risk Branches</span><span className="card-icon orange">▲</span></div>
          <div className="card-figure">{formatNumber(countByRating('High'))}</div>
        </article>
        <article className="summary-card">
          <div className="card-top"><span>Moderate Risk Branches</span><span className="card-icon orange">•</span></div>
          <div className="card-figure">{formatNumber(countByRating('Moderate'))}</div>
        </article>
        <article className="summary-card">
          <div className="card-top"><span>Low Risk Branches</span><span className="card-icon green">✓</span></div>
          <div className="card-figure">{formatNumber(countByRating('Low'))}</div>
        </article>
        <article className="summary-card">
          <div className="card-top"><span>Total Risk Events</span><span className="card-icon blue">◌</span></div>
          <div className="card-figure">{formatNumber(metrics.reduce((sum, item) => sum + item.riskEvents, 0))}</div>
        </article>
      </section>

      <section className="panel branch-risk-register-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Suggested Audit Attention</p>
            <h2>Branch Risk Register</h2>
          </div>
          <button type="button" className="ghost-button" onClick={openMethodology}>
            Risk Scoring Methodology
          </button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Branch</th><th>Risk Score</th><th>Risk Rating</th><th>Complaints</th><th>GL Exceptions</th>
                <th>Access Exceptions</th><th>Cash/Teller Shortages</th><th>Incidents</th><th>Open Findings</th>
                <th>Overdue Actions</th><th>Trend</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {metrics.length ? (
                metrics.map((item) => (
                  <tr key={item.branch}>
                    <td>{item.displayBranch}</td>
                    <td>{item.score}/100</td>
                    <td><span className={`risk-badge ${item.rating.toLowerCase()}`}>{item.rating}</span></td>
                    <td>{item.complaints.length}</td>
                    <td>{item.glExceptions.length}</td>
                    <td>{item.accessExceptions.length}</td>
                    <td>{item.shortages.length}</td>
                    <td>{item.incidents.length}</td>
                    <td>{item.openFindings.length}</td>
                    <td>{item.overdueActions.length}</td>
                    <td>{item.score >= 60 ? 'Elevated' : 'Stable'}</td>
                    <td>
                      <button type="button" className="audit-trail-button" onClick={() => openProfile(item.branch)}>
                        View Risk Profile
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12}>No branch data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {profileItem ? (
        <section className="panel branch-risk-profile-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Suggested Audit Attention</p>
              <h2>{profileItem.displayBranch} Risk Profile</h2>
            </div>
            <button type="button" className="ghost-button" onClick={() => setProfileBranch(null)}>
              Back to Register
            </button>
          </div>
          <div className="branch-profile-summary">
            <strong>Risk Score: {profileItem.score}/100</strong>
            <span className={`risk-badge ${profileItem.rating.toLowerCase()}`}>{profileItem.rating}</span>
            <p>Risk indicators and suggested audit attention only. Final conclusions remain with the auditor.</p>
          </div>
          <div className="control-links">
            <span>Audit workflow</span>
            <button
              type="button"
              className="audit-trail-button"
              onClick={() => {
                setIntent({
                  type: 'createFinding',
                  prefill: {
                    auditArea: 'Branch Risk Intelligence',
                    condition: `${profileItem.branch} has ${profileItem.riskEvents} risk indicators requiring auditor review.`,
                  },
                });
                router.push('/findings');
              }}
            >
              Create Finding
            </button>
            <button
              type="button"
              className="audit-trail-button"
              onClick={() => {
                setIntent({
                  type: 'createControl',
                  prefill: { auditArea: 'Branch Risk Intelligence', controlName: `${profileItem.branch} risk monitoring control` },
                });
                router.push('/controls');
              }}
            >
              Create / Link Control
            </button>
          </div>

          <div className="branch-driver-grid">
            {(Object.keys(profileItem.contributions) as (keyof BranchRiskWeights)[]).map((key) => (
              <button
                key={key}
                type="button"
                className="result-card branch-driver-card"
                onClick={() => setEvidenceKey(key)}
              >
                <span>{DRIVER_LABELS[key]}</span>
                <strong>
                  {profileItem.contributions[key]}/{store?.weights[key] ?? branchRiskDefaultWeights[key]}
                </strong>
                <small>Suggested risk contribution</small>
                <em>View Evidence</em>
              </button>
            ))}
          </div>

          {evidenceKey ? (
            <section className="branch-evidence-drilldown panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Source Evidence / Data Lineage</p>
                  <h3>{DRIVER_LABELS[evidenceKey]} — {profileItem.displayBranch}</h3>
                </div>
                <button type="button" className="ghost-button" onClick={() => setEvidenceKey(null)}>
                  Close Evidence
                </button>
              </div>

              <div className="branch-evidence-summary">
                <div>
                  <strong>
                    Risk Contribution: {profileItem.contributions[evidenceKey]} / {store?.weights[evidenceKey] ?? branchRiskDefaultWeights[evidenceKey]}
                  </strong>
                  <span>Qualifying Records: {evidenceRecords(profileItem, evidenceKey).length}</span>
                  <span>
                    How this score was calculated: Records shown matched the existing Branch Risk exception predicate.
                    Calculated contribution: {profileItem.contributions[evidenceKey]} /{' '}
                    {store?.weights[evidenceKey] ?? branchRiskDefaultWeights[evidenceKey]}. Maximum permitted contribution
                    under the current methodology: {store?.weights[evidenceKey] ?? branchRiskDefaultWeights[evidenceKey]} points.
                  </span>
                </div>
              </div>

              <div className="branch-evidence-records">
                {evidenceRecords(profileItem, evidenceKey).length ? (
                  evidenceKey === 'findings' ? (
                    profileItem.openFindings.map((finding) => {
                      const remediation = remediationFromMap(remediationMap, finding.findingId);
                      return (
                        <article className="branch-evidence-record" key={finding.findingId}>
                          <div className="branch-evidence-record-heading">
                            <strong>{finding.findingId}</strong>
                            <button
                              type="button"
                              className="audit-trail-button"
                              onClick={() => {
                                setIntent({ type: 'openFinding', findingId: finding.findingId });
                                router.push('/findings');
                              }}
                            >
                              View Finding
                            </button>
                          </div>
                          <div className="branch-evidence-fields">
                            <div><span>Finding Title</span><strong>{finding.title}</strong></div>
                            <div><span>Risk Rating</span><strong>{finding.riskRating}</strong></div>
                            <div><span>Status</span><strong>{finding.status}</strong></div>
                            <div><span>Preparation Date</span><strong>{finding.preparationDate}</strong></div>
                            <div><span>Related Run</span><strong>{finding.relatedRunId}</strong></div>
                            <div><span>Remediation Status</span><strong>{remediation.status}</strong></div>
                          </div>
                        </article>
                      );
                    })
                  ) : evidenceKey === 'controls' ? (
                    profileItem.overdueActions.map((finding) => {
                      const remediation = remediationFromMap(remediationMap, finding.findingId);
                      const daysOverdue = Math.max(0, Math.floor((Date.now() - new Date(finding.targetDate).getTime()) / 86400000));
                      return (
                        <article className="branch-evidence-record" key={finding.findingId}>
                          <div className="branch-evidence-record-heading">
                            <strong>{finding.findingId}</strong>
                          </div>
                          <div className="branch-evidence-fields">
                            <div><span>Action Owner</span><strong>{finding.actionOwner}</strong></div>
                            <div><span>Target Date</span><strong>{finding.targetDate}</strong></div>
                            <div><span>Current Status</span><strong>{remediation.status}</strong></div>
                            <div><span>Days Overdue</span><strong>{daysOverdue}</strong></div>
                            <div><span>Validation Result</span><strong>{remediation.validationResult || 'Not completed'}</strong></div>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    genericEvidenceRecords(profileItem, evidenceKey).map((record, index) => {
                      const meta = branchRiskSourceMeta(evidenceKey, store as BranchRiskStore);
                      const fields = branchEvidenceFields(record, evidenceKey).filter(
                        ([, value]) => value !== undefined && value !== ''
                      );
                      const correlated =
                        evidenceKey === 'access' &&
                        profileItem.glExceptions.some((gl) => gl.employeeId === record.employeeId && gl.date === record.accessDate);
                      return (
                        <article className="branch-evidence-record" key={`${branchRecordReference(record, evidenceKey)}-${index}`}>
                          <div className="branch-evidence-record-heading">
                            <strong>{branchRecordReference(record, evidenceKey)}</strong>
                            {correlated ? <span className="risk-badge moderate">Correlated Risk Event</span> : null}
                          </div>
                          <div className="branch-evidence-fields">
                            {fields.map(([label, value]) => (
                              <div key={label}>
                                <span>{label}</span>
                                <strong>{String(value)}</strong>
                              </div>
                            ))}
                          </div>
                          <div className="branch-evidence-lineage">
                            <span>Source Type: {meta.sourceType}</span>
                            <span>Department: {meta.department}</span>
                            <span>File: {meta.sourceFile}</span>
                            <span>Imported: {meta.imported}</span>
                            <span>Import Batch: {meta.importBatch}</span>
                          </div>
                          {correlated ? (
                            <p className="branch-correlation-note">Correlated risk pattern requiring auditor review.</p>
                          ) : null}
                        </article>
                      );
                    })
                  )
                ) : (
                  <p className="finding-evidence-message">No qualifying records were retained for this indicator.</p>
                )}
              </div>
            </section>
          ) : null}

          <div className="working-paper-section">
            <h3>Correlated Risk Events</h3>
            {correlations.length ? (
              correlations.map((correlation) => (
                <p key={correlation.key}>
                  <strong>Risk Pattern Requiring Auditor Review</strong>
                  <br />
                  {correlation.text}
                </p>
              ))
            ) : (
              <p>No cross-source correlation identified in the selected demo data.</p>
            )}
          </div>

          <div className="working-paper-section">
            <h3>AI Suggested Audit Procedures</h3>
            <p>
              Rule-based prototype summary: {profileItem.branch} has {profileItem.riskEvents} risk indicators across the
              selected sources. This is Suggested Audit Attention, not a fraud conclusion.
            </p>
            <ul>
              <li>Review supporting documentation for identified GL transactions.</li>
              <li>Compare system activity with physical access records.</li>
              <li>Review teller shortage incident reports and corrective actions.</li>
              <li>Discuss recurring indicators with the Branch Manager.</li>
            </ul>
          </div>
        </section>
      ) : null}

      {showUploadCentre && store ? (
        <section className="panel branch-risk-upload-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Separate Branch Risk storage</p>
              <h2>Data Upload Centre</h2>
            </div>
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setShowUploadCentre(false);
                refresh();
              }}
            >
              Back to Risk Dashboard
            </button>
          </div>

          <div className="branch-upload-grid">
            {branchRiskSourceDefinitions.map((source) => {
              const records = branchRiskRecords(store, source.key);
              const upload = store.uploads?.[source.key];
              return (
                <div className="branch-upload-card" key={source.key}>
                  <span className="upload-icon">{source.icon}</span>
                  <div>
                    <strong>{source.label}</strong>
                    <p>Source: {source.department}</p>
                    <p>{upload ? upload.fileName : store.demo ? 'Demo data loaded' : 'No file imported'}</p>
                    <small>
                      {upload
                        ? `Worksheet: ${upload.worksheetName || 'N/A'} · Uploaded ${new Date(upload.uploadDate).toLocaleString()} · ${upload.records} records · ${upload.status}${
                            upload.detectedColumns?.length ? ` · Columns: ${upload.detectedColumns.join(', ')}` : ''
                          }`
                        : `${records.length} records · ${store.demo ? 'Demo' : 'Awaiting import'}`}
                    </small>
                  </div>
                  <label className="ghost-button">
                    {upload ? 'Replace File' : 'Upload File'}
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      hidden
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleSourceUpload(source.key, file);
                        event.target.value = '';
                      }}
                    />
                  </label>
                </div>
              );
            })}
          </div>

          <div className="data-quality-summary">
            {(() => {
              const total = branchRiskSourceDefinitions.reduce((sum, source) => sum + branchRiskRecords(store, source.key).length, 0);
              const invalid = Object.values(store.uploads || {}).reduce((sum, upload) => sum + (upload?.invalidRecords || 0), 0);
              const duplicates = Object.values(store.uploads || {}).reduce((sum, upload) => sum + (upload?.duplicateRecords || 0), 0);
              return (
                <>
                  <div className="data-quality-card"><strong>{total}</strong><span>Valid Records</span></div>
                  <div className="data-quality-card"><strong>{invalid}</strong><span>Invalid Records</span></div>
                  <div className="data-quality-card"><strong>{duplicates}</strong><span>Duplicate Records</span></div>
                  <div className="data-quality-card"><strong>{invalid + duplicates}</strong><span>Excluded Records</span></div>
                </>
              );
            })()}
          </div>

          {pendingImport ? (
            <section className="branch-import-review">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Auditor confirmation required</p>
                  <h3>Import Review</h3>
                </div>
              </div>
              <p className="finding-evidence-message">{importMessage}</p>

              {pendingImport.sourceKey === 'complaints' ? (
                <div className="complaint-import-details">
                  <div className="complaint-import-meta">
                    <strong>Worksheet:</strong> {pendingImport.worksheetName}
                    <span>
                      <strong>Detected columns:</strong> {(pendingImport.detectedColumns || []).join(', ')}
                    </span>
                  </div>
                  <div className="table-scroll">
                    <table className="complaint-review-table">
                      <thead>
                        <tr>
                          <th>Complaint Reference</th><th>Date</th><th>Branch</th><th>Category</th>
                          <th>Short Description</th><th>Classification</th><th>Mapping Status</th><th>Include / Exclude</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingImport.data.map((complaint, index) => (
                          <tr key={index}>
                            <td>{String(complaint.complaintReference || 'Missing reference')}</td>
                            <td>{String(complaint.complaintDate || 'Missing date')}</td>
                            <td>
                              <input
                                className="complaint-review-input"
                                defaultValue={String(complaint.branchId || complaint.branchName || '')}
                                onBlur={(event) => {
                                  const canonical = canonicalBranchId(event.target.value.trim());
                                  updateComplaintRow(index, {
                                    branchId: event.target.value.trim(),
                                    canonicalBranchId: canonical,
                                    mappingStatus: canonical ? 'Mapped' : 'Branch Mapping Required',
                                  });
                                  event.target.value = canonical ? branchDisplayName(canonical) : '';
                                }}
                              />
                            </td>
                            <td>{String(complaint.category || '')}</td>
                            <td>{String(complaint.shortDescription || '')}</td>
                            <td>
                              <select
                                className="complaint-review-select"
                                value={String(complaint.classification || '')}
                                onChange={(event) => {
                                  const classification = event.target.value;
                                  const mappingStatus =
                                    classification === 'Branch Related'
                                      ? complaint.branchId
                                        ? 'Mapped'
                                        : 'Branch Mapping Required'
                                      : 'Not Applicable';
                                  updateComplaintRow(index, {
                                    classification,
                                    mappingStatus,
                                    include: classification === 'Branch Related' && mappingStatus === 'Mapped',
                                  });
                                }}
                              >
                                <option>Branch Related</option>
                                <option>Non-Branch Related</option>
                                <option>Requires Auditor Review</option>
                              </select>
                            </td>
                            <td>{String(complaint.mappingStatus || '')}</td>
                            <td>
                              <input
                                type="checkbox"
                                checked={Boolean(complaint.include)}
                                onChange={(event) => updateComplaintRow(index, { include: event.target.checked })}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="data-quality-summary">
                    {(() => {
                      const complaints = pendingImport.data;
                      const mapped = complaints.filter((c) => c.classification === 'Branch Related' && c.mappingStatus === 'Mapped').length;
                      const nonBranch = complaints.filter((c) => c.classification === 'Non-Branch Related').length;
                      const requiresReview = complaints.filter((c) => c.classification === 'Requires Auditor Review').length;
                      const branchRelated = complaints.filter((c) => c.classification === 'Branch Related').length;
                      const unmapped = complaints.filter((c) => c.classification === 'Branch Related' && c.mappingStatus !== 'Mapped').length;
                      const excluded = complaints.filter(
                        (c) => c.classification === 'Non-Branch Related' || (c.classification === 'Branch Related' && !c.include && !c.invalid)
                      ).length;
                      const categoryTotal = branchRelated + nonBranch + requiresReview;
                      return (
                        <>
                          <div className="data-quality-card"><strong>{complaints.length}</strong><span>Total Complaints</span></div>
                          <div className="data-quality-card"><strong>{branchRelated}</strong><span>Branch Related</span></div>
                          <div className="data-quality-card"><strong>{nonBranch}</strong><span>Non-Branch Related</span></div>
                          <div className="data-quality-card"><strong>{requiresReview}</strong><span>Requires Auditor Review</span></div>
                          <div className="data-quality-card"><strong>{mapped}</strong><span>Successfully Mapped</span></div>
                          <div className="data-quality-card"><strong>{unmapped}</strong><span>Unmapped</span></div>
                          <div className="data-quality-card"><strong>{pendingImport.duplicateRecords}</strong><span>Duplicate Records</span></div>
                          <div className="data-quality-card"><strong>{pendingImport.invalidRecords}</strong><span>Invalid Records</span></div>
                          <div className="data-quality-card"><strong>{excluded}</strong><span>Excluded Records</span></div>
                          <div className="data-quality-card"><strong>{categoryTotal}</strong><span>Classification Total</span></div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              ) : null}

              <div className="working-paper-actions">
                <button type="button" className="primary-button" onClick={handleConfirmImport}>
                  Import to Branch Risk Intelligence
                </button>
                <button type="button" className="ghost-button" onClick={handleCancelImport}>
                  Cancel Import
                </button>
              </div>
            </section>
          ) : null}

          <button type="button" className="ghost-button" onClick={handleClearDemoData}>
            Clear Demo Branch Data
          </button>
        </section>
      ) : null}

      {showMethodology ? (
        <section className="panel branch-risk-methodology-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Auditor configuration</p>
              <h2>Risk Scoring Methodology</h2>
            </div>
            <button type="button" className="ghost-button" onClick={() => setShowMethodology(false)}>
              Back to Risk Dashboard
            </button>
          </div>
          <div className="branch-weight-grid">
            {(Object.keys(WEIGHT_LABELS) as (keyof BranchRiskWeights)[]).map((key) => (
              <label className="rule-field" key={key}>
                <span>{WEIGHT_LABELS[key]} (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={weightsForm[key]}
                  onChange={(event) => setWeightsForm({ ...weightsForm, [key]: Number(event.target.value || 0) })}
                />
              </label>
            ))}
          </div>
          {weightError ? <p className="validation-error">Risk weights must total 100%.</p> : null}
          <button type="button" className="primary-button" onClick={handleSaveWeights}>
            Save Risk Weights
          </button>
        </section>
      ) : null}
    </div>
  );
}
