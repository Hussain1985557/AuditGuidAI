import { FINDINGS_STORAGE_KEY, readStorage, writeStorage } from './storage';
import type { Finding } from './types';

export function getFindings(): Finding[] {
  return readStorage<Finding[]>(FINDINGS_STORAGE_KEY, []);
}

export function saveFindings(findings: Finding[]): void {
  writeStorage(FINDINGS_STORAGE_KEY, findings);
}

export function generateFindingId(): string {
  const year = new Date().getFullYear();
  const highest = getFindings().reduce((max, finding) => {
    const match = String(finding.findingId || '').match(new RegExp(`^F-${year}-(\\d{6})$`));
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `F-${year}-${String(highest + 1).padStart(6, '0')}`;
}

export function upsertFinding(finding: Finding): void {
  const findings = getFindings();
  const existingIndex = findings.findIndex((item) => item.findingId === finding.findingId);
  if (existingIndex >= 0) {
    findings[existingIndex] = finding;
  } else {
    findings.push(finding);
  }
  saveFindings(findings);
}
