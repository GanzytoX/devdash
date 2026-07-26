import useSWR from 'swr';
import { API_URL, swrFetcher, requestJson } from '../lib/fetcher';
import type { Service } from '../services/apiService';

export function useServices() {
  const { data, error, isLoading, mutate } = useSWR<Service[]>(
    `${API_URL}/services`,
    swrFetcher,
    { refreshInterval: 10000 }
  );

  const services = data ?? [];

  const addService = async (
    newS: Omit<Service, 'id' | 'latencyHistory' | 'uptimeHistory' | 'lastChecked' | 'status' | 'latency' | 'sslStatus' | 'sslExpiryDays' | 'sslExpiryDate'>
  ) => {
    await requestJson(`${API_URL}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newS),
    });
    mutate();
  };

  const updateService = async (id: string, updatedFields: Partial<Service>) => {
    await requestJson(`${API_URL}/services/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedFields),
    });
    mutate();
  };

  const deleteService = async (id: string) => {
    await requestJson(`${API_URL}/services/${id}`, {
      method: 'DELETE',
    });
    mutate();
  };

  const togglePauseService = async (id: string) => {
    await requestJson(`${API_URL}/services/${id}/toggle`, {
      method: 'POST',
    });
    mutate();
  };

  const triggerManualCheck = async (id: string) => {
    await requestJson(`${API_URL}/services/${id}/check`, {
      method: 'POST',
    });
    mutate();
  };

  return {
    services,
    isLoading,
    error,
    mutate,
    addService,
    updateService,
    deleteService,
    togglePauseService,
    triggerManualCheck,
  };
}
