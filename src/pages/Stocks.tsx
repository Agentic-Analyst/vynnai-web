
import React, { useState, useMemo } from 'react';
import { useStockPricesSubscription } from '@/contexts/StockPricesWebSocketContext';
import { useStockWatchlist } from '@/hooks/useStockWatchlist';
import { StockCard } from '@/components/stocks/StockCard';
import { StockChart } from '@/components/stocks/StockChart';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PageHeader } from '@/components/PageHeader';
import { MarketStats } from '@/components/markets/MarketStats';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, X, TrendingUp, Wifi, WifiOff, Loader2, BarChart3 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { mockStocks } from '@/utils/stocksApi';

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
  // Use persistent watchlist instead of hardcoded state
  const { watchedSymbols, addStock: addToWatchlist, removeStock: removeFromWatchlist, hasStocks } = useStockWatchlist();
  
  const [newSymbol, setNewSymbol] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  
  // Stabilize symbols for WebSocket connection - only update when symbols actually change
  const symbols = useMemo(() => {
    const filtered = watchedSymbols.filter(Boolean).map(s => s.toUpperCase());
    return [...new Set(filtered)]; // Remove duplicates and ensure uppercase
  }, [watchedSymbols.join(',')]); // Simplified dependency array  // Real-time stock prices using subscription hook
  const { prices: realTimePrices, isConnected, connectionStatus } = useStockPricesSubscription(symbols, 'stocks-page');
  
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

  // Calculate stock data with real-time prices (no mock data fallback)
  const stocks = useMemo(() => {
    try {
      return watchedSymbols.map(symbol => {
        const realTimePrice = realTimePrices[symbol];
        
        // Only use real-time data - no mock data fallback
        if (realTimePrice) {
          return {
            symbol,
            name: realTimePrice.name || symbol,
            price: realTimePrice.current_price ? parseFloat(realTimePrice.current_price.toFixed(2)) : null,
            change: realTimePrice.change_amount ? parseFloat(realTimePrice.change_amount.toFixed(2)) : null,
            changePercent: realTimePrice.change_percent ? parseFloat(realTimePrice.change_percent.toFixed(2)) : null,
            volume: realTimePrice.volume || null,
            marketCap: realTimePrice.market_cap || null,
            lastUpdated: new Date(),
            isRealTime: true,
            priceSource: 'real-time',
            // Additional real-time data from API
            dayHigh: realTimePrice.day_high || null,
            dayLow: realTimePrice.day_low || null,
            high52w: realTimePrice.high_52w || null,
            low52w: realTimePrice.low_52w || null,
            peRatio: realTimePrice.pe_ratio || null,
            dividendYield: realTimePrice.dividend_yield || null,
            bid: realTimePrice.bid || null,
            ask: realTimePrice.ask || null,
            avgVolume: realTimePrice.avg_volume || null
          };
        } else {
          // Return loading state for stocks without real-time data
          const knownStock = availableStocks.find(s => s.symbol === symbol);
          return {
            symbol,
            name: knownStock?.name || symbol,
            price: null, // Will show loading indicator
            change: null,
            changePercent: null,
            volume: null,
            marketCap: null,
            lastUpdated: null,
            isRealTime: false,
            priceSource: 'loading',
            // Additional data all null for loading state
            dayHigh: null,
            dayLow: null,
            high52w: null,
            low52w: null,
            peRatio: null,
            dividendYield: null,
            bid: null,
            ask: null,
            avgVolume: null
          };
        }
      });
    } catch (error) {
      console.error('Error calculating stock data:', error);
      return [];
    }
  }, [watchedSymbols, realTimePrices]);

  const isUsingRealTime = Object.keys(realTimePrices).length > 0;
  const lastUpdated = isUsingRealTime ? new Date() : null;

  // Market stats data: Show empty states when user has no stocks, use their data when they do
  const marketStatsData = useMemo(() => {
    if (hasStocks && stocks.length > 0) {
      // Use user's watchlist for market stats
      return stocks.filter(stock => stock && stock.price !== null);
    } else {
      // Return empty array when user has no stocks - MarketStats will handle empty state
      return [];
    }
  }, [hasStocks, stocks]);

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
      
      const success = addToWatchlist(symbolToAdd);
      if (success) {
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

  // Track deletion state to prevent rapid successive deletions
  const [deletingStocks, setDeletingStocks] = useState<Set<string>>(new Set());

  const removeStock = React.useCallback((symbol: string) => {
    try {
      // Prevent removing if already being deleted
      if (deletingStocks.has(symbol)) {
        console.log('Stock already being deleted:', symbol);
        return;
      }

      // Mark as being deleted
      setDeletingStocks(prev => new Set([...prev, symbol]));

      // Prevent rapid successive deletions
      removeFromWatchlist(symbol);
      console.log('Removed stock:', symbol);
      
      // Safely update selected stock after a brief delay to let state settle
      setTimeout(() => {
        try {
          setSelectedStock(current => {
            // If the removed stock was selected, find a new one
            if (current?.symbol === symbol) {
              // Use the current filteredStocksForDisplay or recalculate safely
              const availableStocks = stocks.filter(s => s && s.symbol && s.symbol !== symbol);
              if (availableStocks.length > 0) {
                console.log('Selecting new stock after deletion:', availableStocks[0].symbol);
                return availableStocks[0];
              } else {
                console.log('No stocks remaining, clearing selection');
                return null;
              }
            }
            return current;
          });
          
          // Remove from deleting set after operation completes
          setDeletingStocks(prev => {
            const newSet = new Set(prev);
            newSet.delete(symbol);
            return newSet;
          });
        } catch (error) {
          console.error('Error updating selected stock after deletion:', error);
          setSelectedStock(null);
          // Still remove from deleting set
          setDeletingStocks(prev => {
            const newSet = new Set(prev);
            newSet.delete(symbol);
            return newSet;
          });
        }
      }, 100); // Slightly longer delay to ensure state stability
    } catch (error) {
      console.error('Error removing stock:', error);
      // Remove from deleting set on error
      setDeletingStocks(prev => {
        const newSet = new Set(prev);
        newSet.delete(symbol);
        return newSet;
      });
    }
  }, [stocks, deletingStocks, removeFromWatchlist]);

  // Update selected stock when stocks data changes (with better error handling)
  React.useEffect(() => {
    try {
      if (selectedStock && selectedStock.symbol) {
        const updatedSelected = filteredStocksForDisplay.find(s => s?.symbol === selectedStock.symbol);
        if (updatedSelected) {
          // Only update if the data actually changed (to prevent infinite loops)
          if (JSON.stringify(updatedSelected) !== JSON.stringify(selectedStock)) {
            setSelectedStock(updatedSelected);
          }
        } else if (filteredStocksForDisplay.length > 0) {
          // Stock no longer exists, select first available
          console.log('Selected stock no longer exists, selecting first available');
          setSelectedStock(filteredStocksForDisplay[0]);
        } else {
          // No stocks left
          console.log('No stocks available, clearing selection');
          setSelectedStock(null);
        }
      } else if (!selectedStock && filteredStocksForDisplay.length > 0) {
        // No stock selected but stocks are available
        console.log('No stock selected, selecting first available');
        setSelectedStock(filteredStocksForDisplay[0]);
      }
    } catch (error) {
      console.error('Error updating selected stock:', error);
      // Defensive fallback
      try {
        if (filteredStocksForDisplay.length > 0) {
          setSelectedStock(filteredStocksForDisplay[0]);
        } else {
          setSelectedStock(null);
        }
      } catch (fallbackError) {
        console.error('Error in fallback selected stock update:', fallbackError);
        setSelectedStock(null);
      }
    }
  }, [filteredStocksForDisplay.length, selectedStock?.symbol]); // More specific dependencies

  return (
    <ErrorBoundary>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Compact Header - Single Row */}
        <div className="flex-shrink-0 pb-3 border-b">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {/* Icon and Title - More Compact */}
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  Stocks
                </h1>
                <p className="text-xs text-muted-foreground">
                  Real-time monitoring
                </p>
              </div>
            </div>
            
            {/* Right Side: Status and Count */}
            <div className="flex items-center gap-3">
              {/* Connection Status - Compact */}
              <div className="flex items-center gap-1.5 text-xs">
                {isUsingRealTime ? (
                  <>
                    <Wifi className={cn(
                      "h-3.5 w-3.5",
                      isConnected ? "text-green-500" : "text-orange-500"
                    )} />
                    <span className="text-muted-foreground">
                      {isConnected ? 'Live Data' : 'Connecting...'}
                    </span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Disconnected</span>
                  </>
                )}
                {lastUpdated && (
                  <span className="text-xs text-muted-foreground ml-1">
                    {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>
              <Badge variant="secondary" className="text-xs h-6">
                {filteredStocksForDisplay.length} stocks tracked
              </Badge>
            </div>
          </div>
          
          {/* Integrated Search Bar - More Compact */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search your stocks or add new ones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm bg-muted/30"
            />
            
            {/* Compact Search Results Info */}
            {searchQuery && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-background border rounded-md shadow-md z-10 p-2">
                <div className="text-xs text-muted-foreground mb-1">
                  {filteredStocks.length > 0 && (
                    <span>Found {filteredStocks.length} stock{filteredStocks.length !== 1 ? 's' : ''} in watchlist</span>
                  )}
                  {filteredStocks.length === 0 && addSuggestions.length === 0 && (
                    <span>No stocks found matching "{searchQuery}"</span>
                  )}
                </div>
                
                {/* Add Suggestions - Compact */}
                {addSuggestions.length > 0 && (
                  <div className="mt-1">
                    <div className="text-xs text-muted-foreground mb-1">Add to watchlist:</div>
                    <div className="flex flex-wrap gap-1">
                      {addSuggestions.map((stock) => (
                        <Button
                          key={stock.symbol}
                          variant="outline"
                          size="sm"
                          onClick={() => addStock(stock.symbol)}
                          className="h-7 text-xs px-2"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {stock.symbol}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Market Overview Stats - Compact */}
        <MarketStats 
          stocks={marketStatsData} 
          className="py-3"
        />

        {/* Main Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Stock List - Scrollable */}
        <div className="lg:col-span-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
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
                  className="w-40 h-8 text-sm"
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
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery ? 'No stocks found' : 'Start Building Your Watchlist'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery 
                    ? `No stocks match "${searchQuery}". Try a different search term.`
                    : 'Add stocks to your watchlist to track their real-time prices and performance.'
                  }
                </p>
                {!searchQuery && (
                  <Button 
                    onClick={() => setShowAddInput(true)} 
                    className="flex items-center gap-2 mx-auto"
                  >
                    <Plus className="h-4 w-4" />
                    Add Your First Stock
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="flex-1">
              <div className="space-y-2 pr-4">
                {filteredStocksForDisplay
                  .filter(stock => stock && stock.symbol) // Safety filter
                  .map((stock) => {
                    try {
                      return (
                        <div key={stock.symbol} className="relative group">
                          <StockCard 
                            stock={stock} 
                            onClick={() => {
                              try {
                                setSelectedStock(stock);
                              } catch (error) {
                                console.error('Error selecting stock:', error);
                              }
                            }}
                            className={cn(
                              "transition-all duration-200",
                              selectedStock?.symbol === stock.symbol 
                                ? "ring-2 ring-primary shadow-md" 
                                : "hover:shadow-sm"
                            )}
                          />
                          {/* Real-time indicator */}
                          {isUsingRealTime && isConnected && stock.isRealTime && (
                            <div className="absolute top-2 left-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" 
                                 title="Live data from real-time feed" />
                          )}
                          {/* Remove button */}
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              try {
                                e.stopPropagation();
                                e.preventDefault();
                                removeStock(stock.symbol);
                              } catch (error) {
                                console.error('Error removing stock:', error);
                              }
                            }}
                            disabled={deletingStocks.has(stock.symbol)} // Prevent deleting if already in progress
                          >
                            {deletingStocks.has(stock.symbol) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      );
                    } catch (error) {
                      console.error('Error rendering stock card:', stock?.symbol, error);
                      return null; // Skip problematic stock cards
                    }
                  })}
              </div>
            </ScrollArea>
          )}
        </div>
        
        {/* Chart and Details - Sticky */}
        <div className="lg:col-span-8 flex flex-col min-h-0">
          {selectedStock && selectedStock.symbol ? (
            <>
              {/* Chart */}
              <div className="flex-1 min-h-[400px] mb-4">
                <StockChart 
                  symbol={selectedStock.symbol} 
                  name={selectedStock.name || selectedStock.symbol} 
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
                        {selectedStock.marketCap !== null && typeof selectedStock.marketCap === 'number' ? 
                          `$${(selectedStock.marketCap / 1000000000).toFixed(2)}B` :
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                          </span>
                        }
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-sm text-muted-foreground">Volume</h3>
                      <p className="text-xl font-semibold mt-1">
                        {selectedStock.volume !== null ? 
                          `${(selectedStock.volume / 1000000).toFixed(1)}M` :
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                          </span>
                        }
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
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                          </span>
                        )}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-sm text-muted-foreground">Change</h3>
                      <p className="text-xl font-semibold mt-1">
                        {selectedStock.change !== null ? (
                          <span className={cn(
                            selectedStock.change >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {selectedStock.change >= 0 ? '+' : ''}${selectedStock.change.toFixed(2)}
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                          </span>
                        )}
                      </p>
                      {selectedStock.changePercent !== null && (
                        <p className={cn(
                          "text-sm mt-1",
                          selectedStock.changePercent >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.changePercent.toFixed(2)}%
                        </p>
                      )}
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
    </ErrorBoundary>
  );
};

export default Stocks;
