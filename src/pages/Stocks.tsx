
import React, { useState, useMemo } from 'react';
import { useStockData, mockStocks as initialMockStocks } from '@/utils/stocksApi';
import { useRealTimeStockPrices } from '@/hooks/useRealTimeStockPrices';
import { StockCard } from '@/components/stocks/StockCard';
import { StockChart } from '@/components/stocks/StockChart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, X, TrendingUp, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

// Popular stocks for search suggestions
const availableStocks = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corp.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'META', name: 'Meta Platforms Inc.' },
  { symbol: 'V', name: 'Visa Inc.' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
  { symbol: 'JNJ', name: 'Johnson & Johnson' },
  { symbol: 'WMT', name: 'Walmart Inc.' },
  { symbol: 'PG', name: 'Procter & Gamble Co.' },
  { symbol: 'UNH', name: 'UnitedHealth Group Inc.' },
  { symbol: 'HD', name: 'Home Depot Inc.' },
  { symbol: 'MA', name: 'Mastercard Inc.' },
  { symbol: 'BAC', name: 'Bank of America Corp.' },
  { symbol: 'XOM', name: 'Exxon Mobil Corp.' },
  { symbol: 'ABBV', name: 'AbbVie Inc.' },
  { symbol: 'CVX', name: 'Chevron Corp.' },
  { symbol: 'LLY', name: 'Eli Lilly and Co.' },
];

