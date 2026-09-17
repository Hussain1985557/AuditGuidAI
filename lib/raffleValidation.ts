import { normalizeHeader, parseBoolean, parseDate, parseNumber } from './csv';
import type { RaffleRow, ValidatedRaffleRow, ValidationRules } from './types';

export const REQUIRED_COLUMNS = [
  'Customer_ID',
  'Transaction_ID',
  'Transaction_Date',
  'Amount',
  'Entries',
  'Employee',
  'Reversed',
] as const;

export function objectFromRows(rows: string[][]): RaffleRow[] {
  const header = rows[0].map(normalizeHeader);
  const map: Record<string, number> = {};
  header.forEach((name, index) => {
    map[name] = index;
  });

  return rows.slice(1).map((row, rowIndex) => {
    const values: Record<string, string> = {};
    REQUIRED_COLUMNS.forEach((column) => {
      const index = map[column];
      values[column] = index !== undefined ? row[index] ?? '' : '';
    });
    return { ...(values as unknown as Omit<RaffleRow, '_rowNumber'>), _rowNumber: rowIndex + 2 };
  });
}

export function calculateExpectedEntries(
  amount: number,
  minimumEligibleAmount: number,
  entriesPerEligibleAmount: number
): number {
  if (!Number.isFinite(amount) || !Number.isFinite(minimumEligibleAmount) || minimumEligibleAmount <= 0) {
    return 0;
  }

  return Math.floor(amount / minimumEligibleAmount) * entriesPerEligibleAmount;
}

export function validateCsvRows(rows: RaffleRow[], rules: ValidationRules): ValidatedRaffleRow[] {
  const duplicateCounts = new Map<string, number>();

  rows.forEach((row) => {
    const transactionId = String(row.Transaction_ID || '').trim();
    if (transactionId) {
      const key = transactionId.toUpperCase();
      duplicateCounts.set(key, (duplicateCounts.get(key) || 0) + 1);
    }
  });

  return rows.map((row) => {
    const exceptions: string[] = [];
    const transactionDate = parseDate(row.Transaction_Date);
    const startDate = parseDate(rules.startDate);
    const endDate = parseDate(rules.endDate);
    const amount = parseNumber(row.Amount);
    const entryCount = parseNumber(row.Entries);
    const expectedEntries = calculateExpectedEntries(amount, rules.minimumEligibleAmount, rules.entriesPerEligibleAmount);

    const transactionId = String(row.Transaction_ID || '').trim();
    if (transactionId && (duplicateCounts.get(transactionId.toUpperCase()) || 0) > 1) {
      exceptions.push('Duplicate Transaction');
    }

    if (transactionDate && startDate && endDate) {
      if (transactionDate < startDate || transactionDate > endDate) {
        exceptions.push('Outside Campaign Period');
      }
    }

    if (amount < rules.minimumEligibleAmount) {
      exceptions.push('Below Minimum Eligible Amount');
    }

    if (expectedEntries !== entryCount) {
      exceptions.push('Incorrect Number of Entries');
    }

    if (rules.excludeEmployees && parseBoolean(row.Employee)) {
      exceptions.push('Employee Not Eligible');
    }

    if (rules.excludeReversed && parseBoolean(row.Reversed)) {
      exceptions.push('Reversed Transaction');
    }

    return {
      ...row,
      actualEntries: row.Entries || '0',
      expectedEntries,
      exceptions,
      isValid: exceptions.length === 0,
    };
  });
}
