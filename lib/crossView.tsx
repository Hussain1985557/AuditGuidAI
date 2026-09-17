'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export type CrossViewIntent =
  | { type: 'openFinding'; findingId: string }
  | { type: 'createFinding'; prefill: { auditArea?: string; condition?: string } }
  | { type: 'openControl'; controlId: string }
  | { type: 'createControl'; prefill: { auditArea?: string; controlName?: string } }
  | { type: 'openAuditTrailRun'; runId: string; mode: 'details' | 'workingPaper' }
  | { type: 'openRemediation'; findingId: string };

interface CrossViewContextValue {
  intent: CrossViewIntent | null;
  setIntent: (intent: CrossViewIntent | null) => void;
}

const CrossViewContext = createContext<CrossViewContextValue | null>(null);

export function CrossViewProvider({ children }: { children: ReactNode }) {
  const [intent, setIntent] = useState<CrossViewIntent | null>(null);
  return <CrossViewContext.Provider value={{ intent, setIntent }}>{children}</CrossViewContext.Provider>;
}

export function useCrossView(): CrossViewContextValue {
  const ctx = useContext(CrossViewContext);
  if (!ctx) {
    throw new Error('useCrossView must be used within CrossViewProvider');
  }
  return ctx;
}
