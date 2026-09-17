export const AUDIT_TRAIL_STORAGE_KEY = 'audit-guard-raffle-validation-history';
export const WORKING_PAPER_STORAGE_KEY = 'audit-guard-raffle-working-papers';
export const FINDINGS_STORAGE_KEY = 'audit-guard-findings';
export const REMEDIATION_STORAGE_KEY = 'audit-guard-remediation';
export const REMEDIATION_AUDIT_EVENTS_STORAGE_KEY = 'audit-guard-remediation-audit-events';
export const CONTROLS_STORAGE_KEY = 'audit-guard-controls';
export const BRANCH_RISK_STORAGE_KEY = 'audit-guard-branch-risk-intelligence';

export function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}
