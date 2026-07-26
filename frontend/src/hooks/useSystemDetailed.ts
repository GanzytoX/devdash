import useSWR from 'swr';
import { API_URL, swrFetcher } from '../lib/fetcher';

interface SystemDetailed {
  systemUptime: string;
  cpuModel: string;
  cpuUsage: string;
  ramUsage: string;
  diskUsage: string;
  dbProvider: string;
}

export function useSystemDetailed() {
  const { data, error, isLoading, mutate } = useSWR<SystemDetailed>(
    `${API_URL}/system/detailed`,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  return {
    systemUptime: data?.systemUptime ?? 'Cargando...',
    cpuModel: data?.cpuModel ?? 'Cargando...',
    cpuUsage: data?.cpuUsage ?? 'Cargando...',
    ramUsage: data?.ramUsage ?? 'Cargando...',
    diskUsage: data?.diskUsage ?? 'Cargando...',
    dbProvider: data?.dbProvider ?? 'Cargando...',
    isLoading,
    error,
    mutate,
  };
}
