import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import alertExamples from '@/lib/alertExamples';

export interface GlobalAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  affectedSymbols: string[];
  timestamp: string;
  impact: 'high' | 'medium' | 'low';
  category: string;
  read: boolean;
  // Optional field for news source URL
  sourceUrl?: string;
}

interface GlobalAlertsContextType {
  alerts: GlobalAlert[];
  addAlert: (alert: GlobalAlert) => void;
  dismissAlert: (alertId: string) => void;
  markAsRead: (alertId: string) => void;
  markAllAsRead: () => void;
  clearAllAlerts: () => void;
  unreadCount: number;
  highImpactUnreadCount: number;
}

const GlobalAlertsContext = createContext<GlobalAlertsContextType | undefined>(undefined);

export function GlobalAlertsProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<GlobalAlert[]>(() => {
    try {
      const savedAlerts = localStorage.getItem('globalMarketAlerts');
      return savedAlerts ? JSON.parse(savedAlerts) : [];
    } catch (error) {
      console.error('Failed to load alerts from localStorage:', error);
      return [];
    }
  });

  // Persist alerts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('globalMarketAlerts', JSON.stringify(alerts));
    } catch (error) {
      console.error('Failed to save alerts to localStorage:', error);
    }
  }, [alerts]);

  // Seed with example alerts in dev when no alerts exist
  useEffect(() => {
    try {
      // import.meta.env.DEV is the Vite dev flag; only seed during development
      // If you prefer to seed in other environments, adjust this check.
      if ((alerts || []).length === 0 && import.meta.env && import.meta.env.DEV) {
        setAlerts(alertExamples as any);
      }
    } catch (e) {
      // ignore
    }
    // run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addAlert = (alert: GlobalAlert) => {
    setAlerts(prev => [alert, ...prev]);
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const markAsRead = (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, read: true } : a
    ));
  };

  const markAllAsRead = () => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  const unreadCount = alerts.filter(a => !a.read).length;
  const highImpactUnreadCount = alerts.filter(a => !a.read && a.impact === 'high').length;

  return (
    <GlobalAlertsContext.Provider
      value={{
        alerts,
        addAlert,
        dismissAlert,
        markAsRead,
        markAllAsRead,
        clearAllAlerts,
        unreadCount,
        highImpactUnreadCount,
      }}
    >
      {children}
    </GlobalAlertsContext.Provider>
  );
}

export function useGlobalAlerts() {
  const context = useContext(GlobalAlertsContext);
  if (!context) {
    throw new Error('useGlobalAlerts must be used within GlobalAlertsProvider');
  }
  return context;
}
