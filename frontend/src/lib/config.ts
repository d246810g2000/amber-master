/// <reference types="vite/client" />

/**
 * Global Configuration for the Frontend.
 * Centralizing environment variables for consistency across the application.
 */
export const GAS_URL = import.meta.env.VITE_GAS_URL;
export const API_URL = String(import.meta.env.VITE_API_URL || '');

// Handle WebSocket URL: if relative, derive from window.location
export const WS_URL = (() => {
  if (API_URL.startsWith('http')) {
    return API_URL.replace(/^http/, 'ws') + '/ws';
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  // Ensure relative path starts with / and ends without / for concatenation
  const cleanPath = API_URL.startsWith('/') ? API_URL : `/${API_URL}`;
  return `${protocol}//${host}${cleanPath === '/' ? '' : cleanPath}/ws`;
})();

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