const Stocks = () => {
  const [watchedSymbols, setWatchedSymbols] = useState<string[]>(
    initialMockStocks.map(stock => stock.symbol)
  );
  const [newSymbol, setNewSymbol] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  
  // Get mock stock data
  const mockStocks = useStockData(initialMockStocks, 30000);
  
  // Stabilize symbols for WebSocket connection (following portfolio pattern)
  const symbols = useMemo(() => {
    return watchedSymbols.filter(Boolean);
  }, [watchedSymbols.length, watchedSymbols.join(',')]);
  
  // Real-time stock prices (following portfolio's exact pattern)
  const { prices: realTimePrices, isConnected, connectionStatus } = useRealTimeStockPrices(symbols);
  
  // Show toast when real-time connection is established (following portfolio pattern)
  const showConnectionToast = React.useCallback(() => {
    if (isConnected && symbols.length > 0) {
      toast({
        title: 'Live Stock Prices Connected',
        description: `Real-time price updates enabled for ${symbols.length} stocks`,
      });
    }
  }, [isConnected, symbols.length, toast]);

  React.useEffect(() => {
    showConnectionToast();
  }, [showConnectionToast]);

  // Show toast when connection is lost
  const showDisconnectionToast = React.useCallback(() => {
    if (!isConnected && connectionStatus === 'disconnected' && symbols.length > 0) {
      toast({
        title: 'Connection Lost',
        description: 'Real-time updates unavailable, using cached data',
        variant: 'destructive',
      });
    }
  }, [isConnected, connectionStatus, symbols.length, toast]);

  React.useEffect(() => {
    showDisconnectionToast();
  }, [showDisconnectionToast]);
  
  // Debug logging for WebSocket state changes (following portfolio pattern)
  React.useEffect(() => {
    console.log('🔍 Stock WebSocket State Change:', {
      isConnected,
      connectionStatus,
      symbolsCount: symbols.length,
      symbols: symbols.slice(0, 3), // Log first 3 symbols only
      pricesCount: Object.keys(realTimePrices).length
    });
  }, [isConnected, connectionStatus, symbols.length, Object.keys(realTimePrices).length]);

  // Calculate stock data with real-time prices (following portfolio's exact pattern)
  const stocks = useMemo(() => {
    try {
      return watchedSymbols.map(symbol => {
        const mockStock = mockStocks.find(s => s.symbol === symbol);
        const realTimePrice = realTimePrices[symbol];
        
        // Prioritize real-time price, then mock data, then create fallback
        let price = 100; // Default fallback
        let name = `${symbol} Corporation`;
        let change = 0;
        let changePercent = 0;
        let volume = 1000000;
        let marketCap = 1000000000;
        let priceSource = 'fallback';
        
        if (realTimePrice) {
          price = realTimePrice.current_price;
          name = realTimePrice.name || symbol; // Use name from API if available
          change = realTimePrice.change_amount;
          changePercent = realTimePrice.change_percent;
          volume = realTimePrice.volume || 1000000; // Use API volume or fallback
          marketCap = realTimePrice.market_cap || 1000000000; // Use API market cap or fallback
          priceSource = 'real-time';
        } else if (mockStock) {
          price = mockStock.price;
          name = mockStock.name;
          change = mockStock.change;
          changePercent = mockStock.changePercent;
          volume = mockStock.volume;
          marketCap = mockStock.marketCap;
          priceSource = 'mock-data';
        } else {
          // Create deterministic mock data for unknown symbols
          const hash = symbol.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
          }, 0);
          
          price = 50 + Math.abs(hash % 450);
          changePercent = (Math.abs(hash % 200) - 100) / 20;
          change = (price * changePercent) / 100;
          volume = Math.abs(hash % 50000000) + 1000000;
          marketCap = Math.abs(hash % 500000000000) + 1000000000;
          priceSource = 'generated';
          
          // Use available stock name if exists
          const knownStock = availableStocks.find(s => s.symbol === symbol);
          if (knownStock) {
            name = knownStock.name;
          }
        }
        
        return {
          symbol,
          name,
          price: parseFloat(price.toFixed(2)),
          change: parseFloat(change.toFixed(2)),
          changePercent: parseFloat(changePercent.toFixed(2)),
          volume,
          marketCap,
          lastUpdated: new Date(),
          isRealTime: !!realTimePrice,
          priceSource,
          // Additional real-time data from API
          dayHigh: realTimePrice?.day_high,
          dayLow: realTimePrice?.day_low,
          high52w: realTimePrice?.high_52w,
          low52w: realTimePrice?.low_52w,
          peRatio: realTimePrice?.pe_ratio,
          dividendYield: realTimePrice?.dividend_yield,
          bid: realTimePrice?.bid,
          ask: realTimePrice?.ask,
          avgVolume: realTimePrice?.avg_volume
        };
      });
    } catch (error) {
      console.error('Error calculating stock data:', error);
      return [];
    }
  }, [watchedSymbols, mockStocks, realTimePrices]);

  const isUsingRealTime = Object.keys(realTimePrices).length > 0;
  const lastUpdated = isUsingRealTime ? new Date() : null;

  // Filter stocks based on search query
  const filteredStocks = useMemo(() => {
    if (!searchQuery.trim()) return stocks;
    
    const query = searchQuery.toLowerCase();
    return stocks.filter(stock => 
      stock.symbol.toLowerCase().includes(query) ||
      stock.name.toLowerCase().includes(query)
    );
  }, [stocks, searchQuery]);

  // No longer generating mock price history - StockChart handles real historical data
  const filteredStocksForDisplay = filteredStocks;

  // Initialize selectedStock properly
  const [selectedStock, setSelectedStock] = useState<any>(null);
  
  // Set initial selected stock when stocks are loaded
  React.useEffect(() => {
    try {
      if (!selectedStock && filteredStocksForDisplay.length > 0) {
        setSelectedStock(filteredStocksForDisplay[0]);
      }
    } catch (error) {
      console.error('Error setting initial selected stock:', error);
    }
  }, [filteredStocksForDisplay, selectedStock]);

  // Search suggestions for adding new stocks (only show when no current stocks match)
  const addSuggestions = useMemo(() => {
    try {
      if (!searchQuery.trim()) return [];
      
      const query = searchQuery.toLowerCase();
      return availableStocks.filter(stock => 
        !watchedSymbols.includes(stock.symbol) && (
          stock.symbol.toLowerCase().includes(query) ||
          stock.name.toLowerCase().includes(query)
        )
      ).slice(0, 3); // Limit to 3 results
    } catch (error) {
      console.error('Error generating add suggestions:', error);
      return [];
    }
  }, [searchQuery, watchedSymbols]);

  const addStock = (symbol?: string) => {
    try {
      const symbolToAdd = symbol || newSymbol.trim().toUpperCase();
      
      // Validate symbol format (basic validation)
      if (!symbolToAdd || symbolToAdd.length === 0) {
        console.warn('Empty symbol provided');
        return;
      }
      
      if (symbolToAdd.length > 10) {
        console.warn('Symbol too long:', symbolToAdd);
        return;
      }
      
      // Check for invalid characters (allow only letters, numbers, and common symbols like .)
      if (!/^[A-Z0-9.-]+$/.test(symbolToAdd)) {
        console.warn('Invalid symbol format:', symbolToAdd);
        return;
      }
      
      if (!watchedSymbols.includes(symbolToAdd)) {
        setWatchedSymbols(prev => [...prev, symbolToAdd]);
        setNewSymbol('');
        setShowAddInput(false);
        setSearchQuery('');
        console.log('Added new stock:', symbolToAdd);
      } else {
        console.log('Stock already in watchlist:', symbolToAdd);
      }
    } catch (error) {
      console.error('Error adding stock:', error);
      // Reset states to prevent crash
      setNewSymbol('');
      setShowAddInput(false);
      setSearchQuery('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addStock();
    } else if (e.key === 'Escape') {
      setNewSymbol('');
      setShowAddInput(false);
    }
  };

  const removeStock = (symbol: string) => {
    setWatchedSymbols(prev => prev.filter(s => s !== symbol));
    // If removed stock was selected, select the first remaining stock
    if (selectedStock?.symbol === symbol) {
      const remainingStocks = filteredStocksForDisplay.filter(s => s.symbol !== symbol);
      if (remainingStocks.length > 0) {
        setSelectedStock(remainingStocks[0]);
      } else {
        setSelectedStock(null);
      }
    }
  };

  // Update selected stock when stocks data changes
  React.useEffect(() => {
    try {
      if (selectedStock) {
        const updatedSelected = filteredStocksForDisplay.find(s => s.symbol === selectedStock.symbol);
        if (updatedSelected) {
          setSelectedStock(updatedSelected);
        } else if (filteredStocksForDisplay.length > 0) {
          setSelectedStock(filteredStocksForDisplay[0]);
        } else {
          setSelectedStock(null);
        }
      }
    } catch (error) {
      console.error('Error updating selected stock:', error);
      // Fallback to first stock or null
      if (filteredStocksForDisplay.length > 0) {
        setSelectedStock(filteredStocksForDisplay[0]);
      } else {
        setSelectedStock(null);
      }
    }
  }, [filteredStocksForDisplay, selectedStock?.symbol]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Stocks</h1>
          <div className="flex items-center gap-3">
            {/* Connection Status Indicator */}
            <div className="flex items-center gap-2 text-sm">
              {isUsingRealTime ? (
                <>
                  <Wifi className={cn(
                    "h-4 w-4",
                    isConnected ? "text-green-500" : "text-orange-500"
                  )} />
                  <span className="text-muted-foreground">
                    {isConnected ? 'Live Data' : 'Connecting...'}
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Mock Data</span>
                </>
              )}
              {lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
            <Badge variant="secondary" className="text-sm">
              {filteredStocksForDisplay.length} stocks tracked
            </Badge>
          </div>
        </div>
        
        {/* Search Bar */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search your stocks or add new ones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Show results info */}
            {searchQuery && (
              <div className="mt-2 text-sm text-muted-foreground">
                {filteredStocks.length > 0 && (
                  <span>Found {filteredStocks.length} stock{filteredStocks.length !== 1 ? 's' : ''} in your watchlist</span>
                )}
                {filteredStocks.length === 0 && addSuggestions.length === 0 && (
                  <span>No stocks found matching "{searchQuery}"</span>
                )}
              </div>
            )}
            
            {/* Add Suggestions - only show when no current stocks match or when we have results */}
            {searchQuery && addSuggestions.length > 0 && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
                <div className="text-sm text-muted-foreground mb-2">Add to watchlist:</div>
                <div className="flex flex-wrap gap-2">
                  {addSuggestions.map((stock) => (
                    <Button
                      key={stock.symbol}
                      variant="outline"
                      size="sm"
                      onClick={() => addStock(stock.symbol)}
                      className="h-8 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {stock.symbol} - {stock.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Stock List - Scrollable */}
        <div className="lg:col-span-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Watchlist
            </h2>
            
            {/* Simple Add Button */}
            {!showAddInput ? (
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setShowAddInput(true)}
                className="h-8 w-8"
              >
                <Plus className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Symbol (e.g., AAPL)"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="w-32 h-8 text-sm"
                  autoFocus
                />
                <Button 
                  size="icon"
                  onClick={addStock}
                  disabled={!newSymbol.trim()}
                  className="h-8 w-8"
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setNewSymbol('');
                    setShowAddInput(false);
                  }}
                  className="h-8 w-8"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          
          {filteredStocksForDisplay.length === 0 ? (
            <Card className="flex-1 flex items-center justify-center">
              <CardContent className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No stocks in watchlist</h3>
                <p className="text-muted-foreground mb-4">Click the + button to add stocks</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="flex-1">
              <div className="space-y-3 pr-4">
                {filteredStocksForDisplay.map((stock) => (
                  <div key={stock.symbol} className="relative group">
                    <StockCard 
                      stock={stock} 
                      onClick={() => setSelectedStock(stock)}
                      className={cn(
                        "transition-all duration-200",
                        selectedStock?.symbol === stock.symbol 
                          ? "ring-2 ring-primary shadow-md" 
                          : "hover:shadow-sm"
                      )}
                    />
                    {/* Real-time indicator */}
                    {isUsingRealTime && isConnected && (
                      <div className="absolute top-2 left-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" 
                           title="Live data from real-time feed" />
                    )}
                    {/* Remove button */}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeStock(stock.symbol);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
        
        {/* Chart and Details - Sticky */}
        <div className="lg:col-span-8 flex flex-col min-h-0">
          {selectedStock ? (
            <>
              {/* Chart */}
              <div className="flex-1 min-h-[400px] mb-4">
                <StockChart 
                  symbol={selectedStock.symbol} 
                  name={selectedStock.name} 
                  currentPrice={selectedStock.price}
                  volatility={2.5}
                  className="h-full"
                />
              </div>
              
              {/* Additional Stats */}
              <div className="flex-shrink-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-sm text-muted-foreground">Market Cap</h3>
                      <p className="text-xl font-semibold mt-1">
                        ${(selectedStock.marketCap / 1000000000).toFixed(2)}B
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-sm text-muted-foreground">Volume</h3>
                      <p className="text-xl font-semibold mt-1">
                        {(selectedStock.volume / 1000000).toFixed(2)}M
                      </p>
                      {selectedStock.avgVolume && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Avg: {(selectedStock.avgVolume / 1000000).toFixed(1)}M
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-sm text-muted-foreground">52W Range</h3>
                      <p className="text-xl font-semibold mt-1">
                        {selectedStock.low52w && selectedStock.high52w ? (
                          `$${selectedStock.low52w.toFixed(2)} - $${selectedStock.high52w.toFixed(2)}`
                        ) : (
                          `$${(selectedStock.price * 0.8).toFixed(2)} - $${(selectedStock.price * 1.2).toFixed(2)}`
                        )}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-sm text-muted-foreground">Change</h3>
                      <p className={cn(
                        "text-xl font-semibold mt-1",
                        selectedStock.change >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {selectedStock.change >= 0 ? '+' : ''}${selectedStock.change.toFixed(2)}
                      </p>
                      <p className={cn(
                        "text-sm mt-1",
                        selectedStock.changePercent >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.changePercent.toFixed(2)}%
                      </p>
                    </CardContent>
                  </Card>
                  
                  {/* Additional cards for real-time data */}
                  {selectedStock.isRealTime && (
                    <>
                      {selectedStock.dayHigh && selectedStock.dayLow && (
                        <Card>
                          <CardContent className="p-4">
                            <h3 className="font-medium text-sm text-muted-foreground">Day Range</h3>
                            <p className="text-xl font-semibold mt-1">
                              ${selectedStock.dayLow.toFixed(2)} - ${selectedStock.dayHigh.toFixed(2)}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                      
                      {selectedStock.peRatio && (
                        <Card>
                          <CardContent className="p-4">
                            <h3 className="font-medium text-sm text-muted-foreground">P/E Ratio</h3>
                            <p className="text-xl font-semibold mt-1">
                              {selectedStock.peRatio.toFixed(2)}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                      
                      {selectedStock.bid && selectedStock.ask && (
                        <Card>
                          <CardContent className="p-4">
                            <h3 className="font-medium text-sm text-muted-foreground">Bid / Ask</h3>
                            <p className="text-xl font-semibold mt-1">
                              ${selectedStock.bid.toFixed(2)} / ${selectedStock.ask.toFixed(2)}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                      
                      {selectedStock.dividendYield && (
                        <Card>
                          <CardContent className="p-4">
                            <h3 className="font-medium text-sm text-muted-foreground">Dividend Yield</h3>
                            <p className="text-xl font-semibold mt-1">
                              {selectedStock.dividendYield.toFixed(2)}%
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <Card className="flex-1 flex items-center justify-center">
              <CardContent className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No stock selected</h3>
                <p className="text-muted-foreground">Add stocks to your watchlist to view charts and details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Stocks;
