import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { API_URL, resetLogoutDispatch } from '../lib/fetcher';
import {
  DashboardContext,
  type DashboardContextValue,
  type NotificationItem,
} from './dashboardContext';
import type { LogEntry } from '../services/apiService';

interface LoginResponse {
  success: boolean;
  user: { username: string };
}

interface SessionResponse {
  authenticated: boolean;
  user: { username: string };
}

export const DashboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // UI state
  const routeView = window.location.pathname.split('/')[1];
  const initialView = ['dashboard','services','analytics','settings'].includes(routeView) ? routeView as DashboardContextValue['activeView'] : 'dashboard';
  const [activeViewState, setActiveViewState] = useState<DashboardContextValue['activeView']>(initialView);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  // Track previous log IDs for notification diffing
  const prevLogIdsRef = useRef<Set<string>>(new Set());

  const setActiveView = useCallback((view: DashboardContextValue['activeView']) => {
    setActiveViewState(view);
    window.history.pushState({}, '', view === 'dashboard' ? '/' : `/${view}`);
  }, []);

  const logout = useCallback(() => {
    setUsername(null);
    setIsAuthenticated(false);
    void fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    window.addEventListener('devdash:logout', logout);
    return () => window.removeEventListener('devdash:logout', logout);
  }, [logout]);

  useEffect(() => {
    let active = true;

    fetch(`${API_URL}/auth/session`, { credentials: 'include' })
      .then(async response => {
        if (!response.ok) return;
        const data = await response.json() as SessionResponse;
        if (active && data.authenticated) {
          resetLogoutDispatch();
          setUsername(data.user.username);
          setIsAuthenticated(true);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setIsAuthLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (user: string, pass: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass }),
      });
      if (res.ok) {
        const data = await res.json() as LoginResponse;
        if (data.success) {
          resetLogoutDispatch();
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
        isAuthLoading,
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
