import { useState, useEffect } from 'react';

const WATCHLIST_STORAGE_KEY = 'vynn_stock_watchlist';

export function useStockWatchlist() {
  const [watchedSymbols, setWatchedSymbols] = useState<string[]>([]);

  // Load watchlist from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setWatchedSymbols(parsed);
        } else {
          setWatchedSymbols([]);
        }
      } catch (error) {
        console.error('Error loading stock watchlist:', error);
        setWatchedSymbols([]);
      }
    }
  }, []);

  // Save watchlist to localStorage whenever it changes
  useEffect(() => {
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