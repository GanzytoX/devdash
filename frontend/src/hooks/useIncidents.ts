import useSWR from 'swr';
import { API_URL, swrFetcher } from '../lib/fetcher';
import type { Incident } from '../services/apiService';

export function useIncidents(period = '7d') {
  const { data, error, isLoading, mutate } = useSWR<Incident[]>(`${API_URL}/incidents?period=${period}`, swrFetcher, { refreshInterval: 10000 });
  return { incidents: data ?? [], error, isLoading, mutate };
}
