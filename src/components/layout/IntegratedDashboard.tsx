import React, { useState, useMemo } from 'react';
import { 
  useStockData, useMarketIndices, useCurrencyPairs, 
  mockStocks, mockIndices, mockCurrencies, mockNews
} from '@/utils/stocksApi';
import { useStockPricesSubscription } from '@/contexts/StockPricesWebSocketContext';
import { StockCard } from '@/components/stocks/StockCard';
import { StockChart } from '@/components/stocks/StockChart';
import { MarketOverview } from '@/components/markets/MarketOverview';
import { MarketStats } from '@/components/markets/MarketStats';
import { CurrencyExchange } from '@/components/currencies/CurrencyExchange';
import { NewsCard } from '@/components/news/NewsCard';
import { BarChart3, TrendingDown, TrendingUp, Wallet2 } from 'lucide-react';

export function IntegratedDashboard() {
  // Get mock stock data as base
  const mockStocks_local = useStockData(mockStocks);
  
  // Get symbols for real-time prices
  const symbols = useMemo(() => {
    return mockStocks.map(stock => stock.symbol);
  }, []);
  
  // Get real-time stock prices using subscription hook
  const { prices: realTimePrices, isConnected } = useStockPricesSubscription(symbols, 'integrated-dashboard');
  
  // Combine real-time prices with mock data (same pattern as Stocks.tsx)
  const stocks = useMemo(() => {
    return mockStocks_local.map(mockStock => {
      const realTimePrice = realTimePrices[mockStock.symbol];
      
      if (realTimePrice) {
        // Use real-time data
        return {
          ...mockStock,
          name: realTimePrice.name || mockStock.name,
          price: realTimePrice.current_price,
          change: realTimePrice.change_amount,
          changePercent: realTimePrice.change_percent,
          volume: realTimePrice.volume || mockStock.volume,
          marketCap: realTimePrice.market_cap || mockStock.marketCap,
          lastUpdated: new Date(),
          isRealTime: true
        };
      } else {
        // Use mock data as fallback
        return {
          ...mockStock,
          isRealTime: false
        };
      }
    });
  }, [mockStocks_local, realTimePrices]);
  
  const [selectedStock, setSelectedStock] = useState(stocks[0]);
  
  // Use our hooks to get real-time mock data for other markets
  const indices = useMarketIndices(mockIndices);
  const currencies = useCurrencyPairs(mockCurrencies);
  
  // Update selected stock when stocks data changes
  React.useEffect(() => {
    if (stocks.length > 0 && (!selectedStock || !stocks.find(s => s.symbol === selectedStock.symbol))) {
      setSelectedStock(stocks[0]);
    }
  }, [stocks, selectedStock]);
  
  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <div className="container max-w-full p-4 lg:p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 dark:from-amber-200 dark:via-amber-400 dark:to-amber-200 bg-clip-text text-transparent">
              Market Overview
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Real-time financial intelligence</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse"></span>
            LIVE MARKET DATA
          </div>
        </div>
        
        {/* Stats Row */}
        <MarketStats stocks={stocks} className="mb-6 animate-slide-up" />
        
        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left column - Stock list */}
          <div className="lg:col-span-1 space-y-4 animate-slide-up" style={{ '--delay': '200ms' } as React.CSSProperties}>
            <h2 className="text-lg font-serif font-semibold text-foreground border-b border-amber-500/10 pb-2">Watchlist</h2>
            <div className="space-y-4">
              {stocks.slice(0, 5).map((stock) => (
                <StockCard 
                  key={stock.symbol} 
                  stock={stock} 
                  onClick={() => setSelectedStock(stock)}
                  className={selectedStock?.symbol === stock.symbol ? "ring-1 ring-amber-500 bg-card/80" : "hover:bg-card/50"}
                />
              ))}
            </div>
          </div>
          
          {/* Middle column - Chart and news */}
          <div className="lg:col-span-2 space-y-4 animate-slide-up" style={{ '--delay': '300ms' } as React.CSSProperties}>
            <div className="h-[400px]">
              <StockChart 
                symbol={selectedStock?.symbol || ''} 
                name={selectedStock?.name || ''} 
                currentPrice={selectedStock?.price || 0}
                volatility={2.5}
                className="h-full border-amber-500/10 bg-card/50 backdrop-blur-sm"
              />
            </div>
            <NewsCard news={mockNews} className="mt-6 border-amber-500/10 bg-card/50" />
          </div>
          
          {/* Right column - Markets and currencies */}
          <div className="lg:col-span-1 space-y-4 animate-slide-up" style={{ '--delay': '400ms' } as React.CSSProperties}>
            <MarketOverview indices={indices} />
            <CurrencyExchange currencies={currencies} />
          </div>
        </div>
      </div>
    </div>
  );
}