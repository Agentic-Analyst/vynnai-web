/**
 * News WebSocket Test Component
 * 
 * A test component to verify the news WebSocket integration works correctly
 * with the deployed API at https://api.vynnai.com
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNewsWebSocket } from '@/contexts/NewsWebSocketContext';
import { cn } from '@/lib/utils';
import {
  Wifi,
  WifiOff,
  Radio,
  Newspaper,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  RefreshCw,
  X
} from 'lucide-react';

export function NewsWebSocketTest() {
  const {
    connectionState,
    getAllArticles,
    subscribe,
    unsubscribe,
    refresh,
    connect,
    disconnect,
    clearError,
    lastError,
    tickerStatuses,
    subscriptionStats
  } = useNewsWebSocket();

  // Get articles using the function instead of direct state
  const allArticles = getAllArticles();

  const [testTicker, setTestTicker] = useState('AAPL');
  const [testTickers, setTestTickers] = useState('AAPL,MSFT,GOOGL');

  const handleSingleSubscribe = () => {
    if (testTicker.trim()) {
      subscribe([testTicker.trim().toUpperCase()]);
    }
  };

  const handleMultiSubscribe = () => {
    if (testTickers.trim()) {
      const tickers = testTickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
      subscribe(tickers, { force_refresh: true }); // Force refresh for testing
    }
  };

  const handleUnsubscribeAll = () => {
    unsubscribe();
  };

  const handleRefreshAll = () => {
    refresh();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <Wifi className="h-4 w-4 text-green-500" />;
      case 'connecting': return <Radio className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'disconnected': return <WifiOff className="h-4 w-4 text-gray-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Radio className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTickerStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'processing': return <Activity className="h-3 w-3 text-blue-500 animate-pulse" />;
      case 'fetching': return <RefreshCw className="h-3 w-3 text-yellow-500 animate-spin" />;
      case 'error': return <AlertCircle className="h-3 w-3 text-red-500" />;
      default: return <Clock className="h-3 w-3 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Newspaper className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">News WebSocket Test</h1>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(connectionState.connectionStatus)}
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge 
                variant={connectionState.isConnected ? "default" : "secondary"}
                className={cn(
                  connectionState.isConnected ? "bg-green-500" : "",
                  connectionState.connectionStatus === 'error' ? "bg-red-500" : ""
                )}
              >
                {connectionState.connectionStatus}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Connection ID</p>
              <p className="font-mono text-sm">{connectionState.connectionId || 'None'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Auto Updates</p>
              <Badge variant={connectionState.autoUpdatesEnabled ? "default" : "secondary"}>
                {connectionState.autoUpdatesEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Subscribed Tickers</p>
              <p className="font-semibold">{connectionState.subscribedTickers.size}</p>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button 
              onClick={connect} 
              disabled={connectionState.isConnected}
              size="sm"
            >
              Connect
            </Button>
            <Button 
              onClick={disconnect} 
              disabled={!connectionState.isConnected}
              variant="outline"
              size="sm"
            >
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {lastError && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              Last Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-semibold">{lastError.error}</p>
              <p className="text-sm">{lastError.message}</p>
              {lastError.ticker && (
                <p className="text-sm text-muted-foreground">Ticker: {lastError.ticker}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {formatTimestamp(lastError.timestamp)}
              </p>
            </div>
            <Button onClick={clearError} variant="outline" size="sm" className="mt-3">
              <X className="h-3 w-3 mr-1" />
              Clear Error
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Subscription Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Single Ticker */}
            <div className="flex gap-2">
              <Input
                placeholder="Enter ticker (e.g., AAPL)"
                value={testTicker}
                onChange={(e) => setTestTicker(e.target.value)}
                className="max-w-xs"
              />
              <Button 
                onClick={handleSingleSubscribe}
                disabled={!connectionState.isConnected || !testTicker.trim()}
                size="sm"
              >
                Subscribe Single
              </Button>
            </div>

            {/* Multiple Tickers */}
            <div className="flex gap-2">
              <Input
                placeholder="Enter tickers separated by commas (e.g., AAPL,MSFT,GOOGL)"
                value={testTickers}
                onChange={(e) => setTestTickers(e.target.value)}
                className="max-w-md"
              />
              <Button 
                onClick={handleMultiSubscribe}
                disabled={!connectionState.isConnected || !testTickers.trim()}
                size="sm"
              >
                Subscribe Multiple
              </Button>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-2">
              <Button 
                onClick={handleRefreshAll}
                disabled={!connectionState.isConnected || connectionState.subscribedTickers.size === 0}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh All
              </Button>
              <Button 
                onClick={handleUnsubscribeAll}
                disabled={!connectionState.isConnected || connectionState.subscribedTickers.size === 0}
                variant="outline"
                size="sm"
              >
                Unsubscribe All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Subscriptions</p>
              <p className="text-2xl font-bold">{subscriptionStats.total_subscriptions}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Articles Received</p>
              <p className="text-2xl font-bold">{subscriptionStats.total_articles_received}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Activity</p>
              <p className="text-sm font-mono">{formatTimestamp(subscriptionStats.last_activity)}</p>
            </div>
          </div>
          
          {subscriptionStats.active_tickers.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Active Tickers:</p>
              <div className="flex flex-wrap gap-1">
                {subscriptionStats.active_tickers.map(ticker => (
                  <Badge key={ticker} variant="secondary">
                    {ticker}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticker Statuses */}
      {Object.keys(tickerStatuses).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ticker Statuses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.values(tickerStatuses).map(status => (
                <div key={status.ticker} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    {getTickerStatusIcon(status.status)}
                    <div>
                      <p className="font-semibold">{status.ticker}</p>
                      <p className="text-sm text-muted-foreground">{status.message}</p>
                      {status.progress && (
                        <p className="text-xs text-blue-600">{status.progress}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{status.status}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {status.articles_found} articles
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimestamp(status.last_updated)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Articles Preview */}
      {allArticles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Articles ({getAllArticles().length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {getAllArticles().slice(0, 10).map(article => (
                <div key={article.id} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between">
                    {/* Thumbnail */}
                    {article.imageUrl && (
                      <div className="w-16 h-16 mr-3 rounded overflow-hidden flex-shrink-0">
                        <img 
                          src={article.imageUrl} 
                          alt={article.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium text-sm line-clamp-2">{article.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {article.summary}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {article.relatedSymbols?.[0]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {article.source}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(article.publishedAt.toISOString())}
                        </span>
                        {article.imageUrl && (
                          <Badge variant="secondary" className="text-xs">
                            📷
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}