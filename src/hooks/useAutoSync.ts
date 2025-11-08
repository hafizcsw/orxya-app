import { useEffect, useState } from 'react';
import { autoSyncManager } from '@/lib/auto-sync';

export function useAutoSync() {
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Start auto-sync when component mounts
    autoSyncManager.startAutoSync();

    // Cleanup on unmount
    return () => {
      autoSyncManager.stopAutoSync();
    };
  }, []);

  const manualSync = async () => {
    setIsSyncing(true);
    try {
      await autoSyncManager.manualSync();
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isSyncing,
    manualSync,
  };
}
