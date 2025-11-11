import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNewsWebSocket } from '@/contexts/NewsWebSocketContext';
import { useStockWatchlist } from '@/hooks/useStockWatchlist';
import { useGlobalAlerts } from '@/contexts/GlobalAlertsContext';
import alertExamples from '@/lib/alertExamples';
import { formatDate, formatTimestamp } from '@/utils/stocksApi';
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
  ChevronRight,
  Bell,
  AlertTriangle,
  TrendingDown
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
  
  // Market Alert States - Load from localStorage on mount
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    type: 'critical' | 'warning' | 'info';
    title: string;
    message: string;
    affectedSymbols: string[];
    timestamp: string;
    impact: 'high' | 'medium' | 'low';
    category: string;
    read: boolean;
    sourceUrl?: string;
  }>>(() => {
    try {
      const savedAlerts = localStorage.getItem('marketAlerts');
      return savedAlerts ? JSON.parse(savedAlerts) : [];
    } catch (error) {
      console.error('Failed to load alerts from localStorage:', error);
      return [];
    }
  });
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [showAlertHistory, setShowAlertHistory] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<typeof alerts[0] | null>(() => {
    try {
      const savedSelectedAlert = localStorage.getItem('marketAlerts_selectedAlert');
      return savedSelectedAlert ? JSON.parse(savedSelectedAlert) : null;
    } catch (error) {
      return null;
    }
  });
  const [showAlertBanner, setShowAlertBanner] = useState(() => {
    try {
      const savedBannerState = localStorage.getItem('marketAlerts_showBanner');
      return savedBannerState === 'true';
    } catch (error) {
      return false;
    }
  });
  
  // Alert counter for sequential rotation - persist across page navigation
  const [alertCounter, setAlertCounter] = useState(() => {
    try {
      const savedCounter = localStorage.getItem('marketAlerts_counter');
      return savedCounter ? parseInt(savedCounter, 10) : 0;
    } catch (error) {
      return 0;
    }
  });
  
  // Persist alert counter
  useEffect(() => {
    try {
      localStorage.setItem('marketAlerts_counter', String(alertCounter));
    } catch (error) {
      console.error('Failed to save alert counter to localStorage:', error);
    }
  }, [alertCounter]);
  
  // Demo mode states for auto-generating alerts - persist across page navigation
  const [isDemoMode, setIsDemoMode] = useState(() => {
    try {
      const savedDemoMode = localStorage.getItem('marketAlerts_demoMode');
      return savedDemoMode === 'true';
    } catch (error) {
      return false;
    }
  });
  const [demoTimeRemaining, setDemoTimeRemaining] = useState(() => {
    try {
      const savedTime = localStorage.getItem('marketAlerts_demoTimeRemaining');
      return savedTime ? parseInt(savedTime, 10) : 0;
    } catch (error) {
      return 0;
    }
  });
  
  // Persist alerts to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('marketAlerts', JSON.stringify(alerts));
    } catch (error) {
      console.error('Failed to save alerts to localStorage:', error);
    }
  }, [alerts]);
  
  // Persist banner visibility
  useEffect(() => {
    try {
      localStorage.setItem('marketAlerts_showBanner', String(showAlertBanner));
    } catch (error) {
      console.error('Failed to save banner state to localStorage:', error);
    }
  }, [showAlertBanner]);
  
  // Persist selected alert
  useEffect(() => {
    try {
      if (selectedAlert) {
        localStorage.setItem('marketAlerts_selectedAlert', JSON.stringify(selectedAlert));
      } else {
        localStorage.removeItem('marketAlerts_selectedAlert');
      }
    } catch (error) {
      console.error('Failed to save selected alert to localStorage:', error);
    }
  }, [selectedAlert]);
  
  // Persist demo mode state
  useEffect(() => {
    try {
      localStorage.setItem('marketAlerts_demoMode', String(isDemoMode));
    } catch (error) {
      console.error('Failed to save demo mode to localStorage:', error);
    }
  }, [isDemoMode]);
  
  // Persist demo time remaining
  useEffect(() => {
    try {
      localStorage.setItem('marketAlerts_demoTimeRemaining', String(demoTimeRemaining));
    } catch (error) {
      console.error('Failed to save demo time to localStorage:', error);
    }
  }, [demoTimeRemaining]);
  
  // Auto-start demo mode on first load (only once)
  useEffect(() => {
    // Check if demo mode has ever been started
    const demoStartTime = localStorage.getItem('marketAlerts_demoStartTime');
    
    console.log('🔍 Demo mode check:', {
      demoStartTime,
      hasStartTime: !!demoStartTime,
      currentTime: Date.now()
    });
    
    if (!demoStartTime) {
      // First time - start demo mode
      const startTime = Date.now();
      console.log('✅ Starting demo mode for the first time at:', startTime);
      localStorage.setItem('marketAlerts_demoStartTime', String(startTime));
      setIsDemoMode(true);
      setDemoTimeRemaining(60);
      
      // Generate first alert immediately
      setTimeout(() => {
        console.log('🔔 Generating first alert');
        triggerMockAlert();
      }, 100);
    } else {
      // Demo was already started, check if it's still active
      const startTime = parseInt(demoStartTime, 10);
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(60 - elapsed, 0);
      
      console.log('⏰ Demo mode was already started:', {
        startTime,
        elapsed,
        remaining,
        isExpired: remaining <= 0
      });
      
      if (remaining > 0) {
        console.log('▶️ Resuming demo mode with', remaining, 'seconds remaining');
        setIsDemoMode(true);
        setDemoTimeRemaining(remaining);
      } else {
        console.log('⏹️ Demo mode expired, resetting for next visit');
        // Demo expired - clear it so it can restart on next fresh visit
        localStorage.removeItem('marketAlerts_demoStartTime');
        setIsDemoMode(false);
        setDemoTimeRemaining(0);
      }
    }
  }, []); // Run only once on mount

  // Demo mode effect: auto-generate alerts and countdown timer (works across page navigation)
  useEffect(() => {
    if (!isDemoMode) {
      console.log('⏸️ Demo mode is not active');
      return;
    }

    const demoStartTime = parseInt(localStorage.getItem('marketAlerts_demoStartTime') || '0', 10);
    console.log('🎬 Demo mode effect running, start time:', demoStartTime);
    
    // Alert generation interval (every 15 seconds)
    const alertInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - demoStartTime) / 1000);
      console.log('⏱️ Alert interval check - elapsed:', elapsed, 'seconds');
      if (elapsed < 60) {
        console.log('🔔 Generating alert at', elapsed, 'seconds');
        triggerMockAlert();
      } else {
        console.log('⏹️ Alert generation stopped - time expired');
      }
    }, 15000); // 15 seconds

    // Countdown timer (every second)
    const countdownInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - demoStartTime) / 1000);
      const remaining = Math.max(60 - elapsed, 0);
      
      setDemoTimeRemaining(remaining);
      
      if (remaining <= 0) {
        // Time's up, stop demo mode
        console.log('🛑 Demo mode finished - 60 seconds elapsed');
        setIsDemoMode(false);
        localStorage.removeItem('marketAlerts_demoStartTime');
      }
    }, 1000);

    // Cleanup intervals when component unmounts (but intervals will restart on remount)
    return () => {
      console.log('🧹 Cleaning up demo mode intervals');
      clearInterval(alertInterval);
      clearInterval(countdownInterval);
    };
  }, [isDemoMode]);
  
  // Get stocks from watchlist to subscribe to news
  const { watchedSymbols, hasStocks } = useStockWatchlist();
  
  // Global alerts context for cross-page high-impact alerts
  const { addAlert: addGlobalAlert } = useGlobalAlerts();
  
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
        subscribe(watchedSymbols, { limit: 100, days_back: 90 }); // Increased limit for pagination, 3 months of news
      }
    }
  }, [connectionState.isConnected, hasStocks, watchedSymbols, subscribe, isSubscribedTo, connectionState.subscribedTickers]);

  // Get all articles and extract available tickers and sources
  const allArticles = getAllArticles();
  
  // Debug ticker statuses
  useEffect(() => {
    console.log('📊 Ticker Statuses:', tickerStatuses);
    console.log('📊 Subscribed Tickers:', Array.from(connectionState.subscribedTickers));
    console.log('📊 All Articles Count:', allArticles.length);
  }, [tickerStatuses, connectionState.subscribedTickers, allArticles.length]);
  
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
    const filtered = allArticles.filter(article => {
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

    // Sort by publish_date timestamp (newest first)
    return filtered.sort((a, b) => {
      try {
        const dateA = new Date(a.publish_date || a.publishedAt || 0);
        const dateB = new Date(b.publish_date || b.publishedAt || 0);
        return dateB.getTime() - dateA.getTime(); // Descending order (newest first)
      } catch (error) {
        return 0; // Keep original order if parsing fails
      }
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

  // Mock Alert Trigger (for testing - will be replaced with real WebSocket/API)
  const triggerMockAlert = () => {
    console.log('🚨 triggerMockAlert called at', new Date().toISOString());
    
    // Use functional update to get current counter and increment atomically
    setAlertCounter(prevCounter => {
      const currentIndex = prevCounter % alertExamples.length;
      const selectedExample = alertExamples[currentIndex];
      
      // Create alert with fresh timestamp and ID, preserving sourceUrl
      const newAlert = {
        ...selectedExample,
        id: `alert-${Date.now()}-${currentIndex}`,
        type: selectedExample.type as 'critical' | 'warning' | 'info',
        timestamp: new Date().toISOString(),
        impact: selectedExample.impact as 'high' | 'medium' | 'low',
        read: false,
        sourceUrl: selectedExample.sourceUrl // Explicitly preserve sourceUrl
      };
      
      console.log('📢 Generated alert:', newAlert.title, 'Index:', currentIndex, '/', alertExamples.length, 'sourceUrl:', newAlert.sourceUrl);
      
      // Add to local alerts for News page history
      setAlerts(prev => [newAlert, ...prev]);
      setShowAlertBanner(true);
      setSelectedAlert(newAlert);
      
      // Add to global alerts context for cross-page display (if high impact)
      if (newAlert.impact === 'high') {
        console.log('🌍 Adding to global alerts (high impact)');
        addGlobalAlert(newAlert);
      }
      
      // Return incremented counter for next time
      return prevCounter + 1;
    });
  };

  const handleAlertClick = (alert: typeof alerts[0]) => {
    setSelectedAlert(alert);
    setShowAlertDialog(true);
    
    // Mark as read
    setAlerts(prev => prev.map(a => 
      a.id === alert.id ? { ...a, read: true } : a
    ));
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
    if (selectedAlert?.id === alertId) {
      setShowAlertDialog(false);
      setSelectedAlert(null);
    }
  };

  const unreadAlertsCount = alerts.filter(a => !a.read).length;


  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      {/* Modern Compact Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <NewspaperIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Value Your Next News</h1>
              <p className="text-sm text-muted-foreground">Real-time market insights</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Alert Bell Icon */}
            <div className="relative">
              <Popover open={showAlertHistory} onOpenChange={setShowAlertHistory}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "relative h-9 w-9 p-0 rounded-full transition-all",
                      unreadAlertsCount > 0 && "border-orange-500 bg-orange-50 hover:bg-orange-100"
                    )}
                  >
                    <Bell className={cn(
                      "h-4 w-4",
                      unreadAlertsCount > 0 ? "text-orange-600 animate-pulse" : "text-muted-foreground"
                    )} />
                    {unreadAlertsCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center ring-2 ring-background">
                        {unreadAlertsCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-0" align="end">
                  <div className="border-b p-4">
                    <h3 className="font-semibold text-sm">Market Alerts</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {alerts.length === 0 ? 'No alerts' : `${alerts.length} total, ${unreadAlertsCount} unread`}
                    </p>
                  </div>
                  <ScrollArea className="h-[400px]">
                    {alerts.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No market alerts</p>
                      </div>
                    ) : (
                      <div className="p-2">
                        {alerts.map((alert, index) => (
                          <div
                            key={alert.id}
                            className={cn(
                              "p-3 rounded-lg mb-2 cursor-pointer transition-all hover:bg-accent border",
                              !alert.read && "bg-orange-50 border-orange-200",
                              alert.read && "border-transparent"
                            )}
                            onClick={() => {
                              handleAlertClick(alert);
                              setShowAlertHistory(false);
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "p-1.5 rounded-full mt-0.5",
                                alert.type === 'critical' && "bg-red-100",
                                alert.type === 'warning' && "bg-orange-100",
                                alert.type === 'info' && "bg-blue-100"
                              )}>
                                {alert.type === 'critical' && <AlertTriangle className="h-3.5 w-3.5 text-red-600" />}
                                {alert.type === 'warning' && <AlertCircle className="h-3.5 w-3.5 text-orange-600" />}
                                {alert.type === 'info' && <Bell className="h-3.5 w-3.5 text-blue-600" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-medium line-clamp-1">{alert.title}</p>
                                  {!alert.read && (
                                    <div className="h-2 w-2 rounded-full bg-orange-500 flex-shrink-0 mt-1" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                  {alert.message}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {alert.category}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(alert.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  {alerts.length > 0 && (
                    <div className="border-t p-2 space-y-1">
                      {unreadAlertsCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => {
                            setAlerts(prev => prev.map(a => ({ ...a, read: true })));
                          }}
                        >
                          Mark All as Read ({unreadAlertsCount})
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-destructive hover:text-destructive"
                        onClick={() => {
                          setAlerts([]);
                          setShowAlertHistory(false);
                        }}
                      >
                        Clear All Alerts
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Connection Badge */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              connectionState.isConnected 
                ? "bg-green-50 text-green-700 border border-green-200" 
                : "bg-red-50 text-red-700 border border-red-200"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full",
                connectionState.isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
              )} />
              {connectionState.isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </div>
        
        {/* Stats Bar */}
        <div className="flex items-center gap-6 text-sm text-muted-foreground bg-muted/30 rounded-lg px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="font-medium">{Array.from(connectionState.subscribedTickers).length}</span>
            <span>subscription{Array.from(connectionState.subscribedTickers).length !== 1 ? 's' : ''}</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <NewspaperIcon className="h-4 w-4" />
            <span className="font-medium">{allArticles.length}</span>
            <span>article{allArticles.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Modern Error Display */}
      {lastError && (
        <div className="mb-6 animate-slide-up">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-1 bg-red-100 rounded-full">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-red-900 mb-1">Connection Error</h4>
                  <p className="text-sm text-red-700">{lastError.message}</p>
                </div>
              </div>
              <Button onClick={clearError} variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-red-100">
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Market Alert Banner */}
      {showAlertBanner && selectedAlert && (
        <div className="mb-6 animate-slide-down">
          <div className={cn(
            "border-2 rounded-lg p-4 shadow-lg",
            selectedAlert.type === 'critical' && "bg-gradient-to-r from-red-50 to-orange-50 border-red-300",
            selectedAlert.type === 'warning' && "bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-300",
            selectedAlert.type === 'info' && "bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-300"
          )}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className={cn(
                  "p-2 rounded-full mt-0.5",
                  selectedAlert.type === 'critical' && "bg-red-100",
                  selectedAlert.type === 'warning' && "bg-orange-100",
                  selectedAlert.type === 'info' && "bg-blue-100"
                )}>
                  {selectedAlert.type === 'critical' ? (
                    <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />
                  ) : selectedAlert.type === 'warning' ? (
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  ) : (
                    <Bell className="h-5 w-5 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={cn(
                      "text-sm font-bold",
                      selectedAlert.type === 'critical' && "text-red-900",
                      selectedAlert.type === 'warning' && "text-orange-900",
                      selectedAlert.type === 'info' && "text-blue-900"
                    )}>
                      {selectedAlert.title}
                    </h4>
                    <Badge variant="outline" className={cn(
                      "text-xs",
                      selectedAlert.impact === 'high' && "bg-red-100 text-red-700 border-red-300",
                      selectedAlert.impact === 'medium' && "bg-orange-100 text-orange-700 border-orange-300",
                      selectedAlert.impact === 'low' && "bg-yellow-100 text-yellow-700 border-yellow-300"
                    )}>
                      {selectedAlert.impact.toUpperCase()} IMPACT
                    </Badge>
                  </div>
                  <p className={cn(
                    "text-sm mb-2",
                    selectedAlert.type === 'critical' && "text-red-800",
                    selectedAlert.type === 'warning' && "text-orange-800",
                    selectedAlert.type === 'info' && "text-blue-800"
                  )}>
                    {selectedAlert.message}
                  </p>
                  {selectedAlert.affectedSymbols.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-muted-foreground">Affected:</span>
                      {selectedAlert.affectedSymbols.map(symbol => (
                        <Badge key={symbol} variant="secondary" className="text-xs">
                          {symbol}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAlertClick(selectedAlert)}
                  className="h-8"
                >
                  View Details
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAlertBanner(false);
                    setSelectedAlert(null);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Stocks Info Banner */}
      {!hasStocks && (
        <div className="mb-6 animate-slide-up">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">Get Started</h4>
                <p className="text-sm text-blue-700 mb-3">
                  Add stocks to your watchlist to receive personalized, real-time news updates.
                </p>
                <Button size="sm" onClick={() => navigate('/dashboard/stocks')} className="bg-blue-600 hover:bg-blue-700">
                  Browse Stocks
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Search and Filters */}
      <div className="space-y-4 mb-6">
        {/* Search Bar - Full Width, Modern Design */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input
            placeholder="Search news titles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 pr-12 h-12 text-base border-2 focus:border-primary rounded-xl shadow-sm"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted rounded-lg"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filter Pills - Modern Chip Design */}
        <div className="space-y-3">
          {/* Ticker Filter Pills */}
          {availableTickers.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">
                Tickers
              </span>
              {availableTickers.slice(0, showAllTickers ? availableTickers.length : 10).map((ticker) => (
                <button
                  key={ticker}
                  onClick={() => handleTickerToggle(ticker)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                    "border-2 hover:scale-105 active:scale-95",
                    selectedTickers.includes(ticker)
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background border-border hover:border-primary/50 hover:bg-muted"
                  )}
                >
                  {ticker}
                </button>
              ))}
              {availableTickers.length > 10 && (
                <button
                  onClick={() => setShowAllTickers(!showAllTickers)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border-2 border-dashed border-muted-foreground/30"
                >
                  {showAllTickers ? 'Show less' : `+${availableTickers.length - 10} more`}
                </button>
              )}
            </div>
          )}

          {/* Source Filter Pills */}
          {availableSources.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">
                Sources
              </span>
              {availableSources.slice(0, showAllSources ? availableSources.length : 5).map((source) => (
                <button
                  key={source}
                  onClick={() => handleSourceToggle(source)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                    "border-2 hover:scale-105 active:scale-95",
                    selectedSources.includes(source)
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background border-border hover:border-primary/50 hover:bg-muted"
                  )}
                >
                  {source}
                </button>
              ))}
              {availableSources.length > 5 && (
                <button
                  onClick={() => setShowAllSources(!showAllSources)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border-2 border-dashed border-muted-foreground/30"
                >
                  {showAllSources ? 'Show less' : `+${availableSources.length - 5} more`}
                </button>
              )}
            </div>
          )}

          {/* Clear Filters Button */}
          {(selectedTickers.length > 0 || selectedSources.length > 0 || searchQuery) && (
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearAllFilters}
                className="flex items-center gap-2 rounded-full border-2 hover:border-destructive hover:text-destructive"
              >
                <X className="h-3 w-3" />
                Clear All Filters
              </Button>
            </div>
          )}
        </div>

        {/* Results Count and Pagination - Modern Design */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm font-medium text-muted-foreground">
            <span className="text-foreground font-semibold">{filteredArticles.length}</span> {filteredArticles.length === 1 ? 'article' : 'articles'}
          </span>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0 rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-2">
                <span className="text-primary">{currentPage}</span>
                <span className="text-muted-foreground"> / {totalPages}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0 rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modern News Feed */}
      <div className="space-y-4" style={{ '--delay': '300ms' } as React.CSSProperties}>
        {/* Scraping Status Banner - Show when tickers are being fetched */}
        {(() => {
          const subscribedTickers = Array.from(connectionState.subscribedTickers);
          const tickersBeingFetched = subscribedTickers.filter(ticker => {
            const status = tickerStatuses[ticker];
            console.log(`🔍 Banner check - Ticker ${ticker}:`, status);
            // Only show tickers that are actively being processed/fetched
            return status && (status.status === 'processing' || status.status === 'fetching');
          });
          
          // If no specific tickers have status yet, check if we just subscribed and have no articles
          const hasNoArticlesForTicker = subscribedTickers.some(ticker => {
            const tickerArticles = allArticles.filter(article => 
              article.relatedSymbols && article.relatedSymbols.includes(ticker)
            );
            return tickerArticles.length === 0;
          });
          
          console.log('🎯 Banner render check:', {
            subscribedTickers,
            tickerStatuses,
            tickersBeingFetched,
            hasNoArticlesForTicker,
            shouldShowBanner: tickersBeingFetched.length > 0
          });
          
          if (tickersBeingFetched.length > 0) {
            console.log('✅ Rendering scraping banner for:', tickersBeingFetched);
            return (
              <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-blue-900 mb-1">
                        Screening News for Your Stocks
                      </h4>
                      <p className="text-sm text-blue-700 mb-3">
                        We're currently scraping news articles for {tickersBeingFetched.join(', ')}. New articles will appear automatically as they're found.
                      </p>
                      <div className="space-y-2">
                        {tickersBeingFetched.map(ticker => {
                          const status = tickerStatuses[ticker];
                          return (
                            <div key={ticker} className="flex items-center gap-2 text-xs text-blue-600">
                              <Activity className="h-3 w-3 animate-pulse" />
                              <span className="font-medium">{ticker}</span>
                              {status?.message && <span className="text-blue-500">- {status.message}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }
          return null;
        })()}
        
        {!connectionState.isConnected ? (
          <Card className="p-16 text-center border-2 border-dashed">
            <div className="text-muted-foreground max-w-md mx-auto">
              <div className="inline-flex p-4 bg-muted rounded-full mb-4">
                <WifiOff className="h-8 w-8 opacity-50" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Connecting to News Feed</h3>
              <p className="text-sm">Establishing real-time connection to news service...</p>
            </div>
          </Card>
        ) : paginatedArticles.length === 0 ? (
          <Card className="p-16 text-center border-2 border-dashed">
            <div className="text-muted-foreground max-w-md mx-auto">
              {(() => {
                // Check if any tickers are being fetched/processed
                const subscribedTickers = Array.from(connectionState.subscribedTickers);
                console.log('🔍 Checking ticker statuses for empty state:', {
                  subscribedTickers,
                  tickerStatuses,
                  allArticlesLength: allArticles.length
                });
                
                const tickersBeingFetched = subscribedTickers.filter(ticker => {
                  const status = tickerStatuses[ticker];
                  console.log(`🔍 Ticker ${ticker} status:`, status);
                  return status && (status.status === 'processing' || status.status === 'fetching');
                });
                
                const isScrapingNews = tickersBeingFetched.length > 0;
                console.log('🔍 Is scraping news?', isScrapingNews, 'Tickers being fetched:', tickersBeingFetched);
                
                // Check if watchlist is empty
                const noStocksInWatchlist = !hasStocks || watchedSymbols.length === 0;
                
                return (
                  <>
                    <div className="inline-flex p-4 bg-muted rounded-full mb-4">
                      {noStocksInWatchlist ? (
                        <TrendingUp className="h-8 w-8 text-primary" />
                      ) : allArticles.length === 0 || isScrapingNews ? (
                        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                      ) : (
                        <NewspaperIcon className="h-8 w-8 opacity-50" />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-foreground">
                      {noStocksInWatchlist
                        ? 'No Stocks in Watchlist'
                        : isScrapingNews 
                          ? 'Screening News for Your Stocks' 
                          : allArticles.length === 0 
                            ? 'Loading News' 
                            : 'No News Found'}
                    </h3>
                    <p className="text-sm">
                      {noStocksInWatchlist
                        ? 'Add stocks to your watchlist to receive personalized news updates'
                        : isScrapingNews
                          ? `We're currently scraping news articles for ${tickersBeingFetched.join(', ')}. This may take a moment...`
                          : allArticles.length === 0 
                            ? 'Fetching the latest news for your watchlist stocks...'
                            : 'Try adjusting your search terms or filters.'
                      }
                    </p>
                    {noStocksInWatchlist && (
                      <Button onClick={() => navigate('/dashboard/stocks')} className="mt-4">
                        Browse Stocks
                      </Button>
                    )}
                    {isScrapingNews && tickersBeingFetched.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {tickersBeingFetched.map(ticker => {
                          const status = tickerStatuses[ticker];
                          return (
                            <div key={ticker} className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                              <Activity className="h-3 w-3 animate-pulse text-primary" />
                              <span className="font-medium">{ticker}</span>
                              {status?.message && <span>- {status.message}</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {allArticles.length === 0 && connectionState.subscribedTickers.size > 0 && !isScrapingNews && (
                      <p className="text-xs mt-3 text-muted-foreground">
                        Subscribed to: <span className="font-medium">{subscribedTickers.join(', ')}</span>
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          </Card>
        ) : (
          paginatedArticles.map((article, index) => (
            <Card 
              key={article.id} 
              className={cn(
                "overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer group",
                "border-l-4 border-l-transparent hover:border-l-primary",
                "bg-gradient-to-r from-background to-background hover:from-muted/20",
                "animate-slide-up"
              )}
              style={{ '--delay': `${400 + index * 50}ms` } as React.CSSProperties}
              onClick={() => handleNewsClick(article)}
            >
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  {/* Enhanced Thumbnail with Fallback */}
                  {article.imageUrl ? (
                    <div className="md:w-72 md:flex-shrink-0 relative overflow-hidden bg-muted">
                      <div className="aspect-video md:aspect-auto md:h-full relative">
                        <img 
                          src={article.imageUrl} 
                          alt={article.title}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.onerror = null;
                            // Replace with gradient fallback
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('.fallback-gradient')) {
                              const fallback = document.createElement('div');
                              fallback.className = 'fallback-gradient absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center';
                              fallback.innerHTML = '<svg class="h-12 w-12 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>';
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                        {/* Overlay gradient for better text readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    </div>
                  ) : (
                    <div className="md:w-72 md:flex-shrink-0 bg-gradient-to-br from-primary/10 to-primary/5 hidden md:flex items-center justify-center">
                      <NewspaperIcon className="h-16 w-16 text-primary/30" />
                    </div>
                  )}
                  
                  {/* Enhanced Content */}
                  <div className="flex-1 p-6 flex flex-col justify-between min-h-[200px]">
                    {/* Title and Summary */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h2 className="text-xl font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                          {article.title}
                        </h2>
                        <div className="flex-shrink-0 p-2 rounded-full bg-muted/50 group-hover:bg-primary/10 transition-colors">
                          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                      
                      <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-4">
                        {article.serpapi_snippet || article.summary}
                      </p>
                    </div>
                    
                    {/* Enhanced Metadata Section */}
                    <div className="space-y-3 pt-3 border-t">
                      {/* Top Row: Time and Source */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="font-medium">
                            {article.publish_date 
                              ? formatTimestamp(article.publish_date)
                              : formatDate(article.publishedAt)}
                          </span>
                        </div>
                        
                        {article.source && (
                          <>
                            <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                            <span className="font-semibold text-primary text-sm">{article.source}</span>
                          </>
                        )}
                        
                        {article.search_category && (
                          <>
                            <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                            <span className="text-muted-foreground text-xs capitalize">{article.search_category}</span>
                          </>
                        )}
                        
                        {article.word_count && (
                          <>
                            <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                            <span className="text-muted-foreground text-xs">{article.word_count} words</span>
                          </>
                        )}
                      </div>
                      
                      {/* Bottom Row: Related Symbols */}
                      {article.relatedSymbols && article.relatedSymbols.length > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <TrendingUp className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">Related:</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {article.relatedSymbols.map((symbol) => (
                              <Badge 
                                key={symbol} 
                                variant="secondary"
                                className="text-xs font-semibold px-2 py-0.5 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
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

      {/* Enhanced Bottom Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 p-4 bg-muted/30 rounded-lg border">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-2 rounded-lg"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let pageNum;
              
              if (totalPages <= 7) {
                // Show all pages if 7 or fewer
                pageNum = i + 1;
              } else if (currentPage <= 4) {
                // Near the start
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 3) {
                // Near the end
                pageNum = totalPages - 6 + i;
              } else {
                // In the middle
                pageNum = currentPage - 3 + i;
              }
              
              if (pageNum > totalPages || pageNum < 1) return null;
              
              // Add ellipsis
              if (totalPages > 7) {
                if (i === 0 && currentPage > 4) {
                  return (
                    <React.Fragment key="start-ellipsis">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        className="w-9 h-9 p-0 rounded-lg"
                      >
                        1
                      </Button>
                      <span className="text-muted-foreground px-1">...</span>
                    </React.Fragment>
                  );
                }
                if (i === 6 && currentPage < totalPages - 3) {
                  return (
                    <React.Fragment key="end-ellipsis">
                      <span className="text-muted-foreground px-1">...</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        className="w-9 h-9 p-0 rounded-lg"
                      >
                        {totalPages}
                      </Button>
                    </React.Fragment>
                  );
                }
                if ((i === 0 && currentPage > 4) || (i === 6 && currentPage < totalPages - 3)) {
                  return null;
                }
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className={cn(
                    "w-9 h-9 p-0 rounded-lg transition-all",
                    currentPage === pageNum && "shadow-md"
                  )}
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
            className="flex items-center gap-2 rounded-lg"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Modern Connection Status Footer */}
      {paginatedArticles.length > 0 && (
        <div className="text-center mt-8 pb-4">
          <div className="inline-flex items-center gap-6 px-6 py-3 bg-gradient-to-r from-muted/50 to-muted/30 rounded-full border text-sm">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Wifi className="h-4 w-4 text-green-600" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              <span className="font-medium text-muted-foreground">Live Updates Active</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2 text-muted-foreground">
              <Activity className="h-4 w-4" />
              <span>Showing <span className="font-semibold text-foreground">{startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredArticles.length)}</span> of <span className="font-semibold text-foreground">{filteredArticles.length}</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Alert Details Dialog */}
      <Dialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAlert?.type === 'critical' && (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              {selectedAlert?.type === 'warning' && (
                <AlertCircle className="h-5 w-5 text-orange-600" />
              )}
              {selectedAlert?.type === 'info' && (
                <Bell className="h-5 w-5 text-blue-600" />
              )}
              {selectedAlert?.title}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              {selectedAlert && new Date(selectedAlert.timestamp).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          
          {selectedAlert && (
            <div className="space-y-4">
              {/* Impact and Category Badges */}
              <div className="flex gap-2">
                <Badge variant="outline" className={cn(
                  "text-xs font-medium",
                  selectedAlert.impact === 'high' && "bg-red-100 text-red-700 border-red-300",
                  selectedAlert.impact === 'medium' && "bg-orange-100 text-orange-700 border-orange-300",
                  selectedAlert.impact === 'low' && "bg-yellow-100 text-yellow-700 border-yellow-300"
                )}>
                  {selectedAlert.impact.toUpperCase()} IMPACT
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {selectedAlert.category}
                </Badge>
              </div>

              {/* Alert Message */}
              <div className={cn(
                "p-4 rounded-lg border-2",
                selectedAlert.type === 'critical' && "bg-red-50 border-red-200",
                selectedAlert.type === 'warning' && "bg-orange-50 border-orange-200",
                selectedAlert.type === 'info' && "bg-blue-50 border-blue-200"
              )}>
                <p className={cn(
                  "text-sm leading-relaxed",
                  selectedAlert.type === 'critical' && "text-red-900",
                  selectedAlert.type === 'warning' && "text-orange-900",
                  selectedAlert.type === 'info' && "text-blue-900"
                )}>
                  {selectedAlert.message}
                </p>
              </div>

              {/* Source URL */}
              {selectedAlert.sourceUrl && (
                <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg border">
                  <ExternalLink className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-1">SOURCE:</p>
                    <a
                      href={selectedAlert.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline break-all"
                    >
                      {selectedAlert.sourceUrl}
                    </a>
                  </div>
                </div>
              )}

              {/* Affected Symbols */}
              {selectedAlert.affectedSymbols.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Affected Symbols</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedAlert.affectedSymbols.map(symbol => (
                      <Badge 
                        key={symbol} 
                        variant="secondary" 
                        className="text-sm px-3 py-1 cursor-pointer hover:bg-secondary/80"
                        onClick={() => {
                          setSelectedTickers([symbol]);
                          setShowAlertDialog(false);
                        }}
                      >
                        {symbol}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Actions */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Recommended Actions
                </h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Review your portfolio exposure to affected symbols</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Monitor related news articles for further developments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Consider adjusting positions based on your risk tolerance</span>
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between gap-2 pt-2 border-t">
                <div className="flex gap-2">
                  {selectedAlert.sourceUrl && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(selectedAlert.sourceUrl, '_blank', 'noopener,noreferrer')}
                      className="gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Go to News
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => dismissAlert(selectedAlert.id)}
                  >
                    Dismiss
                  </Button>
                  {selectedAlert.affectedSymbols.length > 0 && (
                    <Button
                      variant="default"
                      onClick={() => {
                        setSelectedTickers(selectedAlert.affectedSymbols);
                        setShowAlertDialog(false);
                      }}
                    >
                      Filter by Affected Symbols
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}