import { AppState } from '../types';
import { loadAppState, saveAppState } from '../utils/format';

export type SyncInterval =
  | 'OFF'
  | '3_MIN'
  | '5_MIN'
  | '10_MIN'
  | '15_MIN'
  | '30_MIN'
  | '1_HOUR'
  | '6_HOURS'
  | '12_HOURS'
  | '24_HOURS';

export type SyncDestination = 'DRIVE' | 'LOCAL' | 'BOTH';

export interface BackupEnvelope {
  format: 'MY_SHOP_MANAGER_BACKUP';
  formatVersion: 1;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  appVersion: string;
  deviceInfo?: string;
  checksum: string;
  summary: {
    shopName: string;
    ownerName?: string;
    transactionCount: number;
    inventoryCount: number;
    customerCount: number;
    supplierCount: number;
    bankAccountCount: number;
    totalAssetsCount: number;
  };
  data: AppState;
}

export interface GoogleDriveAccount {
  email: string;
  name: string;
  photoUrl?: string;
  connectedAt?: string;
  accessToken?: string;
}

export interface SyncConfig {
  autoSync: boolean;
  interval: SyncInterval;
  destination: SyncDestination;
  lastSyncTime?: string;
  lastSyncStatus?: 'SUCCESS' | 'ERROR' | 'IDLE' | 'SYNCING';
  lastSyncMessage?: string;
  lastDriveBackupTime?: string;
  lastLocalBackupTime?: string;
  selectedLocalFolder?: string;
  connectedGoogleAccount?: GoogleDriveAccount | null;
  customClientId?: string;
}

export interface ConflictDetails {
  localDate: string;
  localTransactions: number;
  localInventory: number;
  localCustomers: number;
  remoteDate: string;
  remoteTransactions: number;
  remoteInventory: number;
  remoteCustomers: number;
  remoteShopName: string;
  remoteEnvelope: BackupEnvelope;
}

const CONFIG_STORAGE_KEY = 'myshopmanager_sync_config_v1';

declare global {
  interface Window {
    AndroidBackup?: {
      connectGoogleAccount: () => void;
      openExternalUrl: (url: string) => void;
      getAppSigningInfo: () => string;
      disconnectGoogleAccount: () => void;
      getConnectedGoogleAccount: () => string;
      selectLocalBackupFolder: () => void;
      pickAndRestoreLocalBackup: () => void;
      updateCurrentAppState: (json: string) => void;
      saveLocalBackup: (backupJson: string, fileName: string) => void;
      uploadToGoogleDrive: (backupJson: string) => void;
      downloadFromGoogleDrive: () => void;
      scheduleBackgroundSync: (intervalMinutes: number, destination: string) => void;
      getSyncConfig: () => string;
    };
    onNativeDriveAuthSuccess?: (email: string, name: string, photoUrl: string) => void;
    onNativeDriveAuthFailure?: (statusCode: number, message: string) => void;
    onNativeDriveDisconnected?: () => void;
    onNativeFolderSelected?: (displayPath: string, uriString: string) => void;
    onNativeDriveBackupResult?: (success: boolean, timestampOrMsg: string, fileId?: string | null) => void;
    onNativeDriveRestoreResult?: (success: boolean, errorOrMsg: string, modTime?: string | null) => void;
    onNativeDriveRestoreResultBase64?: (success: boolean, base64Content: string, modTime: string) => void;
    onNativeLocalBackupResult?: (success: boolean, pathOrMsg: string, timestamp?: string) => void;
    onNativeLocalRestoreResult?: (success: boolean, errorOrMsg: string) => void;
    onNativeLocalRestoreBase64?: (success: boolean, base64Content: string, fileName: string) => void;
    google?: any;
  }
}

export function intervalToMinutes(interval: SyncInterval): number {
  switch (interval) {
    case '3_MIN':
      return 3;
    case '5_MIN':
      return 5;
    case '10_MIN':
      return 10;
    case '15_MIN':
      return 15;
    case '30_MIN':
      return 30;
    case '1_HOUR':
      return 60;
    case '6_HOURS':
      return 360;
    case '12_HOURS':
      return 720;
    case '24_HOURS':
      return 1440;
    case 'OFF':
    default:
      return 0;
  }
}

