import { useState, useEffect, useRef } from 'react';

const WATCHLIST_STORAGE_KEY = 'vynn_stock_watchlist';

export function useStockWatchlist() {
  // FIXED: Initialize state from localStorage directly to avoid empty array issue in Strict Mode
  const [watchedSymbols, setWatchedSymbols] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          console.log('📊 Watchlist: Loaded from localStorage:', parsed);
          return parsed;
        }
      }
    } catch (error) {
      console.error('Error loading stock watchlist:', error);
    }
    return [];
  });
  
  // FIXED: Track if this is the initial mount to prevent overwriting on first render
  const isInitialMount = useRef(true);

  // FIXED: Save watchlist to localStorage whenever it changes (but skip initial mount)
  useEffect(() => {
    // Skip saving on initial mount in Strict Mode (prevents clearing data on double-render)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    console.log('📊 Watchlist: Saving to localStorage:', watchedSymbols);
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchedSymbols));
  }, [watchedSymbols]);

  const addStock = (symbol: string) => {
    const normalizedSymbol = symbol.toUpperCase().trim();
    if (normalizedSymbol && !watchedSymbols.includes(normalizedSymbol)) {
      setWatchedSymbols(prev => [...prev, normalizedSymbol]);
      return true;
    }
    return false;
  };

  const removeStock = (symbol: string) => {
    setWatchedSymbols(prev => prev.filter(s => s !== symbol));
  };

  const clearWatchlist = () => {
    setWatchedSymbols([]);
  };

  const isStockWatched = (symbol: string) => {
    return watchedSymbols.includes(symbol.toUpperCase());
  };

  return {
    watchedSymbols,
    addStock,
    removeStock,
    clearWatchlist,
    isStockWatched,
    hasStocks: watchedSymbols.length > 0
  };
}