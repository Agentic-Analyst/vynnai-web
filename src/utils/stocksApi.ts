import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/apiBase';

export interface Stock {
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  marketCap: number | null;
  lastUpdated: Date | null;
}

export interface MarketIndex {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  region: string;
  lastUpdated: Date;
}

export interface CurrencyPair {
  symbol: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  change: number;
  changePercent: number;
  lastUpdated: Date;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  imageUrl?: string;
  publishedAt: Date;
  relatedSymbols?: string[];
  // Additional fields from WebSocket data
  publish_date?: string; // Raw publish date string from WebSocket
  search_category?: string; // Search category from WebSocket
  word_count?: string; // Word count from WebSocket
  serpapi_snippet?: string; // Snippet for summary display
}

export interface Cryptocurrency {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
  supply: number;
  lastUpdated: Date;
}

export const mockStocks: Stock[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 187.32,
    change: 1.28,
    changePercent: 0.69,
    volume: 58394210,
    marketCap: 2920000000000,
    lastUpdated: new Date()
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    price: 402.65,
    change: 3.71,
    changePercent: 0.93,
    volume: 22154780,
    marketCap: 2990000000000,
    lastUpdated: new Date()
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    price: 157.95,
    change: -0.63,
    changePercent: -0.40,
    volume: 18729340,
    marketCap: 1980000000000,
    lastUpdated: new Date()
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    price: 179.83,
    change: 1.02,
    changePercent: 0.57,
    volume: 27194600,
    marketCap: 1870000000000,
    lastUpdated: new Date()
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corp.',
    price: 950.02,
    change: 18.75,
    changePercent: 2.01,
    volume: 42638210,
    marketCap: 2340000000000,
    lastUpdated: new Date()
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    price: 237.47,
    change: -3.25,
    changePercent: -1.35,
    volume: 67129580,
    marketCap: 756000000000,
    lastUpdated: new Date()
  },
  {
    symbol: 'META',
    name: 'Meta Platforms Inc.',
    price: 474.99,
    change: 5.12,
    changePercent: 1.09,
    volume: 15283940,
    marketCap: 1215000000000,
    lastUpdated: new Date()
  },
  {
    symbol: 'V',
    name: 'Visa Inc.',
    price: 267.80,
    change: -1.05,
    changePercent: -0.39,
    volume: 8943760,
    marketCap: 548000000000,
    lastUpdated: new Date()
  }
];

export const mockIndices: MarketIndex[] = [
  {
    symbol: 'SPX',
    name: 'S&P 500',
    value: 5123.41,
    change: 34.85,
    changePercent: 0.68,
    region: 'United States',
    lastUpdated: new Date()
  },
  {
    symbol: 'DJI',
    name: 'Dow Jones',
    value: 38239.98,
    change: 125.68,
    changePercent: 0.33,
    region: 'United States',
    lastUpdated: new Date()
  },
  {
    symbol: 'COMP',
    name: 'NASDAQ',
    value: 16780.30,
    change: 183.05,
    changePercent: 1.10,
    region: 'United States',
    lastUpdated: new Date()
  },
  {
    symbol: 'N225',
    name: 'Nikkei 225',
    value: 38400.00,
    change: -156.34,
    changePercent: -0.41,
    region: 'Japan',
    lastUpdated: new Date()
  },
  {
    symbol: 'FTSE',
    name: 'FTSE 100',
    value: 8127.35,
    change: 54.32,
    changePercent: 0.67,
    region: 'United Kingdom',
    lastUpdated: new Date()
  },
  {
    symbol: 'DAX',
    name: 'DAX',
    value: 17850.50,
    change: -23.45,
    changePercent: -0.13,
    region: 'Germany',
    lastUpdated: new Date()
  }
];

