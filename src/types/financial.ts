// Financial Event Types for Money Pulse (Epic 5)

export interface FinancialEvent {
  id: number;
  day: string; // yyyy-MM-dd
  whenMs: number; // epoch
  direction: 1 | -1; // +1 income / -1 expense
  amount: number;
  currency: string; // "AED"/"USD"/"SAR"...
  merchant?: string;
  sourcePkg: string; // bank/wallet app pkg
  confidence: number; // 0..100
  confirmed?: boolean;
}

export interface DailyFinancialSummary {
  day: string;
  netToday: number;
  currency: string;
  events: FinancialEvent[];
  totalIncome: number;
  totalExpense: number;
}

export interface FinancialCorrection {
  eventId: number;
  direction?: 1 | -1;
  amount?: number;
  currency?: string;
  merchant?: string;
}