export function generateSimpleChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function createBackupEnvelope(state: AppState): BackupEnvelope {
  const now = new Date().toISOString();
  const rawDataString = JSON.stringify(state);
  const checksum = generateSimpleChecksum(rawDataString);

  return {
    format: 'MY_SHOP_MANAGER_BACKUP',
    formatVersion: 1,
    schemaVersion: 2,
    createdAt: now,
    updatedAt: now,
    appVersion: '1.0.0',
    deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    checksum,
    summary: {
      shopName: state.profile?.shopName || 'My Shop',
      ownerName: state.profile?.ownerName || '',
      transactionCount: state.transactions?.length || 0,
      inventoryCount: state.inventory?.length || 0,
      customerCount: state.customers?.length || 0,
      supplierCount: state.suppliers?.length || 0,
      bankAccountCount: state.bankAccounts?.length || 0,
      totalAssetsCount: (state.businessAssets?.length || 0) + (state.personalAssets?.length || 0),
    },
    data: state,
  };
}

export function validateAndExtractBackup(rawJson: string | object): { valid: boolean; error?: string; envelope?: BackupEnvelope } {
  try {
    const obj = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;

    // Check if it's already a BackupEnvelope
    if (obj && obj.format === 'MY_SHOP_MANAGER_BACKUP' && obj.data) {
      if (!obj.data.profile || !Array.isArray(obj.data.transactions)) {
        return { valid: false, error: 'Invalid internal data structure inside backup file.' };
      }
      return { valid: true, envelope: obj as BackupEnvelope };
    }

    // Check if it's a legacy raw AppState JSON
    if (obj && obj.profile && Array.isArray(obj.transactions)) {
      const envelope = createBackupEnvelope(obj as AppState);
      return { valid: true, envelope };
    }

    return { valid: false, error: 'The file does not contain a valid My Shop Manager backup structure.' };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Failed to parse backup JSON.' };
  }
}

export const DEFAULT_GOOGLE_CLIENT_ID = '679126609964-9846qvs4at25fljderim4d2uqg6sbuc9.apps.googleusercontent.com';

export function loadSyncConfig(): SyncConfig {
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    const defaults: SyncConfig = {
      autoSync: false,
      interval: 'OFF',
      destination: 'DRIVE',
      lastSyncStatus: 'IDLE',
      selectedLocalFolder: '',
      connectedGoogleAccount: null,
      customClientId: DEFAULT_GOOGLE_CLIENT_ID,
    };

    if (!stored) return defaults;
    const parsed = JSON.parse(stored);
    
    // If the saved customClientId is the old deleted client ID or empty, reset to current valid client ID
    if (!parsed.customClientId || parsed.customClientId.includes('4e57qeismdcn45jeihhpfanbhtm9qdrn')) {
      parsed.customClientId = DEFAULT_GOOGLE_CLIENT_ID;
    }
    
    return { ...defaults, ...parsed };
  } catch {
    return {
      autoSync: false,
      interval: 'OFF',
      destination: 'DRIVE',
      lastSyncStatus: 'IDLE',
      selectedLocalFolder: '',
      connectedGoogleAccount: null,
      customClientId: DEFAULT_GOOGLE_CLIENT_ID,
    };
  }
}

export function saveSyncConfig(config: SyncConfig): void {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));

    // Also update native Android background sync scheduling if available
    if (window.AndroidBackup) {
      const intervalMin = config.autoSync ? intervalToMinutes(config.interval) : 0;
      window.AndroidBackup.scheduleBackgroundSync(intervalMin, config.destination);
    }
  } catch (e) {
    console.error('Failed to save sync config:', e);
  }
}

export function syncStateToAndroidNative(state: AppState): void {
  if (window.AndroidBackup) {
    try {
      const envelope = createBackupEnvelope(state);
      window.AndroidBackup.updateCurrentAppState(JSON.stringify(envelope));
    } catch (e) {
      console.warn('Failed to update native snapshot:', e);
    }
  }
}
