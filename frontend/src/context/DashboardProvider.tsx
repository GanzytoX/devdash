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
  type UserRole,
} from './dashboardContext';
import type { LogEntry } from '../services/apiService';

interface LoginResponse {
  success: boolean;
  user: AuthenticatedUser;
}

interface SessionResponse {
  authenticated: boolean;
  user: AuthenticatedUser;
}

interface AuthenticatedUser {
  id: string;
  username: string;
  role: UserRole;
}

export const DashboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // UI state
  const routeView = window.location.pathname.split('/')[1];
  const initialView = ['dashboard','services','analytics','settings'].includes(routeView) ? routeView as DashboardContextValue['activeView'] : 'dashboard';
  const [activeViewState, setActiveViewState] = useState<DashboardContextValue['activeView']>(initialView);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const isDemo = role === 'DEMO';

  // Track previous log IDs for notification diffing
  const prevLogIdsRef = useRef<Set<string>>(new Set());

  const setActiveView = useCallback((view: DashboardContextValue['activeView']) => {
    const allowedView = role === 'DEMO' && view === 'settings' ? 'dashboard' : view;
    setActiveViewState(allowedView);
    window.history.pushState({}, '', allowedView === 'dashboard' ? '/' : `/${allowedView}`);
  }, [role]);

  const applyAuthenticatedUser = useCallback((user: AuthenticatedUser) => {
    resetLogoutDispatch();
    setUserId(user.id);
    setUsername(user.username);
    setRole(user.role);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    setUserId(null);
    setUsername(null);
    setRole(null);
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
          applyAuthenticatedUser(data.user);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setIsAuthLoading(false);
      });

    return () => {
      active = false;
    };
  }, [applyAuthenticatedUser]);

  useEffect(() => {
    if (role === 'DEMO' && activeViewState === 'settings') {
      setActiveView('dashboard');
    }
  }, [activeViewState, role, setActiveView]);

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
          applyAuthenticatedUser(data.user);
          return true;
        }
      }
      return false;
    } catch (e) {
      console.error('Error executing login:', e);
      return false;
    }
  }, [applyAuthenticatedUser]);

  const loginAsDemo = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/auth/demo`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return false;

      const data = await res.json() as LoginResponse;
      if (!data.success) return false;

      applyAuthenticatedUser(data.user);
      return true;
    } catch (error) {
      console.error('Error entering demo mode:', error);
      return false;
    }
  }, [applyAuthenticatedUser]);

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
        userId,
        username,
        role,
        isDemo,
        login,
        loginAsDemo,
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
