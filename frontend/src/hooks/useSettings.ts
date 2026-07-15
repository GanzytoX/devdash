import useSWR from 'swr';
import { API_URL, requestJson, swrFetcher } from '../lib/fetcher';

export interface AppSettings {
  slackConfigured: boolean; discordConfigured: boolean; genericConfigured: boolean;
  publicAppUrl: string; instanceName: string; instanceRegion: string; retentionDays: number;
}

export function useSettings() {
  const swr = useSWR<AppSettings>(`${API_URL}/settings`, swrFetcher);
  const testWebhook = (channel: 'slack' | 'discord' | 'generic') => requestJson<{ success: boolean }>(`${API_URL}/settings/test-webhook/${channel}`, { method: 'POST' });
  return { settings: swr.data, error: swr.error, isLoading: swr.isLoading, testWebhook };
}
