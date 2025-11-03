// Mock Financial Data (Epic 5 - will be replaced by Android native later)
import { FinancialEvent, DailyFinancialSummary } from '@/types/financial';

export function generateMockFinancialEvents(day: string): FinancialEvent[] {
  return [
    {
      id: 1,
      day,
      whenMs: Date.now() - 3600000,
      direction: -1,
      amount: 45.50,
      currency: 'AED',
      merchant: 'Starbucks',
      sourcePkg: 'com.enbd.mobilebanking',
      confidence: 85,
      confirmed: false
    },
    {
      id: 2,
      day,
      whenMs: Date.now() - 7200000,
      direction: -1,
      amount: 120.00,
      currency: 'AED',
      merchant: 'Carrefour',
      sourcePkg: 'com.dib.mobile',
      confidence: 90,
      confirmed: false
    },
    {
      id: 3,
      day,
      whenMs: Date.now() - 10800000,
      direction: 1,
      amount: 500.00,
      currency: 'AED',
      merchant: 'Salary Deposit',
      sourcePkg: 'com.adcb.banking',
      confidence: 95,
      confirmed: false
    }
  ];
}

export function calculateDailySummary(events: FinancialEvent[]): DailyFinancialSummary {
  const totalIncome = events
    .filter(e => e.direction === 1)
    .reduce((sum, e) => sum + e.amount, 0);
  
  const totalExpense = events
    .filter(e => e.direction === -1)
    .reduce((sum, e) => sum + e.amount, 0);
  
  const netToday = totalIncome - totalExpense;
  
  return {
    day: events[0]?.day || new Date().toISOString().split('T')[0],
    netToday,
    currency: events[0]?.currency || 'AED',
    events,
    totalIncome,
    totalExpense
  };
}

export function mockNetToday(): number {
  const events = generateMockFinancialEvents(new Date().toISOString().split('T')[0]);
  const summary = calculateDailySummary(events);
  return summary.netToday;
}
