import { create } from 'zustand';

import { emptyCounts } from '@/domain/prayers';
import { loadSummary, type LedgerSummary } from '@/services/ledger';

interface LedgerState {
  summary: LedgerSummary;
  /** Bumped on every refresh so lists can re-query. */
  version: number;
  refresh: () => void;
}

const initial: LedgerSummary = {
  owed: emptyCounts(),
  adjustments: emptyCounts(),
  completed: emptyCounts(),
  remaining: emptyCounts(),
  totalOwed: 0,
  totalRemaining: 0,
};

export const useLedger = create<LedgerState>((set) => ({
  summary: initial,
  version: 0,
  refresh: () => set((s) => ({ summary: loadSummary(), version: s.version + 1 })),
}));
