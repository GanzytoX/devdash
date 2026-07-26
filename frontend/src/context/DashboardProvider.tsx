import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { API_URL } from '../lib/fetcher';
import {
  DashboardContext,
  type DashboardContextValue,
  type NotificationItem,
} from './dashboardContext';
import type { LogEntry } from '../services/apiService';

interface LoginResponse {
  success: boolean;
  token: string;
  user: { username: string };
}

export const DashboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // UI state
  const routeView = window.location.pathname.split('/')[1];
  const initialView = ['dashboard','services','analytics','settings'].includes(routeView) ? routeView as DashboardContextValue['activeView'] : 'dashboard';
  const [activeViewState, setActiveViewState] = useState<DashboardContextValue['activeView']>(initialView);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!sessionStorage.getItem('devdash_token');
  });
  const [username, setUsername] = useState<string | null>(() => {
    return sessionStorage.getItem('devdash_username');
  });

  // Track previous log IDs for notification diffing
  const prevLogIdsRef = useRef<Set<string>>(new Set());

  const setActiveView = useCallback((view: DashboardContextValue['activeView']) => {
    setActiveViewState(view);
    window.history.pushState({}, '', view === 'dashboard' ? '/' : `/${view}`);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('devdash_token');
    sessionStorage.removeItem('devdash_username');
    setUsername(null);
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    window.addEventListener('devdash:logout', logout);
    return () => window.removeEventListener('devdash:logout', logout);
  }, [logout]);

  const login = useCallback(async (user: string, pass: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass }),
      });
      if (res.ok) {
        const data = await res.json() as LoginResponse;
        if (data.success && data.token) {
          sessionStorage.setItem('devdash_token', data.token);
          sessionStorage.setItem('devdash_username', data.user.username);
          setUsername(data.user.username);
          setIsAuthenticated(true);
          return true;
        }
      }
      return false;
    } catch (e) {
      console.error('Error executing login:', e);
      return false;
    }
  }, []);

  const processNewLogs = useCallback((logs: LogEntry[]) => {
    if (prevLogIdsRef.current.size > 0) {
      const newEntries = logs.filter(l => !prevLogIdsRef.current.has(l.id));

      if (newEntries.length > 0) {
        const newNotifications = newEntries
          .filter(l => l.type === 'error' || l.type === 'warn' || l.type === 'success')
          .map<NotificationItem>(l => ({
            id: `notif-${l.id}`,
            title: l.type === 'error'
              ? '🔴 Caída de Servicio'
              : l.type === 'warn'
              ? '⚠️ Alerta de Latencia'
              : '🟢 Servicio Recuperado',
            message: `${l.serviceName ? `[${l.serviceName}] ` : ''}${l.message}`,
            type: l.type,
            read: false,
            timestamp: l.timestamp,
          }));

        if (newNotifications.length > 0) {
          setNotifications(prev => [...newNotifications, ...prev].slice(0, 50));
        }
      }
    }
    prevLogIdsRef.current = new Set(logs.map(l => l.id));
  }, []);

  const markNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  return (
    <DashboardContext.Provider
      value={{
        isAuthenticated,
        username,
        login,
        logout,
        activeView: activeViewState,
        notifications,
        setActiveView,
        markNotificationsRead,
        processNewLogs,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};
