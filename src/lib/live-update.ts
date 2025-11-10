/**
 * Capacitor Live Update System
 * Allows updating web assets without rebuilding native app
 */

import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { addUpdateRecord } from './update-history';
import { showUpdateNotification } from './update-notifications';

// Check if running on native platform
export const isNativePlatform = () => {
  return Capacitor.isNativePlatform();
};

interface UpdateManifest {
  version: string;
  url: string;
  checksum?: string;
  mandatory?: boolean;
}

interface UpdateCheckResult {
  available: boolean;
  version?: string;
  currentVersion?: string;
  manifest?: UpdateManifest;
}

/**
 * Configuration for live updates
 */
export const LIVE_UPDATE_CONFIG = {
  // For development: use your local/staging server
  // For production: use your CDN or production server
  manifestUrl: import.meta.env.VITE_UPDATE_SERVER_URL || 'https://57dc7576-1990-4872-a4c0-f7cfc474f0d0.lovableproject.com/updates/manifest.json',
  enabled: isNativePlatform(),
  checkOnStartup: true,
  checkInterval: 60 * 60 * 1000, // 1 hour
};

/**
 * Check for available updates
 */
export async function checkForUpdates(): Promise<UpdateCheckResult> {
  if (!LIVE_UPDATE_CONFIG.enabled) {
    return { available: false };
  }

  try {
    console.log('[LiveUpdate] Checking for updates from:', LIVE_UPDATE_CONFIG.manifestUrl);
    
    const current = await CapacitorUpdater.current();
    console.log('[LiveUpdate] Current bundle:', current);
    
    // Fetch manifest from server
    const response = await fetch(LIVE_UPDATE_CONFIG.manifestUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch manifest: ${response.status}`);
    }
    
    const manifest: UpdateManifest = await response.json();
    console.log('[LiveUpdate] Latest manifest:', manifest);
    
    // Compare versions
    if (manifest.version !== current.bundle.version) {
      return {
        available: true,
        version: manifest.version,
        currentVersion: current.bundle.version,
        manifest
      };
    }
    
    return { available: false, currentVersion: current.bundle.version };
  } catch (error) {
    console.error('[LiveUpdate] Check failed:', error);
    return { available: false };
  }
}

/**
 * Download and apply update
 */
export async function downloadAndApplyUpdate(
  manifest: UpdateManifest,
  onProgress?: (progress: number) => void
): Promise<boolean> {
  if (!LIVE_UPDATE_CONFIG.enabled) {
    return false;
  }

  try {
    console.log('[LiveUpdate] Downloading update:', manifest.version);
    onProgress?.(10);
    
    // Download the bundle
    const downloadResult = await CapacitorUpdater.download({
      url: manifest.url,
      version: manifest.version,
    });
    
    console.log('[LiveUpdate] Download completed:', downloadResult);
    onProgress?.(60);
    
    // Set as the next active bundle
    await CapacitorUpdater.set({ id: downloadResult.id });
    console.log('[LiveUpdate] Bundle set as next version');
    onProgress?.(90);
    
    // Reload the app to apply the update
    await CapacitorUpdater.reload();
    onProgress?.(100);
    
    return true;
  } catch (error) {
    console.error('[LiveUpdate] Download/Apply failed:', error);
    return false;
  }
}

/**
 * Initialize live update system
 */
export async function initLiveUpdate(
  onUpdateAvailable?: (version: string) => void
) {
  if (!LIVE_UPDATE_CONFIG.enabled) {
    console.log('[LiveUpdate] Disabled (not native platform)');
    return;
  }

  console.log('[LiveUpdate] Initializing...');

  // Check on startup
  if (LIVE_UPDATE_CONFIG.checkOnStartup) {
    const result = await checkForUpdates();
    if (result.available && result.version) {
      // Show notification
      await showUpdateNotification(result.version, 'native');
      onUpdateAvailable?.(result.version);
    }
  }

  // Setup periodic checks
  setInterval(async () => {
    const result = await checkForUpdates();
    if (result.available && result.version) {
      // Show notification
      await showUpdateNotification(result.version, 'native');
      onUpdateAvailable?.(result.version);
    }
  }, LIVE_UPDATE_CONFIG.checkInterval);
}

/**
 * Get current installed version
 */
export async function getCurrentVersion(): Promise<string> {
  if (!LIVE_UPDATE_CONFIG.enabled) {
    return 'web';
  }

  try {
    const current = await CapacitorUpdater.current();
    return current.bundle.version || 'builtin';
  } catch (error) {
    console.error('[LiveUpdate] Get version failed:', error);
    return 'unknown';
  }
}
