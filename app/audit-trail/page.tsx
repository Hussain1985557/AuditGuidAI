'use client';

import { useEffect, useState } from 'react';
import {
  ensureSeededHistoricalRun,
  getAuditTrailEntries,
  getWorkingPaperByRun,
  saveWorkingPaperByRun,
} from '@/lib/auditTrail';
import {
  getRemediationAuditEvents,
} from '@/lib/remediation';
import { downloadCsv, formatNumber } from '@/lib/csv';
import { useCrossView } from '@/lib/crossView';
import type { AuditTrailEntry, ReviewStatus, WorkingPaper } from '@/lib/types';

type DetailMode = { mode: 'details' | 'workingPaper'; runId: string } | null;

export default function AuditTrailPage() {
  const { intent, setIntent } = useCrossView();
  const [entries, setEntries] = useState<AuditTrailEntry[]>([]);
  const [notFoundRunId, setNotFoundRunId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailMode>(null);
  const [workingPaper, setWorkingPaper] = useState<WorkingPaper | null>(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [remediationEvents, setRemediationEvents] = useState<Awaited<ReturnType<typeof getRemediationAuditEvents>>>([]);

  useEffect(() => {
    void (async () => {
      await ensureSeededHistoricalRun();
      setEntries(await getAuditTrailEntries());
      setRemediationEvents(await getRemediationAuditEvents());
    })();
  }, []);

  useEffect(() => {
    if (intent?.type === 'openAuditTrailRun') {
      void (async () => {
        const found = (await getAuditTrailEntries()).find((entry) => entry.runId === intent.runId);
        if (found) {
          setNotFoundRunId(null);
          await openDetails(intent.runId, intent.mode);
        } else {
          setNotFoundRunId(intent.runId);
          setDetail(null);
        }
      })();
      setIntent(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent]);

  async function openDetails(runId: string, mode: 'details' | 'workingPaper') {
    const paper = mode === 'workingPaper' ? await getWorkingPaperByRun(runId) : null;
    setNotFoundRunId(null);
    setSaveStatus('');
    if (paper) setWorkingPaper(paper);
    setDetail({ mode, runId });
  }

  async function handleSaveWorkingPaper() {
    if (!workingPaper) return;
    await saveWorkingPaperByRun(workingPaper.runId, workingPaper);
    setSaveStatus('Saved');
  }

  function handleExportEvidence(selected: AuditTrailEntry) {
    const evidence = selected.exceptionEvidence || [];
    if (!evidence.length) return;
    downloadCsv(`${selected.runId}-exception-evidence.csv`, [
      ['Run ID', 'Transaction ID', 'Transaction Date', 'Transaction Amount', 'Customer / Identifier', 'Raffle Entries', 'Validation Result', 'Specific Exception Reason(s)'],
      ...evidence.map((record) => [
        selected.runId,
        record.transactionId || '',
        record.transactionDate || '',
        record.transactionAmount || '',
        record.customerId || '',
        record.raffleEntries || '',
        record.validationResult || 'Invalid',
        record.exceptionReasons.join('; '),
      ]),
    ]);
  }

  const selectedEntry = detail ? entries.find((entry) => entry.runId === detail.runId) || null : null;

  return (
    <div>
      <header className="topbar">
        <div>
          <p className="eyebrow">Prototype</p>
          <h1>Audit Trail</h1>
        </div>
      </header>

      <section className="panel audit-trail-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Local storage</p>
            <h2>Validation History</h2>
          </div>
        </div>

        <div className="prototype-note">Prototype — locally stored validation history</div>

        <table>
          <thead>
            <tr>
              <th>Run ID</th>
              <th>Date &amp; Time</th>
              <th>File Name</th>
              <th>Records Tested</th>
              <th>Valid</th>
              <th>Invalid</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {entries.length ? (
              entries
                .slice()
                .reverse()
                .map((entry) => (
                  <tr key={entry.runId}>
                    <td>{entry.runId}</td>
                    <td>{new Date(entry.dateTime).toLocaleString()}</td>
                    <td>{entry.fileName}</td>
                    <td>{formatNumber(entry.totalRecordsTested)}</td>
                    <td>{formatNumber(entry.validRecords)}</td>
                    <td>{formatNumber(entry.invalidRecords)}</td>
                    <td>{entry.status}</td>
                    <td>
                      <div className="audit-trail-actions">
                        <button type="button" className="audit-trail-button" onClick={() => openDetails(entry.runId, 'details')}>
                          View Details
                        </button>
                        <button
                          type="button"
                          className="audit-trail-button working-paper-button"
                          onClick={() => openDetails(entry.runId, 'workingPaper')}
                        >
                          Working Paper
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
            ) : (
              <tr>
                <td colSpan={8}>No validation history yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="panel audit-trail-panel remediation-audit-events-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Remediation activity</p>
            <h2>Remediation and Closure Changes</h2>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date &amp; Time</th>
                <th>Finding ID</th>
                <th>Related Run ID</th>
                <th>Remediation Status</th>
                <th>Validation Result</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {remediationEvents.length ? (
                remediationEvents
                  .slice()
                  .reverse()
                  .map((event, index) => (
                    <tr key={`${event.dateTime}-${index}`}>
                      <td>{new Date(event.dateTime).toLocaleString()}</td>
                      <td>{event.findingId}</td>
                      <td>{event.relatedRunId}</td>
                      <td>{event.remediationStatus}</td>
                      <td>{event.validationResult}</td>
                      <td>{event.change}</td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={6}>No remediation changes recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {notFoundRunId ? (
        <section className="panel audit-trail-details">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Details</p>
              <h2>Run Details</h2>
            </div>
          </div>
          <div className="validation-error">Related audit run not found: {notFoundRunId}</div>
        </section>
      ) : null}

      {selectedEntry && detail?.mode === 'details' ? (
        <section className="panel audit-trail-details">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Details</p>
              <h2>Run Details</h2>
            </div>
          </div>
          <div className="detail-grid">
            <div className="detail-item"><span>Run ID</span><strong>{selectedEntry.runId}</strong></div>
            <div className="detail-item"><span>Date &amp; Time</span><strong>{new Date(selectedEntry.dateTime).toLocaleString()}</strong></div>
            <div className="detail-item"><span>File Name</span><strong>{selectedEntry.fileName}</strong></div>
            <div className="detail-item"><span>Status</span><strong>{selectedEntry.status}</strong></div>
            <div className="detail-item"><span>Campaign Start Date</span><strong>{selectedEntry.campaignStartDate}</strong></div>
            <div className="detail-item"><span>Campaign End Date</span><strong>{selectedEntry.campaignEndDate}</strong></div>
            <div className="detail-item"><span>Minimum Eligible Amount</span><strong>{selectedEntry.minimumEligibleAmount}</strong></div>
            <div className="detail-item"><span>Raffle Entries per Eligible Amount</span><strong>{selectedEntry.entriesPerEligibleAmount}</strong></div>
            <div className="detail-item"><span>Exclude Employees</span><strong>{selectedEntry.excludeEmployees}</strong></div>
            <div className="detail-item"><span>Exclude Reversed Transactions</span><strong>{selectedEntry.excludeReversedTransactions}</strong></div>
            <div className="detail-item"><span>Total Records Tested</span><strong>{formatNumber(selectedEntry.totalRecordsTested)}</strong></div>
            <div className="detail-item"><span>Valid Records</span><strong>{formatNumber(selectedEntry.validRecords)}</strong></div>
            <div className="detail-item"><span>Invalid Records</span><strong>{formatNumber(selectedEntry.invalidRecords)}</strong></div>
            <div className="detail-item"><span>Duplicate Records</span><strong>{formatNumber(selectedEntry.duplicateRecords)}</strong></div>
            <div className="detail-item"><span>Reversed Transactions</span><strong>{formatNumber(selectedEntry.reversedTransactions)}</strong></div>
            <div className="detail-item"><span>Outside Campaign Period</span><strong>{formatNumber(selectedEntry.outsideCampaignPeriod)}</strong></div>
          </div>
        </section>
      ) : null}

      {selectedEntry && detail?.mode === 'workingPaper' && workingPaper ? (
        <section className="panel audit-trail-details">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Details</p>
              <h2>Audit Working Paper</h2>
            </div>
          </div>
          <div className="working-paper-form">
            <div className="detail-grid">
              <div className="detail-item"><span>Run ID</span><strong>{selectedEntry.runId}</strong></div>
              <div className="detail-item"><span>File Name</span><strong>{selectedEntry.fileName}</strong></div>
              <div className="detail-item"><span>Date &amp; Time</span><strong>{new Date(selectedEntry.dateTime).toLocaleString()}</strong></div>
              <div className="detail-item"><span>Records Tested</span><strong>{formatNumber(selectedEntry.totalRecordsTested)}</strong></div>
              <div className="detail-item"><span>Valid Records</span><strong>{formatNumber(selectedEntry.validRecords)}</strong></div>
              <div className="detail-item"><span>Invalid Records</span><strong>{formatNumber(selectedEntry.invalidRecords)}</strong></div>
            </div>

            <div className="working-paper-section">
              <h3>Audit Objective</h3>
              <p>Verify that raffle entries were issued only to eligible transactions in accordance with the configured campaign rules.</p>
            </div>

            <div className="working-paper-section working-paper-columns">
              <div>
                <h3>Validation Criteria / Rules Applied</h3>
                <ul>
                  <li>Campaign period: {selectedEntry.campaignStartDate} to {selectedEntry.campaignEndDate}</li>
                  <li>Minimum eligible amount: {selectedEntry.minimumEligibleAmount}</li>
                  <li>Raffle entries per eligible amount: {selectedEntry.entriesPerEligibleAmount}</li>
                  <li>Exclude employees: {selectedEntry.excludeEmployees}</li>
                  <li>Exclude reversed transactions: {selectedEntry.excludeReversedTransactions}</li>
                </ul>
              </div>
              <div>
                <h3>Exception Summary</h3>
                <ul>
                  <li>Duplicate transactions: {formatNumber(selectedEntry.duplicateRecords)}</li>
                  <li>Reversed transactions: {formatNumber(selectedEntry.reversedTransactions)}</li>
                  <li>Outside campaign period: {formatNumber(selectedEntry.outsideCampaignPeriod)}</li>
                  <li>Total exceptions identified: {formatNumber(selectedEntry.invalidRecords)}</li>
                </ul>
              </div>
            </div>

            <div className="working-paper-section">
              <h3>Population Tested</h3>
              <ul>
                <li>File name: {selectedEntry.fileName}</li>
                <li>Total records tested: {formatNumber(selectedEntry.totalRecordsTested)}</li>
                <li>Valid records: {formatNumber(selectedEntry.validRecords)}</li>
                <li>Invalid records: {formatNumber(selectedEntry.invalidRecords)}</li>
              </ul>
            </div>

            <div className="working-paper-section exception-evidence-section">
              <div className="working-paper-section-heading">
                <div>
                  <h3>Exception Details / Audit Evidence</h3>
                  <p>Read-only transaction-level evidence retained for {selectedEntry.runId}.</p>
                </div>
                <button
                  type="button"
                  className="ghost-button evidence-export-button"
                  disabled={!selectedEntry.exceptionEvidence?.length}
                  onClick={() => handleExportEvidence(selectedEntry)}
                >
                  Export Exception Evidence CSV
                </button>
              </div>
              {selectedEntry.exceptionEvidence === null ? (
                <div className="evidence-limitation">
                  Transaction-level exception evidence was not retained for this historical run. The original validation
                  summary is available, but individual invalid records cannot be reconstructed without fabricating
                  historical evidence.
                </div>
              ) : (
                <div className="evidence-table-wrap">
                  <table className="evidence-table">
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Transaction Date</th>
                        <th>Transaction Amount</th>
                        <th>Customer / Identifier</th>
                        <th>Raffle Entries</th>
                        <th>Validation Result</th>
                        <th>Specific Exception Reason(s)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEntry.exceptionEvidence.length ? (
                        selectedEntry.exceptionEvidence.map((record, index) => (
                          <tr key={`${record.transactionId}-${index}`}>
                            <td>{record.transactionId}</td>
                            <td>{record.transactionDate}</td>
                            <td>{record.transactionAmount}</td>
                            <td>{record.customerId}</td>
                            <td>{record.raffleEntries}</td>
                            <td>{record.validationResult || 'Invalid'}</td>
                            <td>{record.exceptionReasons.join('; ')}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7}>No invalid records were stored for this run.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="working-paper-form-grid">
              <label className="rule-field">
                <span>Prepared By</span>
                <input
                  type="text"
                  value={workingPaper.preparedBy}
                  onChange={(event) => setWorkingPaper({ ...workingPaper, preparedBy: event.target.value })}
                />
              </label>

              <label className="rule-field">
                <span>Reviewed By</span>
                <input
                  type="text"
                  value={workingPaper.reviewedBy}
                  onChange={(event) => setWorkingPaper({ ...workingPaper, reviewedBy: event.target.value })}
                />
              </label>

              <label className="rule-field">
                <span>Review Status</span>
                <select
                  value={workingPaper.reviewStatus}
                  onChange={(event) => setWorkingPaper({ ...workingPaper, reviewStatus: event.target.value as ReviewStatus })}
                >
                  <option value="Draft">Draft</option>
                  <option value="Prepared">Prepared</option>
                  <option value="Reviewed">Reviewed</option>
                </select>
              </label>

              <label className="rule-field">
                <span>Preparation Date</span>
                <input
                  type="date"
                  value={workingPaper.preparationDate}
                  onChange={(event) => setWorkingPaper({ ...workingPaper, preparationDate: event.target.value })}
                />
              </label>

              <label className="rule-field">
                <span>Review Date</span>
                <input
                  type="date"
                  value={workingPaper.reviewDate}
                  onChange={(event) => setWorkingPaper({ ...workingPaper, reviewDate: event.target.value })}
                />
              </label>
            </div>

            <label className="rule-field">
              <span>Auditor Notes</span>
              <textarea
                rows={4}
                value={workingPaper.auditorNotes}
                onChange={(event) => setWorkingPaper({ ...workingPaper, auditorNotes: event.target.value })}
              />
            </label>

            <label className="rule-field">
              <span>Audit Conclusion</span>
              <textarea
                rows={4}
                value={workingPaper.conclusion}
                onChange={(event) => setWorkingPaper({ ...workingPaper, conclusion: event.target.value })}
              />
            </label>

            <div className="working-paper-actions">
              <button type="button" className="primary-button" onClick={handleSaveWorkingPaper}>
                Save Working Paper
              </button>
              <button type="button" className="ghost-button" onClick={() => setDetail(null)}>
                Back to Audit Trail
              </button>
              <span className="working-paper-save-status" role="status" aria-live="polite">
                {saveStatus}
              </span>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
