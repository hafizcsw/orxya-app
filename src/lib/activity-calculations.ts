/**
 * Activity and Financial Calculations
 * Helper functions to calculate status based on goals
 */

export type ActivityStatus = 'excellent' | 'good' | 'fair' | 'poor';

/**
 * Calculate work hours status based on target
 * - Excellent: 90%+ of target
 * - Good: 70-90% of target
 * - Fair: 50-70% of target
 * - Poor: < 50% of target
 */
export function getWorkStatus(hours: number, target: number): ActivityStatus {
  if (target === 0) return 'fair';
  const percentage = (hours / target) * 100;
  
  if (percentage >= 90) return 'excellent';
  if (percentage >= 70) return 'good';
  if (percentage >= 50) return 'fair';
  return 'poor';
}

/**
 * Calculate study hours status based on target
 */
export function getStudyStatus(hours: number, target: number): ActivityStatus {
  if (target === 0) return 'fair';
  const percentage = (hours / target) * 100;
  
  if (percentage >= 90) return 'excellent';
  if (percentage >= 70) return 'good';
  if (percentage >= 50) return 'fair';
  return 'poor';
}

/**
 * Calculate sports/MMA hours status based on target
 */
export function getSportsStatus(hours: number, target: number): ActivityStatus {
  if (target === 0) return 'fair';
  const percentage = (hours / target) * 100;
  
  if (percentage >= 90) return 'excellent';
  if (percentage >= 70) return 'good';
  if (percentage >= 50) return 'fair';
  return 'poor';
}

/**
 * Calculate walking status based on target (in km)
 */
export function getWalkStatus(km: number, target: number): ActivityStatus {
  if (target === 0) return 'fair';
  const percentage = (km / target) * 100;
  
  if (percentage >= 90) return 'excellent';
  if (percentage >= 70) return 'good';
  if (percentage >= 50) return 'fair';
  return 'poor';
}

/**
 * Calculate income status based on target
 */
export function getIncomeStatus(income: number, target: number): ActivityStatus {
  if (target === 0) return 'fair';
  const percentage = (income / target) * 100;
  
  if (percentage >= 90) return 'excellent';
  if (percentage >= 70) return 'good';
  if (percentage >= 50) return 'fair';
  return 'poor';
}

/**
 * Calculate expenses status based on target
 * Note: For expenses, LOWER is better (inverse logic)
 * - Excellent: < 70% of target (under budget)
 * - Good: 70-90% of target
 * - Fair: 90-110% of target
 * - Poor: > 110% of target (over budget)
 */
export function getExpensesStatus(expenses: number, target: number): ActivityStatus {
  if (target === 0) return 'fair';
  const percentage = (expenses / target) * 100;
  
  if (percentage < 70) return 'excellent';
  if (percentage < 90) return 'good';
  if (percentage < 110) return 'fair';
  return 'poor';
}

/**
 * Calculate balance status
 * - Excellent: Balance > 1000
 * - Good: Balance 500-1000
 * - Fair: Balance 0-500
 * - Poor: Balance < 0 (negative)
 */
export function getBalanceStatus(balance: number): ActivityStatus {
  if (balance >= 1000) return 'excellent';
  if (balance >= 500) return 'good';
  if (balance >= 0) return 'fair';
  return 'poor';
}
