export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const dispatchLogout = () => {
  window.dispatchEvent(new CustomEvent('devdash:logout'));
};

export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
  });

  if (res.status === 401) {
    dispatchLogout();
    throw new Error('La sesión venció.');
  }

  return res;
};

export const requestJson = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const res = await fetchWithAuth(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `La solicitud falló con el estado ${res.status}`);
  return data as T;
};

export const swrFetcher = async (url: string) => {
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    throw new Error(`La solicitud falló con el estado ${res.status}`);
  }
  return res.json();
};
