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

export type UserRole = 'ADMIN' | 'DEMO';

export interface DashboardContextValue {
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  userId: string | null;
  username: string | null;
  role: UserRole | null;
  isDemo: boolean;
  login: (user: string, pass: string) => Promise<boolean>;
  loginAsDemo: () => Promise<boolean>;
  logout: () => void;
  activeView: 'dashboard' | 'services' | 'analytics' | 'settings';
  notifications: NotificationItem[];
  setActiveView: (view: DashboardContextValue['activeView']) => void;
  markNotificationsRead: () => void;
  processNewLogs: (logs: LogEntry[]) => void;
}

export const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);