export const mockCurrencies: CurrencyPair[] = [
  {
    symbol: 'EUR/USD',
    fromCurrency: 'EUR',
    toCurrency: 'USD',
    rate: 1.0834,
    change: 0.0023,
    changePercent: 0.21,
    lastUpdated: new Date()
  },
  {
    symbol: 'USD/JPY',
    fromCurrency: 'USD',
    toCurrency: 'JPY',
    rate: 151.59,
    change: -0.43,
    changePercent: -0.28,
    lastUpdated: new Date()
  },
  {
    symbol: 'GBP/USD',
    fromCurrency: 'GBP',
    toCurrency: 'USD',
    rate: 1.2718,
    change: 0.0035,
    changePercent: 0.28,
    lastUpdated: new Date()
  },
  {
    symbol: 'USD/CAD',
    fromCurrency: 'USD',
    toCurrency: 'CAD',
    rate: 1.3642,
    change: -0.0015,
    changePercent: -0.11,
    lastUpdated: new Date()
  },
  {
    symbol: 'USD/CHF',
    fromCurrency: 'USD',
    toCurrency: 'CHF',
    rate: 0.9037,
    change: -0.0028,
    changePercent: -0.31,
    lastUpdated: new Date()
  },
  {
    symbol: 'AUD/USD',
    fromCurrency: 'AUD',
    toCurrency: 'USD',
    rate: 0.6628,
    change: 0.0014,
    changePercent: 0.21,
    lastUpdated: new Date()
  }
];

export const mockNews: NewsItem[] = [
  {
    id: '1',
    title: 'Federal Reserve Signals Potential Rate Cuts Later This Year',
    summary: 'The Federal Reserve indicated it may begin cutting interest rates later this year if inflation continues to moderate, according to minutes from the recent FOMC meeting.',
    source: 'Financial Times',
    url: '#',
    publishedAt: new Date(Date.now() - 3600000 * 2),
    relatedSymbols: ['SPX', 'DJI']
  },
  {
    id: '2',
    title: 'Apple Announces New AI Features for iPhone',
    summary: 'Apple unveiled new AI capabilities for the upcoming iPhone models at its annual developer conference, highlighting privacy-focused on-device processing.',
    source: 'Tech Insider',
    url: '#',
    imageUrl: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=1470&auto=format&fit=crop',
    publishedAt: new Date(Date.now() - 3600000 * 5),
    relatedSymbols: ['AAPL']
  },
  {
    id: '3',
    title: 'NVIDIA Surpasses $2 Trillion Market Cap on AI Chip Demand',
    summary: 'NVIDIA\'s stock reached new heights, pushing its market cap above $2 trillion as demand for AI chips continues to exceed expectations.',
    source: 'Market Watch',
    url: '#',
    publishedAt: new Date(Date.now() - 3600000 * 8),
    relatedSymbols: ['NVDA']
  },
  {
    id: '4',
    title: 'Oil Prices Drop Amid Concerns of Slowing Global Demand',
    summary: 'Crude oil prices fell more than 2% on Thursday as investors weighed reports suggesting slower-than-expected global economic growth.',
    source: 'Energy Report',
    url: '#',
    publishedAt: new Date(Date.now() - 3600000 * 10),
  },
  {
    id: '5',
    title: 'Tesla Deliveries Beat Estimates Despite EV Market Slowdown',
    summary: 'Tesla reported quarterly deliveries that exceeded analyst expectations, bucking the trend of a broader slowdown in electric vehicle sales.',
    source: 'Auto Insights',
    url: '#',
    imageUrl: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?q=80&w=1632&auto=format&fit=crop',
    publishedAt: new Date(Date.now() - 3600000 * 12),
    relatedSymbols: ['TSLA']
  },
  {
    id: '6',
    title: 'Microsoft Azure AI Services See 40% Growth in Q4',
    summary: 'Microsoft reported strong growth in its Azure AI and cloud services division, driven by increased enterprise adoption of AI tools and infrastructure.',
    source: 'Cloud Computing Weekly',
    url: '#',
    publishedAt: new Date(Date.now() - 3600000 * 14),
    relatedSymbols: ['MSFT']
  },
  {
    id: '7',
    title: 'Google Unveils Next-Generation Quantum Computing Chip',
    summary: 'Alphabet\'s Google announced a breakthrough in quantum computing with a new chip that could revolutionize complex problem-solving capabilities.',
    source: 'Tech Innovations',
    url: '#',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?q=80&w=1625&auto=format&fit=crop',
    publishedAt: new Date(Date.now() - 3600000 * 16),
    relatedSymbols: ['GOOGL']
  },
  {
    id: '8',
    title: 'Banking Sector Faces Regulatory Pressure on Digital Assets',
    summary: 'Major banks are under increased scrutiny from regulators regarding their involvement in cryptocurrency and digital asset services.',
    source: 'Financial Regulation Today',
    url: '#',
    publishedAt: new Date(Date.now() - 3600000 * 18),
  },
  {
    id: '9',
    title: 'Amazon Warehouse Automation Reaches New Milestone',
    summary: 'Amazon announced that its fulfillment centers now use 50% more robotic systems than last year, improving efficiency and reducing delivery times.',
    source: 'Logistics Daily',
    url: '#',
    imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1470&auto=format&fit=crop',
    publishedAt: new Date(Date.now() - 3600000 * 20),
    relatedSymbols: ['AMZN']
  },
  {
    id: '10',
    title: 'Semiconductor Shortage Shows Signs of Easing',
    summary: 'Industry analysts report that global semiconductor supply chains are beginning to stabilize, though full recovery may take until next year.',
    source: 'Chip Industry News',
    url: '#',
    publishedAt: new Date(Date.now() - 3600000 * 22),
    relatedSymbols: ['NVDA', 'AMD', 'INTC']
  },
  {
    id: '11',
    title: 'Renewable Energy Stocks Surge on New Climate Legislation',
    summary: 'Clean energy companies saw significant gains after Congress passed new legislation providing additional tax incentives for renewable energy projects.',
    source: 'Green Finance Report',
    url: '#',
    publishedAt: new Date(Date.now() - 3600000 * 24),
  },
  {
    id: '12',
    title: 'Meta Platforms Launches New VR Headset for Enterprise',
    summary: 'Meta announced a new virtual reality headset specifically designed for business applications, targeting the growing enterprise VR market.',
    source: 'VR Business Weekly',
    url: '#',
    imageUrl: 'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?q=80&w=1470&auto=format&fit=crop',
    publishedAt: new Date(Date.now() - 3600000 * 26),
    relatedSymbols: ['META']
  }
];

