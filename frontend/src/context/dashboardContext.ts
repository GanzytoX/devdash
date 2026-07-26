import { createContext } from 'react';
import type { LogEntry } from '../services/apiService';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error';
  read: boolean;
  timestamp: string;
}

export interface DashboardContextValue {
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  username: string | null;
  login: (user: string, pass: string) => Promise<boolean>;
  logout: () => void;
  activeView: 'dashboard' | 'services' | 'analytics' | 'settings';
  notifications: NotificationItem[];
  setActiveView: (view: DashboardContextValue['activeView']) => void;
  markNotificationsRead: () => void;
  processNewLogs: (logs: LogEntry[]) => void;
}

export const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);
