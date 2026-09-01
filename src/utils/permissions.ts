export type PermissionState = 'GRANTED' | 'DENIED' | 'BLOCKED';

export interface NativePermissionBridge {
  checkPermissionStatus: (name: string) => string;
  requestAndroidPermission: (name: string) => void;
  requestAllPermissionsBulk?: () => void;
  openAppSettings: () => void;
}

export function getAndroidBridge(): NativePermissionBridge | null {
  if (typeof window !== 'undefined' && (window as any).AndroidPermissionBridge) {
    return (window as any).AndroidPermissionBridge;
  }
  return null;
}

/**
 * Check permission status natively or using browser fallback
 */
export async function checkAndroidPermission(name: string): Promise<PermissionState> {
  const bridge = getAndroidBridge();
  if (bridge) {
    try {
      const status = bridge.checkPermissionStatus(name);
      return status as PermissionState;
    } catch (err) {
      console.warn('Native checkPermissionStatus failed, using fallback:', err);
    }
  }

  // Web fallback
  if (typeof navigator === 'undefined') {
    return 'GRANTED';
  }

  // Persistent storage and mic/camera fallback heuristics
  if (name === 'storage') {
    if (navigator.storage && navigator.storage.persisted) {
      const persisted = await navigator.storage.persisted();
      return persisted ? 'GRANTED' : 'GRANTED'; // Treat as granted for web
    }
    return 'GRANTED';
  }

  try {
    const permissionMap: Record<string, PermissionName> = {
      location: 'geolocation' as PermissionName,
      notifications: 'notifications' as PermissionName,
      camera: 'camera' as PermissionName,
      microphone: 'microphone' as PermissionName,
    };

    const queryName = permissionMap[name];
    if (!queryName) return 'GRANTED';

    const status = await navigator.permissions.query({ name: queryName });
    if (status.state === 'granted') return 'GRANTED';
    if (status.state === 'denied') return 'BLOCKED';
    return 'DENIED';
  } catch (err) {
    console.warn('Browser permission query failed:', err);
    
    // Fallback heuristic check if permission query is blocked or unsupported
    if (name === 'camera' || name === 'microphone') {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasLabels = devices.some(d => !!d.label);
        return hasLabels ? 'GRANTED' : 'DENIED';
      } catch {
        return 'DENIED';
      }
    }
    return 'DENIED';
  }
}

/**
 * Request permission natively or using browser fallback
 */
export async function requestAndroidPermission(name: string): Promise<PermissionState> {
  const bridge = getAndroidBridge();
  if (bridge) {
    return new Promise((resolve) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.warn(`Permission request for ${name} timed out natively after 5s.`);
          resolve('DENIED');
        }
      }, 5000); // 5 seconds timeout fallback

      // Setup global callbacks that the native code triggers
      (window as any).onAndroidPermissionResult = (permissionName: string, status: string) => {
        if (permissionName.toLowerCase() === name.toLowerCase()) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve(status as PermissionState);
          }
        }
      };

      // Trigger native dialogue
      try {
        bridge.requestAndroidPermission(name);
      } catch (err) {
        console.error('Failed to trigger native request:', err);
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve('DENIED');
        }
      }
    });
  }

  // Web fallback request
  try {
    if (name === 'camera') {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      return 'GRANTED';
    }
    if (name === 'microphone') {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      return 'GRANTED';
    }
    if (name === 'location') {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve('GRANTED'),
          () => resolve('DENIED'),
          { timeout: 3500 }
        );
      });
    }
    if (name === 'notifications') {
      if ('Notification' in window) {
        const result = await Notification.requestPermission();
        return result === 'granted' ? 'GRANTED' : 'DENIED';
      }
      return 'GRANTED';
    }
    if (name === 'storage') {
      if (navigator.storage && navigator.storage.persist) {
        await navigator.storage.persist();
      }
      return 'GRANTED';
    }
  } catch (err) {
    console.warn('Browser media request failed:', err);
    return 'DENIED';
  }

  return 'GRANTED';
}

/**
 * Open App settings natively
 */
export function openAppSettings() {
  const bridge = getAndroidBridge();
  if (bridge) {
    try {
      bridge.openAppSettings();
    } catch (err) {
      console.error('Failed to open app settings via bridge:', err);
    }
  } else {
    console.warn('Native settings bridge not available in browser mode.');
  }
}

/**
 * Trigger native bulk permission request
 */
export async function requestAndroidPermissionsBulk(): Promise<void> {
  const bridge = getAndroidBridge();
  if (bridge && typeof bridge.requestAllPermissionsBulk === 'function') {
    return new Promise((resolve) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.warn('Bulk permissions request timed out natively after 20s.');
          resolve();
        }
      }, 20000); // 20s maximum wait for bulk interaction

      (window as any).onAndroidPermissionResult = (permissionName: string, status: string) => {
        if (permissionName.toLowerCase() === 'bulk') {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve();
          }
        }
      };

      try {
        if (bridge.requestAllPermissionsBulk) {
          bridge.requestAllPermissionsBulk();
        } else {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve();
          }
        }
      } catch (err) {
        console.error('Failed to trigger bulk native request:', err);
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve();
        }
      }
    });
  }
}
