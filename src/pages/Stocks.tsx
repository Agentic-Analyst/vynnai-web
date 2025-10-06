
import React, { useState, useMemo } from 'react';
import { useStockData, mockStocks, generatePriceHistory } from '@/utils/stocksApi';
import { StockCard } from '@/components/stocks/StockCard';
import { StockChart } from '@/components/stocks/StockChart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, X, TrendingUp } from 'lucide-react';
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
    mockStocks.map(stock => stock.symbol)
  );
  const [newSymbol, setNewSymbol] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Use more stable stock data with longer update interval to reduce dramatic fluctuations
  const stocks = useStockData(mockStocks, 30000); // Update every 30 seconds instead of 5 seconds
  
  // Create a comprehensive stock database including watched and additional stocks
  const allStockData = useMemo(() => {
    const existingStocks = [...stocks];
    
    // Add mock data for any watched symbols that aren't in the original stocks
    watchedSymbols.forEach(symbol => {
      if (!existingStocks.find(s => s.symbol === symbol)) {
        // Find if it's in availableStocks for a proper name, otherwise use generic name
        const knownStock = availableStocks.find(s => s.symbol === symbol);
        
        // Create deterministic mock data based on symbol to avoid random crashes
        const hash = symbol.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0);
        
        const basePrice = 50 + Math.abs(hash % 450); // Price between $50-$500
        const changePercent = (Math.abs(hash % 200) - 100) / 20; // -5% to +5%
        const change = (basePrice * changePercent) / 100;
        
        existingStocks.push({
          symbol,
          name: knownStock?.name || `${symbol} Corporation`,
          price: basePrice,
          change: change,
          changePercent: changePercent,
          volume: Math.abs(hash % 50000000) + 1000000, // 1M to 51M
          marketCap: Math.abs(hash % 500000000000) + 1000000000, // 1B to 501B
          lastUpdated: new Date()
        });
      }
    });
    
    return existingStocks;
  }, [stocks, watchedSymbols]);
  
  // Filter stocks to only show watched ones
  const watchedStocks = useMemo(() => {
    return allStockData.filter(stock => watchedSymbols.includes(stock.symbol));
  }, [allStockData, watchedSymbols]);
  
  // Filter watchedStocks based on search query
  const filteredStocks = useMemo(() => {
    if (!searchQuery.trim()) return watchedStocks;
    
    const query = searchQuery.toLowerCase();
    return watchedStocks.filter(stock => 
      stock.symbol.toLowerCase().includes(query) ||
      stock.name.toLowerCase().includes(query)
    );
  }, [watchedStocks, searchQuery]);
  
  const stocksWithHistory = useMemo(() => {
    return filteredStocks.map(stock => ({
      ...stock,
      priceHistory: generatePriceHistory(30, stock.price, 1) // Reduced volatility from 2 to 1
    }));
  }, [filteredStocks]);

  // Initialize selectedStock properly
  const [selectedStock, setSelectedStock] = useState<any>(null);
  
  // Set initial selected stock when stocks are loaded
  React.useEffect(() => {
    try {
      if (!selectedStock && stocksWithHistory.length > 0) {
        setSelectedStock(stocksWithHistory[0]);
      }
    } catch (error) {
      console.error('Error setting initial selected stock:', error);
    }
  }, [stocksWithHistory, selectedStock]);

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
      const remainingStocks = stocksWithHistory.filter(s => s.symbol !== symbol);
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
        const updatedSelected = stocksWithHistory.find(s => s.symbol === selectedStock.symbol);
        if (updatedSelected) {
          setSelectedStock(updatedSelected);
        } else if (stocksWithHistory.length > 0) {
          setSelectedStock(stocksWithHistory[0]);
        } else {
          setSelectedStock(null);
        }
      }
    } catch (error) {
      console.error('Error updating selected stock:', error);
      // Fallback to first stock or null
      if (stocksWithHistory.length > 0) {
        setSelectedStock(stocksWithHistory[0]);
      } else {
        setSelectedStock(null);
      }
    }
  }, [stocksWithHistory, selectedStock?.symbol]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Stocks</h1>
          <Badge variant="secondary" className="text-sm">
            {stocksWithHistory.length} stocks tracked
          </Badge>
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
          
          {stocksWithHistory.length === 0 ? (
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
                {stocksWithHistory.map((stock) => (
                  <div key={stock.symbol} className="relative group">
                    <StockCard 
                      stock={stock} 
                      priceHistory={stock.priceHistory}
                      onClick={() => setSelectedStock(stock)}
                      className={cn(
                        "transition-all duration-200",
                        selectedStock?.symbol === stock.symbol 
                          ? "ring-2 ring-primary shadow-md" 
                          : "hover:shadow-sm"
                      )}
                    />
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
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-sm text-muted-foreground">52W Range</h3>
                      <p className="text-xl font-semibold mt-1">
                        ${(selectedStock.price * 0.8).toFixed(2)} - ${(selectedStock.price * 1.2).toFixed(2)}
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
                    </CardContent>
                  </Card>
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
