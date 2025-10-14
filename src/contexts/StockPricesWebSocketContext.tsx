/**
 * Real-time Stock Prices WebSocket Context Provider
 * 
 * Provides persistent WebSocket connection for stock prices across page navigation.
 * The connection is established once when the app starts and maintained
 * until the app is closed or refreshed.
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useRealTimeStockPrices } from '@/hooks/useRealTimeStockPrices';

interface StockPricesContextType {
  prices: Record<string, any>;
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  connect: () => void;
  disconnect: () => void;
  subscribeToSymbols: (symbols: string[], subscriberId?: string) => void;
  unsubscribeFromSymbols: (symbols: string[], subscriberId?: string) => void;
}

// Create the context
const StockPricesWebSocketContext = createContext<StockPricesContextType | null>(null);

// Provider component
export function StockPricesWebSocketProvider({ children }: { children: React.ReactNode }) {
  const [allSubscribedSymbols, setAllSubscribedSymbols] = useState<Set<string>>(new Set());
  const hasInitialized = useRef(false);
  const subscribersRef = useRef<Map<string, Set<string>>>(new Map()); // Track which components subscribe to which symbols

  // Convert Set to Array for the hook
  const symbolsArray = Array.from(allSubscribedSymbols);
  
  // Use the stock prices hook with all subscribed symbols
  const stockPricesHook = useRealTimeStockPrices(symbolsArray);

  // Function to subscribe to symbols (called by individual components)
  const subscribeToSymbols = useCallback((symbols: string[], subscriberId?: string) => {
    const id = subscriberId || 'default';
    const normalizedSymbols = symbols.map(s => s.toUpperCase());
    
    // Check if this subscriber's symbols actually changed
    const existingSymbols = subscribersRef.current.get(id);
    const symbolsChanged = !existingSymbols || 
      existingSymbols.size !== normalizedSymbols.length ||
      normalizedSymbols.some(symbol => !existingSymbols.has(symbol));

    if (!symbolsChanged) {
      console.log('📈 Stock prices: No change in symbols for subscriber:', id, '- skipping update');
      return;
    }
    
    // Track this subscriber's symbols
    subscribersRef.current.set(id, new Set(normalizedSymbols));
    
    // Update the global set of all subscribed symbols
    setAllSubscribedSymbols(prev => {
      const newSet = new Set(prev);
      normalizedSymbols.forEach(symbol => newSet.add(symbol));
      
      // Only update if the set actually changed
      if (newSet.size === prev.size && Array.from(newSet).every(symbol => prev.has(symbol))) {
        return prev; // No change
      }
      
      console.log('📈 Stock prices: Updated global symbols to:', Array.from(newSet), 'for subscriber:', id);
      return newSet;
    });
  }, []);

  // Function to unsubscribe from symbols
  const unsubscribeFromSymbols = useCallback((symbols: string[], subscriberId?: string) => {
    const id = subscriberId || 'default';
    
    // Remove this subscriber's symbols
    const hadSubscriber = subscribersRef.current.has(id);
    subscribersRef.current.delete(id);
    
    if (!hadSubscriber) {
      console.log('📈 Stock prices: Subscriber', id, 'was not found - skipping unsubscribe');
      return;
    }
    
    // Recalculate global symbols from remaining subscribers
    const allSymbols = new Set<string>();
    subscribersRef.current.forEach(subscriberSymbols => {
      subscriberSymbols.forEach(symbol => allSymbols.add(symbol));
    });
    
    setAllSubscribedSymbols(prev => {
      // Only update if the set actually changed
      if (allSymbols.size === prev.size && Array.from(allSymbols).every(symbol => prev.has(symbol))) {
        return prev; // No change
      }
      
      console.log('📈 Stock prices: Updated global symbols to:', Array.from(allSymbols), 'after removing subscriber:', id);
      return allSymbols;
    });
  }, []);

  // Auto-connect once when the provider mounts (app level)
  useEffect(() => {
    if (!hasInitialized.current) {
      console.log('🚀 Initializing persistent stock prices WebSocket connection');
      hasInitialized.current = true;
    }

    // Don't disconnect on unmount - let the connection persist
    // Only disconnect when the entire app is closed/refreshed
    return () => {
      console.log('📈 Stock Prices WebSocket Provider unmounting - keeping connection alive');
      // No disconnect() call here
    };
  }, []);

  const contextValue: StockPricesContextType = {
    prices: stockPricesHook.prices,
    isConnected: stockPricesHook.isConnected,
    connectionStatus: stockPricesHook.connectionStatus,
    connect: stockPricesHook.connect,
    disconnect: stockPricesHook.disconnect,
    subscribeToSymbols,
    unsubscribeFromSymbols
  };

  return (
    <StockPricesWebSocketContext.Provider value={contextValue}>
      {children}
    </StockPricesWebSocketContext.Provider>
  );
}

// Hook to use the stock prices WebSocket context
export function useStockPricesWebSocket() {
  const context = useContext(StockPricesWebSocketContext);
  if (!context) {
    throw new Error('useStockPricesWebSocket must be used within a StockPricesWebSocketProvider');
  }
  return context;
}

// Hook for components that want to subscribe to specific symbols
export function useStockPricesSubscription(symbols: string[], subscriberId?: string) {
  const context = useStockPricesWebSocket();
  const symbolsRef = useRef<string[]>([]);
  const subscriberIdRef = useRef(subscriberId || `subscriber-${Math.random().toString(36).substr(2, 9)}`);
  const isInitializedRef = useRef(false);

  // Subscribe to symbols when they change
  useEffect(() => {
    if (symbols.length > 0) {
      const normalizedSymbols = symbols.map(s => s.toUpperCase());
      const previousSymbols = symbolsRef.current;
      
      // Only update if symbols actually changed
      const symbolsChanged = !isInitializedRef.current || 
        normalizedSymbols.length !== previousSymbols.length ||
        normalizedSymbols.some(symbol => !previousSymbols.includes(symbol));

      if (symbolsChanged) {
        console.log('📈 Stock prices: Symbols changed for subscriber:', subscriberIdRef.current, 'from:', previousSymbols, 'to:', normalizedSymbols);
        
        // Unsubscribe from previous symbols if any
        if (previousSymbols.length > 0) {
          context.unsubscribeFromSymbols(previousSymbols, subscriberIdRef.current);
        }
        
        // Subscribe to new symbols
        context.subscribeToSymbols(normalizedSymbols, subscriberIdRef.current);
        symbolsRef.current = normalizedSymbols;
        isInitializedRef.current = true;
      }
    } else if (symbolsRef.current.length > 0) {
      // Unsubscribe if symbols list becomes empty
      console.log('📈 Stock prices: Unsubscribing all symbols for subscriber:', subscriberIdRef.current);
      context.unsubscribeFromSymbols(symbolsRef.current, subscriberIdRef.current);
      symbolsRef.current = [];
    }
  }, [symbols.join(',')]); // Removed context from dependencies

  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      if (symbolsRef.current.length > 0) {
        console.log('📈 Stock prices: Component unmounting, cleaning up subscriber:', subscriberIdRef.current);
        context.unsubscribeFromSymbols(symbolsRef.current, subscriberIdRef.current);
      }
    };
  }, []); // Empty dependency array - only runs on mount/unmount

  // Return filtered prices for only the symbols this component cares about
  const filteredPrices = React.useMemo(() => {
    const filtered: Record<string, any> = {};
    symbols.forEach(symbol => {
      const upperSymbol = symbol.toUpperCase();
      if (context.prices[upperSymbol]) {
        filtered[upperSymbol] = context.prices[upperSymbol];
      }
    });
    return filtered;
  }, [context.prices, symbols.join(',')]);

  return {
    prices: filteredPrices,
    isConnected: context.isConnected,
    connectionStatus: context.connectionStatus
  };
}