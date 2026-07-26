import useSWR from 'swr';
import { API_URL, swrFetcher } from '../lib/fetcher';

interface SystemStats {
  vpsUptime: string;
  serverStatus: string;
}

export function useSystemStats() {
  const { data, error, isLoading } = useSWR<SystemStats>(
    `${API_URL}/system/stats`,
    swrFetcher,
    { refreshInterval: 15000 }
  );

  return {
    vpsUptime: data?.vpsUptime ?? '0d 0h 0m',
    serverStatus: data?.serverStatus ?? 'offline',
    isLoading,
    error,
  };
}
