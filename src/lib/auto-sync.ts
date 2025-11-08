import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { track } from '@/lib/telemetry';

interface SyncResult {
  provider: string;
  success: boolean;
  itemsAdded?: number;
  itemsUpdated?: number;
  itemsSkipped?: number;
  error?: string;
}

export class AutoSyncManager {
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;

  async syncAllIntegrations(): Promise<SyncResult[]> {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress, skipping...');
      return [];
    }

    this.isSyncing = true;
    const results: SyncResult[] = [];

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        console.log('❌ No active session, skipping sync');
        this.isSyncing = false;
        return [];
      }

      console.log('🔄 Starting auto-sync for all integrations...');
      track('auto_sync_started');

      // Check which integrations are connected
      const { data: externalAccounts } = await supabase
        .from('external_accounts')
        .select('provider, status')
        .eq('owner_id', session.session.user.id)
        .eq('status', 'connected');

      if (!externalAccounts || externalAccounts.length === 0) {
        console.log('ℹ️ No connected integrations found');
        this.isSyncing = false;
        return [];
      }

      // Sync each connected integration
      for (const account of externalAccounts) {
        try {
          const result = await this.syncProvider(account.provider);
          results.push(result);
        } catch (error: any) {
          results.push({
            provider: account.provider,
            success: false,
            error: error.message || String(error),
          });
        }
      }

      // Show summary notification
      this.showSyncSummary(results);

      // Log sync results
      await this.logSyncResults(results);

      track('auto_sync_completed', { total: results.length, successful: results.filter(r => r.success).length });
    } catch (error: any) {
      console.error('❌ Auto-sync error:', error);
      track('auto_sync_error', { error: error.message });
      toast.error('فشلت المزامنة التلقائية', {
        description: error.message,
      });
    } finally {
      this.isSyncing = false;
    }

    return results;
  }

  private async syncProvider(provider: string): Promise<SyncResult> {
    console.log(`🔄 Syncing ${provider}...`);

    try {
      switch (provider) {
        case 'google': {
          const from = new Date(Date.now() - 7 * 864e5).toISOString();
          const to = new Date(Date.now() + 30 * 864e5).toISOString();
          
          const { data, error } = await supabase.functions.invoke('gcal-sync', {
            body: { from, to },
          });

          if (error) throw error;

          return {
            provider: 'Google Calendar',
            success: true,
            itemsAdded: data?.added || 0,
            itemsUpdated: data?.updated || 0,
            itemsSkipped: data?.skipped || 0,
          };
        }

        // Add more providers here as they're implemented
        default:
          return {
            provider,
            success: false,
            error: 'Provider not yet implemented',
          };
      }
    } catch (error: any) {
      console.error(`❌ ${provider} sync failed:`, error);
      return {
        provider,
        success: false,
        error: error.message || String(error),
      };
    }
  }

  private showSyncSummary(results: SyncResult[]) {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    if (failed.length === 0 && successful.length > 0) {
      const totalItems = successful.reduce((sum, r) => sum + (r.itemsAdded || 0) + (r.itemsUpdated || 0), 0);
      toast.success('✅ تمت المزامنة بنجاح', {
        description: `${successful.length} تطبيق • ${totalItems} عنصر`,
      });
    } else if (failed.length > 0 && successful.length === 0) {
      toast.error('❌ فشلت المزامنة', {
        description: `فشل ${failed.length} تطبيق`,
      });
    } else if (failed.length > 0 && successful.length > 0) {
      toast.warning('⚠️ مزامنة جزئية', {
        description: `نجح ${successful.length} • فشل ${failed.length}`,
      });
    }
  }

  private async logSyncResults(results: SyncResult[]) {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) return;

      for (const result of results) {
        await supabase.from('sync_logs').insert({
          user_id: session.session.user.id,
          provider: result.provider,
          sync_type: 'auto',
          status: result.success ? 'success' : 'error',
          items_added: result.itemsAdded || 0,
          items_updated: result.itemsUpdated || 0,
          items_skipped: result.itemsSkipped || 0,
          error_message: result.error || null,
        });
      }
    } catch (error) {
      console.error('Failed to log sync results:', error);
    }
  }

  startAutoSync() {
    if (this.syncInterval) {
      console.log('⚠️ Auto-sync already running');
      return;
    }

    // Run initial sync after 5 seconds
    setTimeout(() => {
      this.syncAllIntegrations();
    }, 5000);

    // Then sync every hour
    this.syncInterval = setInterval(() => {
      this.syncAllIntegrations();
    }, 60 * 60 * 1000); // 1 hour

    console.log('✅ Auto-sync started (every 60 minutes)');
    track('auto_sync_enabled');
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('⏹️ Auto-sync stopped');
      track('auto_sync_disabled');
    }
  }

  async manualSync(): Promise<SyncResult[]> {
    toast.info('🔄 جاري المزامنة...', {
      description: 'يتم الآن مزامنة جميع التطبيقات',
    });
    return await this.syncAllIntegrations();
  }
}

// Global instance
export const autoSyncManager = new AutoSyncManager();
