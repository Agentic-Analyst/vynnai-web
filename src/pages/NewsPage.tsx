import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNewsWebSocket } from '@/contexts/NewsWebSocketContext';
import { useStockWatchlist } from '@/hooks/useStockWatchlist';
import { formatDate } from '@/utils/stocksApi';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  NewspaperIcon,
  Search,
  ExternalLink,
  Clock,
  TrendingUp,
  X,
  Wifi,
  WifiOff,
  Radio,
  AlertCircle,
  RefreshCw,
  Activity,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export function NewsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [showAllTickers, setShowAllTickers] = useState(false);
  const [showAllSources, setShowAllSources] = useState(false);
  const navigate = useNavigate();
  
  // Get stocks from watchlist to subscribe to news
  const { watchedSymbols, hasStocks } = useStockWatchlist();
  
  // Real-time news WebSocket integration from context
  const {
    connectionState,
    getAllArticles,
    subscribe,
    refresh,
    isSubscribedTo,
    lastError,
    clearError,
    tickerStatuses
  } = useNewsWebSocket();

  // Auto-subscribe to watchlist tickers when connection is ready
  useEffect(() => {
    if (connectionState.isConnected && hasStocks && watchedSymbols.length > 0) {
      // Check if we need to update subscriptions
      const currentTickers = Array.from(connectionState.subscribedTickers);
      const needsUpdate = watchedSymbols.some(ticker => !isSubscribedTo(ticker)) ||
                         currentTickers.some((ticker: string) => !watchedSymbols.includes(ticker));
      
      if (needsUpdate) {
        console.log('📰 Subscribing to watchlist tickers:', watchedSymbols);
        subscribe(watchedSymbols, { limit: 100, days_back: 7 }); // Increased limit for pagination
      }
    }
  }, [connectionState.isConnected, hasStocks, watchedSymbols, subscribe, isSubscribedTo, connectionState.subscribedTickers]);

  // Get all articles and extract available tickers and sources
  const allArticles = getAllArticles();
  
  const availableTickers = useMemo(() => {
    const tickers = new Set<string>();
    allArticles.forEach(article => {
      if (article.relatedSymbols) {
        article.relatedSymbols.forEach(symbol => tickers.add(symbol));
      }
    });
    return Array.from(tickers).sort();
  }, [allArticles]);

  const availableSources = useMemo(() => {
    const sources = new Set<string>();
    allArticles.forEach(article => {
      if (article.source) {
        sources.add(article.source);
      }
    });
    return Array.from(sources).sort();
  }, [allArticles]);
  
  const filteredArticles = useMemo(() => {
    return allArticles.filter(article => {
      // Search filter - focus on titles primarily
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' || 
                           article.title.toLowerCase().includes(searchLower);
      
      // Ticker filter
      const matchesTicker = selectedTickers.length === 0 || 
                           (article.relatedSymbols && 
                            article.relatedSymbols.some(symbol => selectedTickers.includes(symbol)));
      
      // Source filter
      const matchesSource = selectedSources.length === 0 || 
                           (article.source && selectedSources.includes(article.source));
      
      return matchesSearch && matchesTicker && matchesSource;
    });
  }, [allArticles, searchQuery, selectedTickers, selectedSources]);

  // Pagination logic
  const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedArticles = filteredArticles.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTickers, selectedSources]);

  const handleNewsClick = (article: any) => {
    if (article.url && article.url !== '#') {
      window.open(article.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleTickerToggle = (ticker: string) => {
    setSelectedTickers(prev => 
      prev.includes(ticker) 
        ? prev.filter(t => t !== ticker)
        : [...prev, ticker]
    );
  };

  const handleSourceToggle = (source: string) => {
    setSelectedSources(prev => 
      prev.includes(source) 
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  const clearAllFilters = () => {
    setSelectedTickers([]);
    setSelectedSources([]);
    setSearchQuery('');
  };

  return (
    <div className="animate-fade-in">
      {/* Header with Connection Status */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-4">
          <NewspaperIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Real-Time News Feed</h1>
        </div>
        <div className="flex items-center justify-center gap-4 text-sm">
          <div className={`flex items-center gap-2 ${
            connectionState.isConnected ? 'text-green-600' : 'text-red-600'
          }`}>
            <div className={`w-3 h-3 rounded-full ${
              connectionState.isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            {connectionState.isConnected ? 'Connected' : 'Disconnected'}
          </div>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">
            {Array.from(connectionState.subscribedTickers).length} subscription{Array.from(connectionState.subscribedTickers).length !== 1 ? 's' : ''}
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">{allArticles.length} articles</span>
        </div>
      </div>

      {/* Error Display */}
      {lastError && (
        <Card className="border-red-200 bg-red-50 mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-red-700">{lastError.message}</span>
              </div>
              <Button onClick={clearError} variant="ghost" size="sm">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Stocks Warning */}
      {!hasStocks && (
        <Card className="border-blue-200 bg-blue-50 mb-6">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-blue-700">
                Add stocks to your watchlist in the <strong>Stocks</strong> page to see relevant news here.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search news titles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Ticker Filter */}
          {availableTickers.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Tickers:</span>
              <div className="flex flex-wrap gap-1">
                {availableTickers.slice(0, showAllTickers ? availableTickers.length : 10).map((ticker) => (
                  <Button
                    key={ticker}
                    variant={selectedTickers.includes(ticker) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTickerToggle(ticker)}
                    className="h-7 px-2 text-xs"
                  >
                    {ticker}
                  </Button>
                ))}
                {availableTickers.length > 10 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllTickers(!showAllTickers)}
                    className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                  >
                    {showAllTickers ? 'Show less' : `+${availableTickers.length - 10} more`}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Source Filter */}
          {availableSources.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Sources:</span>
              <div className="flex flex-wrap gap-1">
                {availableSources.slice(0, showAllSources ? availableSources.length : 5).map((source) => (
                  <Button
                    key={source}
                    variant={selectedSources.includes(source) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSourceToggle(source)}
                    className="h-7 px-2 text-xs"
                  >
                    {source}
                  </Button>
                ))}
                {availableSources.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllSources(!showAllSources)}
                    className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                  >
                    {showAllSources ? 'Show less' : `+${availableSources.length - 5} more`}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Clear Filters */}
          {(selectedTickers.length > 0 || selectedSources.length > 0 || searchQuery) && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearAllFilters}
              className="flex items-center gap-2 h-7"
            >
              <X className="h-3 w-3" />
              Clear All
            </Button>
          )}
        </div>

        {/* Results Count and Pagination Controls */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''} found
          </span>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="h-7 px-2"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="h-7 px-2"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* News Feed */}
      <div className="space-y-4 animate-slide-up" style={{ '--delay': '300ms' } as React.CSSProperties}>
        {!connectionState.isConnected ? (
          <Card className="p-12 text-center">
            <div className="text-muted-foreground">
              <WifiOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Connecting to news feed...</p>
              <p>Establishing real-time connection to news service.</p>
            </div>
          </Card>
        ) : !hasStocks ? (
          <Card className="p-12 text-center">
            <div className="text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No stocks in watchlist</p>
              <p>Add stocks to your watchlist to receive personalized news updates.</p>
              <Button className="mt-4" onClick={() => navigate('/dashboard/stocks')}>
                Go to Stocks Page
              </Button>
            </div>
          </Card>
        ) : paginatedArticles.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-muted-foreground">
              <NewspaperIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {allArticles.length === 0 ? 'Loading news...' : 'No news found'}
              </p>
              <p>
                {allArticles.length === 0 
                  ? 'Fetching the latest news for your watchlist stocks.'
                  : 'Try adjusting your search terms or filters.'
                }
              </p>
              {allArticles.length === 0 && connectionState.subscribedTickers.size > 0 && (
                <div className="mt-4">
                  <div className="flex justify-center">
                    <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                  </div>
                  <p className="text-sm mt-2">
                    Subscribed to: {Array.from(connectionState.subscribedTickers).join(', ')}
                  </p>
                </div>
              )}
            </div>
          </Card>
        ) : (
          paginatedArticles.map((article, index) => (
            <Card 
              key={article.id} 
              className={cn(
                "overflow-hidden transition-all duration-200 hover:shadow-lg cursor-pointer group border-l-4 border-l-transparent hover:border-l-primary",
                "animate-slide-up"
              )}
              style={{ '--delay': `${400 + index * 50}ms` } as React.CSSProperties}
              onClick={() => handleNewsClick(article)}
            >
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row">
                  {/* Thumbnail Image from serpapi_thumbnail */}
                  {article.imageUrl && (
                    <div className="lg:w-64 lg:flex-shrink-0">
                      <div className="h-48 lg:h-full relative overflow-hidden">
                        <img 
                          src={article.imageUrl} 
                          alt={article.title}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            // Hide image if it fails to load
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                          {article.title}
                        </h2>
                        <p className="text-muted-foreground mb-4 line-clamp-3">
                          {article.summary}
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground ml-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    
                    {/* Enhanced Metadata */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDate(article.publishedAt)}
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Source icon if available */}
                          {article.source && (
                            <span className="text-sm font-medium text-primary">
                              {article.source}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Related Symbols */}
                      {article.relatedSymbols && article.relatedSymbols.length > 0 && (
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-3 w-3 text-muted-foreground" />
                          <div className="flex gap-1">
                            {article.relatedSymbols.map((symbol) => (
                              <Badge 
                                key={symbol} 
                                variant="outline" 
                                className="text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                              >
                                {symbol}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              if (pageNum > totalPages) return null;
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Connection Status Footer */}
      {paginatedArticles.length > 0 && (
        <div className="text-center mt-8">
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-green-500" />
              <span>Live updates enabled</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span>Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredArticles.length)} of {filteredArticles.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}