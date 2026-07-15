// Centralized authenticated fetch wrapper and SWR fetcher for DevDash

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Get the current JWT token from session storage
const getToken = (): string | null => sessionStorage.getItem('devdash_token');

// Dispatch a custom event to notify the auth context of forced logout
const dispatchLogout = () => {
  window.dispatchEvent(new CustomEvent('devdash:logout'));
};

/**
 * Authenticated fetch wrapper.
 * Injects Authorization header and triggers logout on 401/403.
 */
export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 || res.status === 403) {
    dispatchLogout();
    throw new Error('La sesión venció o no tienes acceso.');
  }

  return res;
};

export const requestJson = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const res = await fetchWithAuth(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `La solicitud falló con el estado ${res.status}`);
  return data as T;
};

/**
 * SWR-compatible fetcher that uses authenticated fetch.
 * Resolves to parsed JSON or throws on error.
 */
export const swrFetcher = async (url: string) => {
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    throw new Error(`La solicitud falló con el estado ${res.status}`);
  }
  return res.json();
};
