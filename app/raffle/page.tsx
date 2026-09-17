'use client';

import { useRef, useState } from 'react';
import { persistAuditTrail } from '@/lib/auditTrail';
import { downloadCsv, formatNumber, normalizeHeader, parseCSV } from '@/lib/csv';
import { REQUIRED_COLUMNS, objectFromRows, validateCsvRows } from '@/lib/raffleValidation';
import type { ValidatedRaffleRow, ValidationRules, ValidationSummary } from '@/lib/types';

const EMPTY_SUMMARY: ValidationSummary = {
  totalRecordsTested: 0,
  validRecords: 0,
  invalidRecords: 0,
  duplicateRecords: 0,
  reversedTransactions: 0,
  outsideCampaignPeriod: 0,
};

export default function RafflePage() {
  const [rules, setRules] = useState<ValidationRules>({
    startDate: '2026-01-15',
    endDate: '2026-03-31',
    minimumEligibleAmount: 10,
    entriesPerEligibleAmount: 1,
    excludeEmployees: true,
    excludeReversed: true,
  });
  const [fileName, setFileName] = useState('Drop a file here or click to browse');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState('');
  const [summary, setSummary] = useState<ValidationSummary>(EMPTY_SUMMARY);
  const [invalidRows, setInvalidRows] = useState<ValidatedRaffleRow[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File, activeRules: ValidationRules) {
    setFileName(file.name);

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setValidationError('This prototype supports CSV files only. Please upload a CSV file with the required columns.');
      return;
    }

    try {
      setValidationError('');
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length < 2) {
        setValidationError('The CSV file is empty or missing data rows.');
        return;
      }

      const header = rows[0].map(normalizeHeader);
      const missing = REQUIRED_COLUMNS.filter((column) => !header.includes(column));

      if (missing.length > 0) {
        setValidationError(`Missing required CSV columns: ${missing.join(', ')}`);
        return;
      }

      const normalizedRows = objectFromRows(rows);
      const validRows = validateCsvRows(normalizedRows, activeRules);
      const invalid = validRows.filter((row) => !row.isValid);

      setSummary({
        totalRecordsTested: validRows.length,
        validRecords: validRows.filter((row) => row.isValid).length,
        invalidRecords: invalid.length,
        duplicateRecords: validRows.filter((row) => row.exceptions.includes('Duplicate Transaction')).length,
        reversedTransactions: validRows.filter((row) => row.exceptions.includes('Reversed Transaction')).length,
        outsideCampaignPeriod: validRows.filter((row) => row.exceptions.includes('Outside Campaign Period')).length,
      });
      setInvalidRows(invalid);
      await persistAuditTrail(file.name, activeRules, validRows);
    } catch {
      setValidationError('Unable to read the CSV file. Please check the file format and try again.');
    }
  }

  function handleFileChosen(file: File | null) {
    if (!file) return;
    setSelectedFile(file);
    void processFile(file, rules);
  }

  function handleRunValidation() {
    if (!selectedFile) {
      setValidationError('Please upload a CSV file before running validation.');
      return;
    }
    void processFile(selectedFile, rules);
  }

  function handleExportExceptions() {
    if (!invalidRows.length) return;
    downloadCsv('raffle-validation-exceptions.csv', [
      ['Customer ID', 'Transaction ID', 'Transaction Date', 'Amount', 'Number of Entries', 'Expected Entries', 'Actual Entries', 'Exception Reason'],
      ...invalidRows.map((row) => [
        row.Customer_ID || '',
        row.Transaction_ID || '',
        row.Transaction_Date || '',
        row.Amount || '',
        row.Entries || '',
        row.expectedEntries,
        row.actualEntries,
        row.exceptions.join('; '),
      ]),
    ]);
  }

  return (
    <div>
      <header className="topbar">
        <div>
          <p className="eyebrow">Rule-Based Validation</p>
          <h1>Raffle Validation</h1>
        </div>
      </header>

      <section className="panel raffle-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Upload</p>
            <h2>Raffle file</h2>
          </div>
        </div>

        {validationError ? (
          <div className="validation-error" role="alert">
            {validationError}
          </div>
        ) : null}

        <label
          className={`upload-dropzone${dragOver ? ' dragover' : ''}`}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragOver(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            const file = event.dataTransfer.files?.[0];
            handleFileChosen(file || null);
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(event) => handleFileChosen(event.target.files?.[0] || null)}
          />
          <div className="upload-icon">⇪</div>
          <div className="upload-copy">
            <strong>Upload CSV raffle file</strong>
            <span>{fileName}</span>
          </div>
        </label>
      </section>

      <section className="panel raffle-rules-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Configuration</p>
            <h2>Validation Rules</h2>
          </div>
        </div>

        <div className="rules-grid">
          <label className="rule-field">
            <span>Campaign Start Date</span>
            <input
              type="date"
              value={rules.startDate}
              onChange={(event) => setRules({ ...rules, startDate: event.target.value })}
            />
          </label>

          <label className="rule-field">
            <span>Campaign End Date</span>
            <input
              type="date"
              value={rules.endDate}
              onChange={(event) => setRules({ ...rules, endDate: event.target.value })}
            />
          </label>

          <label className="rule-field">
            <span>Minimum Eligible Amount</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={rules.minimumEligibleAmount}
              onChange={(event) => setRules({ ...rules, minimumEligibleAmount: Number(event.target.value || 0) })}
            />
          </label>

          <label className="rule-field">
            <span>Raffle Entries per Eligible Amount</span>
            <input
              type="number"
              min={1}
              step={1}
              value={rules.entriesPerEligibleAmount}
              onChange={(event) => setRules({ ...rules, entriesPerEligibleAmount: Number(event.target.value || 0) })}
            />
          </label>

          <label className="rule-field">
            <span>Exclude Employees</span>
            <select
              value={rules.excludeEmployees ? 'Yes' : 'No'}
              onChange={(event) => setRules({ ...rules, excludeEmployees: event.target.value === 'Yes' })}
            >
              <option>Yes</option>
              <option>No</option>
            </select>
          </label>

          <label className="rule-field">
            <span>Exclude Reversed Transactions</span>
            <select
              value={rules.excludeReversed ? 'Yes' : 'No'}
              onChange={(event) => setRules({ ...rules, excludeReversed: event.target.value === 'Yes' })}
            >
              <option>Yes</option>
              <option>No</option>
            </select>
          </label>
        </div>

        <div className="raffle-toolbar">
          <button type="button" className="primary-button raffle-button" onClick={handleRunValidation}>
            Run Validation
          </button>
          {invalidRows.length ? (
            <button type="button" className="ghost-button export-button" onClick={handleExportExceptions}>
              Export Exceptions CSV
            </button>
          ) : null}
        </div>
      </section>

      <section className="panel results-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Results</p>
            <h2>Validation Summary</h2>
          </div>
        </div>

        <div className="results-grid">
          <div className="result-card">
            <span>Total Entries</span>
            <strong>{formatNumber(summary.totalRecordsTested)}</strong>
          </div>
          <div className="result-card">
            <span>Valid Entries</span>
            <strong>{formatNumber(summary.validRecords)}</strong>
          </div>
          <div className="result-card">
            <span>Invalid Entries</span>
            <strong>{formatNumber(summary.invalidRecords)}</strong>
          </div>
          <div className="result-card">
            <span>Duplicate Entries</span>
            <strong>{formatNumber(summary.duplicateRecords)}</strong>
          </div>
          <div className="result-card">
            <span>Reversed Transactions</span>
            <strong>{formatNumber(summary.reversedTransactions)}</strong>
          </div>
          <div className="result-card">
            <span>Outside Campaign Period</span>
            <strong>{formatNumber(summary.outsideCampaignPeriod)}</strong>
          </div>
        </div>
      </section>

      <section className="panel exceptions-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Review</p>
            <h2>Exceptions</h2>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Customer ID</th>
              <th>Transaction ID</th>
              <th>Transaction Date</th>
              <th>Amount</th>
              <th>Number of Entries</th>
              <th>Expected Entries</th>
              <th>Actual Entries</th>
              <th>Exception Reason</th>
            </tr>
          </thead>
          <tbody>
            {invalidRows.length ? (
              invalidRows.map((row) => (
                <tr key={`${row.Transaction_ID}-${row._rowNumber}`}>
                  <td>{row.Customer_ID || ''}</td>
                  <td>{row.Transaction_ID || ''}</td>
                  <td>{row.Transaction_Date || ''}</td>
                  <td>{row.Amount || ''}</td>
                  <td>{row.Entries || '0'}</td>
                  <td>{row.expectedEntries}</td>
                  <td>{row.actualEntries}</td>
                  <td>{row.exceptions.join('; ')}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8}>No invalid records yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
