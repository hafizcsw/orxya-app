// Health calculations inspired by WHOOP metrics

export interface HealthData {
  steps: number;
  meters: number;
  hrAvg: number;
  hrMax: number;
  sleepMinutes: number;
}

export interface HealthMetrics {
  recovery: number;
  strain: number;
  sleep: number;
  activity: number;
}

export interface TrendData {
  direction: 'up' | 'down' | 'neutral';
  percentage: number;
}

/**
 * Calculate Recovery Score (0-100)
 * Based on sleep quality and HRV simulation
 */
export function calculateRecovery(
  sleepMinutes: number,
  hrAvg: number
): number {
  const sleepScore = calculateSleepScore(sleepMinutes);
  
  // Simulate HRV score based on resting heart rate
  // Lower resting HR typically indicates better recovery
  const hrvScore = Math.max(0, Math.min(100, 100 - (hrAvg - 40) * 1.5));
  
  // Recovery = 60% sleep + 40% HRV
  const recovery = (sleepScore * 0.6) + (hrvScore * 0.4);
  
  return Math.round(Math.max(0, Math.min(100, recovery)));
}

/**
 * Calculate Strain Score (0-21, similar to WHOOP)
 * Based on cardiovascular load throughout the day
 */
export function calculateStrain(
  hrAvg: number,
  hrMax: number,
  steps: number,
  meters: number
): number {
  // Estimate max heart rate (220 - age assumption of 30)
  const estimatedMaxHR = 190;
  
  // Calculate heart rate intensity
  const hrIntensity = ((hrAvg - 60) / (estimatedMaxHR - 60)) * 10;
  
  // Calculate activity intensity based on steps and distance
  const activityIntensity = Math.min(10, (steps / 10000) * 5 + (meters / 5000) * 5);
  
  // Peak intensity from max HR
  const peakIntensity = ((hrMax - 60) / (estimatedMaxHR - 60)) * 5;
  
  const strain = hrIntensity + activityIntensity + peakIntensity;
  
  return Math.round(Math.max(0, Math.min(21, strain)));
}

/**
 * Calculate Sleep Score (0-100)
 * Based on sleep duration with optimal target of 8 hours
 */
export function calculateSleepScore(sleepMinutes: number): number {
  const optimalSleep = 480; // 8 hours
  const minimumSleep = 240; // 4 hours
  const maximumSleep = 600; // 10 hours
  
  if (sleepMinutes >= optimalSleep && sleepMinutes <= maximumSleep) {
    return 100;
  }
  
  if (sleepMinutes < optimalSleep) {
    // Linear scale from minimum to optimal
    const score = ((sleepMinutes - minimumSleep) / (optimalSleep - minimumSleep)) * 100;
    return Math.round(Math.max(0, Math.min(100, score)));
  }
  
  // Slight penalty for oversleeping
  const score = 100 - ((sleepMinutes - maximumSleep) / 60) * 5;
  return Math.round(Math.max(70, Math.min(100, score)));
}

/**
 * Calculate Activity Score (0-100)
 * Based on steps and distance covered
 */
export function calculateActivityScore(steps: number, meters: number): number {
  const stepsTarget = 10000;
  const metersTarget = 8000; // ~8km
  
  const stepsScore = (steps / stepsTarget) * 50;
  const metersScore = (meters / metersTarget) * 50;
  
  const activity = stepsScore + metersScore;
  
  return Math.round(Math.max(0, Math.min(100, activity)));
}

/**
 * Get Recovery Status based on score
 */
export function getRecoveryStatus(recovery: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (recovery >= 80) return 'excellent';
  if (recovery >= 60) return 'good';
  if (recovery >= 40) return 'fair';
  return 'poor';
}

/**
 * Get Sleep Status based on score
 */
export function getSleepStatus(sleepScore: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (sleepScore >= 85) return 'excellent';
  if (sleepScore >= 70) return 'good';
  if (sleepScore >= 50) return 'fair';
  return 'poor';
}

/**
 * Get Strain Status based on score
 */
export function getStrainStatus(strain: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (strain >= 15) return 'excellent'; // High strain = good workout
  if (strain >= 10) return 'good';
  if (strain >= 5) return 'fair';
  return 'poor';
}

/**
 * Get Activity Status based on score
 */
export function getActivityStatus(activity: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (activity >= 80) return 'excellent';
  if (activity >= 60) return 'good';
  if (activity >= 40) return 'fair';
  return 'poor';
}

/**
 * Calculate trend comparing current to previous value
 */
export function calculateTrend(current: number, previous: number): TrendData {
  if (!previous || previous === 0) {
    return { direction: 'neutral', percentage: 0 };
  }
  
  const change = current - previous;
  const percentage = Math.round((Math.abs(change) / previous) * 100);
  
  if (Math.abs(change) < 0.01) {
    return { direction: 'neutral', percentage: 0 };
  }
  
  return {
    direction: change > 0 ? 'up' : 'down',
    percentage
  };
}

/**
 * Format sleep time to readable string
 */
export function formatSleepTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Format distance in meters to km with 1 decimal
 */
export function formatDistance(meters: number): string {
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
}