export const mockCryptos: Cryptocurrency[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    price: 65841.25,
    change: 1203.45,
    changePercent: 1.86,
    marketCap: 1293000000000,
    volume: 28740000000,
    supply: 19637500,
    lastUpdated: new Date()
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    price: 3487.92,
    change: 62.34,
    changePercent: 1.82,
    marketCap: 418700000000,
    volume: 14280000000,
    supply: 120100000,
    lastUpdated: new Date()
  },
  {
    symbol: 'BNB',
    name: 'Binance Coin',
    price: 567.39,
    change: -12.86,
    changePercent: -2.22,
    marketCap: 87900000000,
    volume: 2945000000,
    supply: 155000000,
    lastUpdated: new Date()
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    price: 143.28,
    change: 8.57,
    changePercent: 6.36,
    marketCap: 61500000000,
    volume: 4720000000,
    supply: 429700000,
    lastUpdated: new Date()
  },
  {
    symbol: 'XRP',
    name: 'XRP',
    price: 0.5483,
    change: -0.0132,
    changePercent: -2.35,
    marketCap: 29700000000,
    volume: 1830000000,
    supply: 54200000000,
    lastUpdated: new Date()
  },
  {
    symbol: 'DOGE',
    name: 'Dogecoin',
    price: 0.1245,
    change: 0.0078,
    changePercent: 6.68,
    marketCap: 17800000000,
    volume: 2640000000,
    supply: 143200000000,
    lastUpdated: new Date()
  },
  {
    symbol: 'ADA',
    name: 'Cardano',
    price: 0.4532,
    change: -0.0085,
    changePercent: -1.84,
    marketCap: 16100000000,
    volume: 492000000,
    supply: 35500000000,
    lastUpdated: new Date()
  },
  {
    symbol: 'AVAX',
    name: 'Avalanche',
    price: 35.27,
    change: 2.34,
    changePercent: 7.10,
    marketCap: 13300000000,
    volume: 1280000000,
    supply: 378000000,
    lastUpdated: new Date()
  }
];

