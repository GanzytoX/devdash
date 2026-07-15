import useSWR from 'swr';
import { API_URL, swrFetcher, fetchWithAuth } from '../lib/fetcher';
import type { LogEntry } from '../services/apiService';

export function useLogs() {
  const { data, error, isLoading, mutate } = useSWR<LogEntry[]>(
    `${API_URL}/logs`,
    swrFetcher,
    { refreshInterval: 10000 }
  );

  const logs = data ?? [];

  const clearLogs = async () => {
    await fetchWithAuth(`${API_URL}/logs`, {
      method: 'DELETE',
    });
    mutate();
  };

  return {
    logs,
    isLoading,
    error,
    mutate,
    clearLogs,
  };
}
