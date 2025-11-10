/**
 * Update History Management
 * Tracks all app updates for display in settings
 */

export interface UpdateRecord {
  id: string;
  version: string;
  timestamp: number;
  type: 'pwa' | 'native';
  status: 'success' | 'failed';
  previousVersion?: string;
}

const STORAGE_KEY = 'app_update_history';
const MAX_RECORDS = 50;

/**
 * Get all update records
 */
export function getUpdateHistory(): UpdateRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[UpdateHistory] Failed to load:', error);
    return [];
  }
}

/**
 * Add a new update record
 */
export function addUpdateRecord(record: Omit<UpdateRecord, 'id' | 'timestamp'>): void {
  try {
    const history = getUpdateHistory();
    
    const newRecord: UpdateRecord = {
      ...record,
      id: `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    
    // Add to beginning and limit size
    history.unshift(newRecord);
    const trimmed = history.slice(0, MAX_RECORDS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    console.log('[UpdateHistory] Added record:', newRecord);
  } catch (error) {
    console.error('[UpdateHistory] Failed to add record:', error);
  }
}

/**
 * Clear all update history
 */
export function clearUpdateHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[UpdateHistory] Cleared all records');
  } catch (error) {
    console.error('[UpdateHistory] Failed to clear:', error);
  }
}

/**
 * Get statistics about updates
 */
export function getUpdateStats() {
  const history = getUpdateHistory();
  
  return {
    total: history.length,
    successful: history.filter(r => r.status === 'success').length,
    failed: history.filter(r => r.status === 'failed').length,
    pwa: history.filter(r => r.type === 'pwa').length,
    native: history.filter(r => r.type === 'native').length,
    lastUpdate: history[0]?.timestamp,
  };
}