export function generatePriceHistory(days: number = 30, startPrice: number = 100, volatility: number = 2): number[] {
  const prices: number[] = [startPrice];
  
  for (let i = 1; i < days; i++) {
    // Reduce volatility for more realistic price movements - cap at 0.5% daily change
    const change = (Math.random() - 0.5) * Math.min(volatility * 0.25, 0.5);
    const newPrice = Math.max(prices[i-1] * (1 + change / 100), 0.1);
    prices.push(parseFloat(newPrice.toFixed(2)));
  }
  
  return prices;
}

export function formatNumber(num: number): string {
  if (num >= 1000000000000) {
    return `$${(num / 1000000000000).toFixed(2)}T`;
  }
  if (num >= 1000000000) {
    return `$${(num / 1000000000).toFixed(2)}B`;
  }
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(2)}M`;
  }
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(2)}K`;
  }
  return `$${num.toFixed(2)}`;
}

export function formatPercentage(num: number): string {
  return `${num > 0 ? '+' : ''}${num.toFixed(2)}%`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatDate(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInSec = Math.floor(diffInMs / 1000);
  const diffInMin = Math.floor(diffInSec / 60);
  const diffInHour = Math.floor(diffInMin / 60);
  
  if (diffInSec < 60) {
    return 'Just now';
  } else if (diffInMin < 60) {
    return `${diffInMin}m ago`;
  } else if (diffInHour < 24) {
    return `${diffInHour}h ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

/**
 * Converts ISO timestamp string to user-friendly relative time
 * @param timestamp - ISO 8601 timestamp string (e.g., "2025-10-29T17:06:30.839155")
 * @returns User-friendly time string (e.g., "2h ago", "3 days ago", "Oct 15")
 */
export function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return timestamp; // Return original if invalid
    }
    
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInSec = Math.floor(diffInMs / 1000);
    const diffInMin = Math.floor(diffInSec / 60);
    const diffInHour = Math.floor(diffInMin / 60);
    const diffInDay = Math.floor(diffInHour / 24);
    
    if (diffInSec < 60) {
      return 'Just now';
    } else if (diffInMin < 60) {
      return `${diffInMin}m ago`;
    } else if (diffInHour < 24) {
      return `${diffInHour}h ago`;
    } else if (diffInDay === 1) {
      return '1 day ago';
    } else if (diffInDay < 7) {
      return `${diffInDay} days ago`;
    } else if (diffInDay < 30) {
      const weeks = Math.floor(diffInDay / 7);
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    } else if (diffInDay < 365) {
      // Show month and day for older articles in current year
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      // Show year for articles older than a year
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return timestamp; // Return original if parsing fails
  }
}

export function useStockData(initialData: Stock[], updateInterval = 5000) {
  const [stocks, setStocks] = useState<Stock[]>(initialData);
  
  useEffect(() => {
    const intervalId = setInterval(() => {
      setStocks(prevStocks => 
        prevStocks.map(stock => {
          // Much more realistic price movements - 0.1% max change per update
          const changeAmount = (Math.random() - 0.5) * (stock.price * 0.001);
          const newPrice = Math.max(stock.price + changeAmount, 0.01);
          const newChange = stock.change + changeAmount;
          const newChangePercent = (newChange / (newPrice - newChange)) * 100;
          
          return {
            ...stock,
            price: parseFloat(newPrice.toFixed(2)),
            change: parseFloat(newChange.toFixed(2)),
            changePercent: parseFloat(newChangePercent.toFixed(2)),
            lastUpdated: new Date()
          };
        })
      );
    }, updateInterval);
    
    return () => clearInterval(intervalId);
  }, [initialData, updateInterval]);
  
  return stocks;
}

export function useMarketIndices(initialData: MarketIndex[], updateInterval = 8000) {
  const [indices, setIndices] = useState<MarketIndex[]>(initialData);
  
  useEffect(() => {
    const intervalId = setInterval(() => {
      setIndices(prevIndices => 
        prevIndices.map(index => {
          const changeAmount = (Math.random() - 0.5) * (index.value * 0.0015);
          const newValue = Math.max(index.value + changeAmount, 0.01);
          const newChange = index.change + changeAmount;
          const newChangePercent = (newChange / (newValue - newChange)) * 100;
          
          return {
            ...index,
            value: parseFloat(newValue.toFixed(2)),
            change: parseFloat(newChange.toFixed(2)),
            changePercent: parseFloat(newChangePercent.toFixed(2)),
            lastUpdated: new Date()
          };
        })
      );
    }, updateInterval);
    
    return () => clearInterval(intervalId);
  }, [initialData, updateInterval]);
  
  return indices;
}

export function useCurrencyPairs(initialData: CurrencyPair[], updateInterval = 10000) {
  const [currencies, setCurrencies] = useState<CurrencyPair[]>(initialData);
  
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrencies(prevCurrencies => 
        prevCurrencies.map(currency => {
          const changeAmount = (Math.random() - 0.5) * (currency.rate * 0.0008);
          const newRate = Math.max(currency.rate + changeAmount, 0.0001);
          const newChange = currency.change + changeAmount;
          const newChangePercent = (newChange / (newRate - newChange)) * 100;
          
          return {
            ...currency,
            rate: parseFloat(newRate.toFixed(4)),
            change: parseFloat(newChange.toFixed(4)),
            changePercent: parseFloat(newChangePercent.toFixed(2)),
            lastUpdated: new Date()
          };
        })
      );
    }, updateInterval);
    
    return () => clearInterval(intervalId);
  }, [initialData, updateInterval]);
  
  return currencies;
}

export function useCryptoData(initialData: Cryptocurrency[], updateInterval = 7000) {
  const [cryptos, setCryptos] = useState<Cryptocurrency[]>(initialData);
  
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCryptos(prevCryptos => 
        prevCryptos.map(crypto => {
          const volatilityFactor = crypto.symbol === 'BTC' || crypto.symbol === 'ETH' ? 0.005 : 0.012;
          const changeAmount = (Math.random() - 0.5) * (crypto.price * volatilityFactor);
          const newPrice = Math.max(crypto.price + changeAmount, 0.000001);
          const newChange = crypto.change + changeAmount;
          const newChangePercent = (newChange / (newPrice - newChange)) * 100;
          
          return {
            ...crypto,
            price: parseFloat(newPrice.toFixed(crypto.price < 1 ? 4 : 2)),
            change: parseFloat(newChange.toFixed(crypto.price < 1 ? 4 : 2)),
            changePercent: parseFloat(newChangePercent.toFixed(2)),
            lastUpdated: new Date()
          };
        })
      );
    }, updateInterval);
    
    return () => clearInterval(intervalId);
  }, [initialData, updateInterval]);
  
  return cryptos;
}

// Historical data interfaces and API
export interface HistoricalDataPoint {
  timestamp: string;
  price: number;
  volume: number;
}

export interface HistoricalDataResponse {
  symbol: string;
  timeframe: string;
  data: HistoricalDataPoint[];
}

export type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';

// Fetch historical data from real-time API
export async function fetchHistoricalData(symbol: string, timeframe: Timeframe = '1M'): Promise<HistoricalDataPoint[]> {
  try {
    const url = `${API_BASE_URL}/api/realtime/historical/${symbol}?timeframe=${timeframe}`;
    
    console.log(`🔍 Fetching historical data: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data: HistoricalDataResponse = await response.json();
    console.log(`📊 Historical data received for ${symbol}:`, data.data?.length || 0, 'points');
    
    return data.data || [];
  } catch (error) {
    console.error(`❌ Error fetching historical data for ${symbol}:`, error);
    // Return empty array on error - component will handle fallback
    return [];
  }
}

// React hook for historical data
export function useHistoricalData(symbol: string, timeframe: Timeframe = '1M') {
  const [data, setData] = useState<HistoricalDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) {
      setData([]);
      return;
    }

    let isCancelled = false;
    setLoading(true);
    setError(null);

    fetchHistoricalData(symbol, timeframe)
      .then((historicalData) => {
        if (!isCancelled) {
          setData(historicalData);
          setError(null);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('Historical data fetch error:', err);
          setError(err.message || 'Failed to fetch historical data');
          setData([]); // Clear data on error
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [symbol, timeframe]);

  return { data, loading, error };
}
