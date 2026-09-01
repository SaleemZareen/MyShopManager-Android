/**
 * Centralized API & Server Configuration
 * 
 * For Public Production Distribution:
 * When you deploy the Cloudflare Worker (`worker/index.ts`),
 * update `PRODUCTION_API_BASE_URL` below with your live public workers.dev URL.
 * 
 * Example:
 * export const PRODUCTION_API_BASE_URL = 'https://my-shop-manager-api.your-subdomain.workers.dev';
 */

// Set this to your public production backend URL when deployed (e.g. Cloudflare Worker URL)
export const PRODUCTION_API_BASE_URL = '';

/**
 * Resolves the appropriate API endpoint URL based on runtime environment.
 */
export function resolveApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // 1. If running as a web app in a browser
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const origin = window.location.origin;
    // Standard web browser environment (not Android asset loader)
    if (!origin.includes('appassets.androidplatform.net') && (origin.startsWith('http://') || origin.startsWith('https://'))) {
      return cleanPath;
    }
  }

  // 2. If running inside the Android APK and a production base URL is configured
  if (PRODUCTION_API_BASE_URL && PRODUCTION_API_BASE_URL.trim().length > 0) {
    return `${PRODUCTION_API_BASE_URL.replace(/\/$/, '')}${cleanPath}`;
  }

  // 3. Default fallback
  return cleanPath;
}
