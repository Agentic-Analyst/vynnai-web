/**
 * Real-time News WebSocket Context Provider
 * 
 * Provides persistent WebSocket connection across page navigation.
 * The connection is established once when the app starts and maintained
 * until the app is closed or refreshed.
 */

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useRealTimeNews } from '@/hooks/useRealTimeNews';

// Create the context
const NewsWebSocketContext = createContext<ReturnType<typeof useRealTimeNews> | null>(null);

// Provider component
export function NewsWebSocketProvider({ children }: { children: React.ReactNode }) {
  const newsHook = useRealTimeNews();
  const hasInitialized = useRef(false);

  // Auto-connect once when the provider mounts (app level)
  useEffect(() => {
    if (!hasInitialized.current) {
      console.log('🚀 Initializing persistent news WebSocket connection');
      newsHook.connect();
      hasInitialized.current = true;
    }

    // Don't disconnect on unmount - let the connection persist
    // Only disconnect when the entire app is closed/refreshed
    return () => {
      console.log('📰 News WebSocket Provider unmounting - keeping connection alive');
      // No disconnect() call here
    };
  }, []);

  return (
    <NewsWebSocketContext.Provider value={newsHook}>
      {children}
    </NewsWebSocketContext.Provider>
  );
}

// Hook to use the news WebSocket context
export function useNewsWebSocket() {
  const context = useContext(NewsWebSocketContext);
  if (!context) {
    throw new Error('useNewsWebSocket must be used within a NewsWebSocketProvider');
  }
  return context;
}