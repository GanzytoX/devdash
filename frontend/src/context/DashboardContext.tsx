import React, { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import type { LogEntry } from '../services/apiService';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error';
  read: boolean;
  timestamp: string;
}

interface DashboardContextType {
  // Authentication
  isAuthenticated: boolean;
  token: string | null;
  username: string | null;
  login: (user: string, pass: string) => Promise<boolean>;
  logout: () => void;

  // UI State
  activeView: 'dashboard' | 'services' | 'analytics' | 'settings';
  notifications: NotificationItem[];
  setActiveView: (view: 'dashboard' | 'services' | 'analytics' | 'settings') => void;
  markNotificationsRead: () => void;
  processNewLogs: (logs: LogEntry[]) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const DashboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // UI state
  const routeView = window.location.pathname.split('/')[1];
  const initialView = ['dashboard','services','analytics','settings'].includes(routeView) ? routeView as DashboardContextType['activeView'] : 'dashboard';
  const [activeViewState, setActiveViewState] = useState<DashboardContextType['activeView']>(initialView);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!sessionStorage.getItem('devdash_token');
  });
  const [token, setToken] = useState<string | null>(() => {
    return sessionStorage.getItem('devdash_token');
  });
  const [username, setUsername] = useState<string | null>(() => {
    return sessionStorage.getItem('devdash_username');
  });

  // Track previous log IDs for notification diffing
  const prevLogIdsRef = useRef<Set<string>>(new Set());

  const setActiveView = (view: DashboardContextType['activeView']) => {
    setActiveViewState(view);
    window.history.pushState({}, '', view === 'dashboard' ? '/' : `/${view}`);
  };
  // Listen for forced logout events from the fetcher
  useEffect(() => {
    const handleLogout = () => logout();
    window.addEventListener('devdash:logout', handleLogout);
    return () => window.removeEventListener('devdash:logout', handleLogout);
  }, []);

  const logout = () => {
    sessionStorage.removeItem('devdash_token');
    sessionStorage.removeItem('devdash_username');
    setToken(null);
    setUsername(null);
    setIsAuthenticated(false);
  };

  const login = async (user: string, pass: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.token) {
          sessionStorage.setItem('devdash_token', data.token);
          sessionStorage.setItem('devdash_username', data.user.username);
          setToken(data.token);
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
  };

  // Process incoming logs from SWR to generate notifications
  const processNewLogs = (logs: LogEntry[]) => {
    if (prevLogIdsRef.current.size > 0) {
      const newEntries = logs.filter(l => !prevLogIdsRef.current.has(l.id));

      if (newEntries.length > 0) {
        const newNotifications = newEntries
          .filter(l => l.type === 'error' || l.type === 'warn' || l.type === 'success')
          .map(l => ({
            id: `notif-${l.id}`,
            title: l.type === 'error'
              ? '🔴 Caída de Servicio'
              : l.type === 'warn'
              ? '⚠️ Alerta de Latencia'
              : '🟢 Servicio Recuperado',
            message: `${l.serviceName ? `[${l.serviceName}] ` : ''}${l.message}`,
            type: l.type as NotificationItem['type'],
            read: false,
            timestamp: l.timestamp,
          }));

        if (newNotifications.length > 0) {
          setNotifications(prev => [...newNotifications, ...prev].slice(0, 50));
        }
      }
    }
    prevLogIdsRef.current = new Set(logs.map(l => l.id));
  };

  const markNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <DashboardContext.Provider
      value={{
        isAuthenticated,
        token,
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

// oxlint-disable-next-line react/only-export-components
export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
