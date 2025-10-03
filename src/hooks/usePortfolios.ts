import { useState, useEffect } from 'react';
import { PortfolioHolding } from './usePortfolio';

export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  holdings: PortfolioHolding[];
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioSummary {
  id: string;
  name: string;
  description?: string;
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPercent: number;
  holdingsCount: number;
  createdAt: string;
  updatedAt: string;
}

const PORTFOLIOS_STORAGE_KEY = 'vynn_portfolios';

export function usePortfolios() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);

  // Load portfolios from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(PORTFOLIOS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPortfolios(parsed);
      } catch (error) {
        console.error('Error loading portfolios:', error);
        setPortfolios([]);
      }
    }
  }, []);

  // Save portfolios to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(PORTFOLIOS_STORAGE_KEY, JSON.stringify(portfolios));
  }, [portfolios]);

  const createPortfolio = (name: string, description?: string): string => {
    const newPortfolio: Portfolio = {
      id: `portfolio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      holdings: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update state and localStorage synchronously
    const updatedPortfolios = [...portfolios, newPortfolio];
    setPortfolios(updatedPortfolios);
    
    // Immediately save to localStorage to ensure it's available for navigation
    try {
      localStorage.setItem(PORTFOLIOS_STORAGE_KEY, JSON.stringify(updatedPortfolios));
      console.log('Portfolio created and saved:', newPortfolio.id);
    } catch (error) {
      console.error('Failed to save portfolio to localStorage:', error);
    }
    
    return newPortfolio.id;
  };

  const updatePortfolio = (id: string, updates: Partial<Pick<Portfolio, 'name' | 'description' | 'holdings'>>) => {
    const updatedPortfolios = portfolios.map(portfolio => 
      portfolio.id === id 
        ? { 
            ...portfolio, 
            ...updates, 
            updatedAt: new Date().toISOString() 
          }
        : portfolio
    );
    
    setPortfolios(updatedPortfolios);
    // Immediately save to localStorage
    localStorage.setItem(PORTFOLIOS_STORAGE_KEY, JSON.stringify(updatedPortfolios));
  };

  const deletePortfolio = (id: string) => {
    const updatedPortfolios = portfolios.filter(portfolio => portfolio.id !== id);
    setPortfolios(updatedPortfolios);
    // Immediately save to localStorage
    localStorage.setItem(PORTFOLIOS_STORAGE_KEY, JSON.stringify(updatedPortfolios));
  };

  const getPortfolio = (id: string): Portfolio | undefined => {
    console.log('getPortfolio called with id:', id);
    console.log('Current portfolios in state:', portfolios.map(p => ({ id: p.id, name: p.name })));
    
    // First try to find in current state
    let portfolio = portfolios.find(portfolio => portfolio.id === id);
    console.log('Found in state:', !!portfolio);
    
    // If not found, try to get fresh data from localStorage
    if (!portfolio) {
      try {
        const saved = localStorage.getItem(PORTFOLIOS_STORAGE_KEY);
        console.log('Checking localStorage, saved data exists:', !!saved);
        if (saved) {
          const savedPortfolios = JSON.parse(saved);
          console.log('Portfolios in localStorage:', savedPortfolios.map((p: Portfolio) => ({ id: p.id, name: p.name })));
          portfolio = savedPortfolios.find((p: Portfolio) => p.id === id);
          console.log('Found in localStorage:', !!portfolio);
          
          // If found in localStorage but not in state, update state
          if (portfolio && savedPortfolios.length !== portfolios.length) {
            console.log('Updating state with localStorage data');
            setPortfolios(savedPortfolios);
          }
        }
      } catch (error) {
        console.error('Error reading portfolio from localStorage:', error);
      }
    }
    
    console.log('Returning portfolio:', portfolio ? { id: portfolio.id, name: portfolio.name } : null);
    return portfolio;
  };

  // Calculate portfolio summaries with mock stock prices
  const getPortfolioSummaries = (): PortfolioSummary[] => {
    // Mock stock prices for calculation
    const mockPrices: Record<string, number> = {
      'AAPL': 175.50,
      'GOOGL': 138.75,
      'MSFT': 338.25,
      'TSLA': 242.18,
      'NVDA': 465.30,
      'AMZN': 131.45,
      'META': 298.75,
      'NFLX': 425.60,
      'VOO': 395.85,
      'SPY': 428.90,
    };

    return portfolios.map(portfolio => {
      let totalValue = 0;
      let totalCost = 0;

      portfolio.holdings.forEach(holding => {
        const currentPrice = mockPrices[holding.symbol] || holding.costBasis;
        totalValue += currentPrice * holding.shares;
        totalCost += holding.costBasis * holding.shares;
      });

      const totalGain = totalValue - totalCost;
      const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

      return {
        id: portfolio.id,
        name: portfolio.name,
        description: portfolio.description,
        totalValue,
        totalCost,
        totalGain,
        totalGainPercent,
        holdingsCount: portfolio.holdings.length,
        createdAt: portfolio.createdAt,
        updatedAt: portfolio.updatedAt,
      };
    });
  };

  return {
    portfolios,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
    getPortfolio,
    getPortfolioSummaries,
  };
}