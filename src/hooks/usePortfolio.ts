import { useState, useEffect } from 'react';

export interface PortfolioHolding {
  id: string;
  symbol: string;
  shares: number;
  costBasis: number;
  dateAdded: string;
}

export interface PortfolioData {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  costBasis: number;
  currentPrice: number;
  currentValue: number;
  gain: number;
  gainPercent: number;
  dateAdded: string;
}

const PORTFOLIO_STORAGE_KEY = 'portfolio_holdings';

// Default portfolio data
const defaultHoldings: PortfolioHolding[] = [
  { 
    id: '1', 
    symbol: 'AAPL', 
    shares: 15, 
    costBasis: 150.75, 
    dateAdded: '2024-01-15' 
  },
  { 
    id: '2', 
    symbol: 'MSFT', 
    shares: 8, 
    costBasis: 380.25, 
    dateAdded: '2024-02-10' 
  },
  { 
    id: '3', 
    symbol: 'NVDA', 
    shares: 5, 
    costBasis: 820.50, 
    dateAdded: '2024-03-05' 
  },
  { 
    id: '4', 
    symbol: 'GOOGL', 
    shares: 10, 
    costBasis: 145.30, 
    dateAdded: '2024-01-20' 
  },
];

export function usePortfolio() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load portfolio from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    if (saved) {
      try {
        const parsedHoldings = JSON.parse(saved);
        setHoldings(parsedHoldings);
      } catch (error) {
        console.error('Error loading portfolio:', error);
        setHoldings(defaultHoldings);
      }
    } else {
      setHoldings(defaultHoldings);
    }
    setIsInitialized(true);
  }, []);

  // Save to localStorage whenever holdings change (after initialization)
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(holdings));
    }
  }, [holdings, isInitialized]);

  const addHolding = (holding: Omit<PortfolioHolding, 'id' | 'dateAdded'>) => {
    const newHolding: PortfolioHolding = {
      ...holding,
      id: Date.now().toString(),
      dateAdded: new Date().toISOString().split('T')[0],
    };
    setHoldings(prev => [...prev, newHolding]);
  };

  const updateHolding = (id: string, updates: Partial<PortfolioHolding>) => {
    setHoldings(prev => prev.map(holding => 
      holding.id === id ? { ...holding, ...updates } : holding
    ));
  };

  const deleteHolding = (id: string) => {
    setHoldings(prev => prev.filter(holding => holding.id !== id));
  };

  const getHolding = (id: string) => {
    return holdings.find(holding => holding.id === id);
  };

  return {
    holdings,
    addHolding,
    updateHolding,
    deleteHolding,
    getHolding,
  };
}