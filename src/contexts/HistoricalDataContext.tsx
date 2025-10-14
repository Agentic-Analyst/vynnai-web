/**
 * Historical Stock Data Context Provider
 * 
 * Provides persistent caching of historical stock data across page navigation.
 * Data is cached in memory and persists until the app is closed or refreshed.
 */

import React, { createContext, useContext, useRef, useCallback } from 'react';
import { fetchHistoricalData, type Timeframe, type HistoricalDataPoint } from '@/utils/stocksApi';

interface HistoricalDataCache {
  [key: string]: {
    data: HistoricalDataPoint[];
    loading: boolean;
    error: string | null;
    timestamp: number; // For cache expiration
    promise?: Promise<HistoricalDataPoint[]>; // Track ongoing requests
  };
}

interface HistoricalDataContextType {
  getHistoricalData: (symbol: string, timeframe: Timeframe) => {
    data: HistoricalDataPoint[];
    loading: boolean;
    error: string | null;
  };
  clearCache: (symbol?: string) => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache duration

// Create the context
const HistoricalDataContext = createContext<HistoricalDataContextType | null>(null);

// Provider component
export function HistoricalDataProvider({ children }: { children: React.ReactNode }) {
  const cacheRef = useRef<HistoricalDataCache>({});
  const subscribersRef = useRef<Map<string, Set<() => void>>>(new Map()); // Track components using each cache key

  // Generate cache key
  const getCacheKey = (symbol: string, timeframe: Timeframe) => `${symbol}-${timeframe}`;

  // Add subscriber for cache updates
  const addSubscriber = useCallback((cacheKey: string, callback: () => void) => {
    if (!subscribersRef.current.has(cacheKey)) {
      subscribersRef.current.set(cacheKey, new Set());
    }
    subscribersRef.current.get(cacheKey)!.add(callback);
  }, []);

  // Remove subscriber
  const removeSubscriber = useCallback((cacheKey: string, callback: () => void) => {
    const subscribers = subscribersRef.current.get(cacheKey);
    if (subscribers) {
      subscribers.delete(callback);
      if (subscribers.size === 0) {
        subscribersRef.current.delete(cacheKey);
      }
    }
  }, []);

  // Notify subscribers of cache updates
  const notifySubscribers = useCallback((cacheKey: string) => {
    const subscribers = subscribersRef.current.get(cacheKey);
    if (subscribers) {
      subscribers.forEach(callback => callback());
    }
  }, []);

  // Get historical data with caching
  const getHistoricalData = useCallback((symbol: string, timeframe: Timeframe) => {
    const cacheKey = getCacheKey(symbol, timeframe);
    const now = Date.now();
    const cached = cacheRef.current[cacheKey];

    // Return cached data if valid and fresh
    if (cached && (now - cached.timestamp) < CACHE_DURATION && !cached.loading && !cached.error) {
      console.log('📊 Historical data: Using cached data for', cacheKey);
      return {
        data: cached.data,
        loading: false,
        error: null
      };
    }

    // Return loading state if request is in progress
    if (cached && cached.loading && cached.promise) {
      console.log('📊 Historical data: Request in progress for', cacheKey);
      return {
        data: cached.data || [],
        loading: true,
        error: null
      };
    }

    // Start new fetch request
    console.log('📊 Historical data: Fetching new data for', cacheKey);
    
    // Initialize or update cache entry
    cacheRef.current[cacheKey] = {
      data: cached?.data || [],
      loading: true,
      error: null,
      timestamp: now,
      promise: fetchHistoricalData(symbol, timeframe)
    };

    // Execute the fetch
    cacheRef.current[cacheKey].promise!
      .then((historicalData) => {
        console.log('📊 Historical data: Successfully fetched', historicalData.length, 'points for', cacheKey);
        cacheRef.current[cacheKey] = {
          data: historicalData,
          loading: false,
          error: null,
          timestamp: Date.now()
        };
        notifySubscribers(cacheKey);
      })
      .catch((error) => {
        console.error('📊 Historical data: Fetch error for', cacheKey, error);
        cacheRef.current[cacheKey] = {
          data: [],
          loading: false,
          error: error.message || 'Failed to fetch historical data',
          timestamp: Date.now()
        };
        notifySubscribers(cacheKey);
      });

    return {
      data: cached?.data || [],
      loading: true,
      error: null
    };
  }, [notifySubscribers]);

  // Clear cache for specific symbol or all
  const clearCache = useCallback((symbol?: string) => {
    if (symbol) {
      // Clear cache for specific symbol (all timeframes)
      Object.keys(cacheRef.current).forEach(key => {
        if (key.startsWith(`${symbol}-`)) {
          delete cacheRef.current[key];
          console.log('📊 Historical data: Cleared cache for', key);
        }
      });
    } else {
      // Clear all cache
      cacheRef.current = {};
      console.log('📊 Historical data: Cleared all cache');
    }
  }, []);

  const contextValue: HistoricalDataContextType = {
    getHistoricalData,
    clearCache
  };

  return (
    <HistoricalDataContext.Provider value={contextValue}>
      {children}
    </HistoricalDataContext.Provider>
  );
}

// Hook to use the historical data context
export function useHistoricalDataContext() {
  const context = useContext(HistoricalDataContext);
  if (!context) {
    throw new Error('useHistoricalDataContext must be used within a HistoricalDataProvider');
  }
  return context;
}

// Hook for components that want to use cached historical data
export function useCachedHistoricalData(symbol: string, timeframe: Timeframe = '1M') {
  const context = useHistoricalDataContext();
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  const cacheKey = `${symbol}-${timeframe}`;
  
  // Subscribe to cache updates for this specific key
  React.useEffect(() => {
    const callback = () => forceUpdate();
    // Note: We need access to the internal addSubscriber/removeSubscriber
    // For now, we'll use a simpler approach with the getHistoricalData function
    
    // Cleanup on unmount - but don't clear cache
    return () => {
      // No cleanup needed - cache persists
    };
  }, [cacheKey]);

  // Get data from cache
  const result = context.getHistoricalData(symbol, timeframe);
  
  // Trigger re-render when data changes by checking periodically
  React.useEffect(() => {
    if (result.loading) {
      const interval = setInterval(() => {
        const newResult = context.getHistoricalData(symbol, timeframe);
        if (!newResult.loading) {
          forceUpdate();
          clearInterval(interval);
        }
      }, 100); // Check every 100ms for completion
      
      return () => clearInterval(interval);
    }
  }, [result.loading, symbol, timeframe, context]);

  return result;
}