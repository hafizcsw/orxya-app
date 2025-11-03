// Mock Financial Data (Epic 5 + 6 - will be replaced by Android native later)
import { FinancialEvent, DailyFinancialSummary } from '@/types/financial';
import { PlaceFrequency } from '@/types/location';

const MOCK_PLACES = [
  "Dubai Mall",
  "Marina Mall",
  "City Walk",
  "Mall of the Emirates",
  "Downtown Dubai",
  "Business Bay",
  "JBR",
  "Ibn Battuta Mall",
  "Carrefour City Centre",
  "Starbucks Downtown"
];

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
      confirmed: false,
      placeName: 'Starbucks Downtown',
      locSampleId: 101
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
      confirmed: false,
      placeName: 'Carrefour City Centre',
      locSampleId: 102
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

// Epic 6: Get top places where money was spent today
export function getTopPlacesToday(events: FinancialEvent[]): PlaceFrequency[] {
  const placeMap = new Map<string, number>();
  
  events
    .filter(e => e.direction === -1 && e.placeName) // expenses with location
    .forEach(e => {
      const count = placeMap.get(e.placeName!) || 0;
      placeMap.set(e.placeName!, count + 1);
    });
  
  return Array.from(placeMap.entries())
    .map(([placeName, count]) => ({ placeName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}
