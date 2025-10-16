/**
 * Real-time News Feed WebSocket Hook
 * 
 * A React hook for managing real-time news feed connections via WebSocket.
 * Follows the same architecture patterns as useRealTimeStockPrices but 
 * adapted for subscription-based news streaming.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/apiBase';
import type { NewsItem } from '@/utils/stocksApi';
import {
  NewsArticle,
  NewsSubscription,
  NewsStreamUpdate,
  NewsStreamStatus,
  NewsWebSocketMessage,
  NewsConnectionState,
  NewsTickerStatus,
  NewsSubscriptionStats,
  NewsWebSocketError,
  convertNewsArticleToNewsItem,
  type NewsWebSocketMessageType
} from '@/types/newsWebSocket';

// ===== Utility Functions =====

/**
 * Robust sorting function for news articles by publication date
 * Handles various date formats and edge cases
 */
const sortNewsByDate = (articles: NewsItem[]): NewsItem[] => {
  return articles.sort((a, b) => {
    try {
      // Primary sort: by publishedAt timestamp (most recent first)
      const timeA = a.publishedAt.getTime();
      const timeB = b.publishedAt.getTime();
      
      if (!isNaN(timeA) && !isNaN(timeB)) {
        return timeB - timeA;
      }
      
      // Fallback: if publishedAt is invalid, use publish_date string comparison
      if (a.publish_date && b.publish_date) {
        // Try to create dates from publish_date strings for comparison
        const dateA = new Date(a.publish_date);
        const dateB = new Date(b.publish_date);
        
        if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
          return dateB.getTime() - dateA.getTime();
        }
        
        // Last resort: string comparison of publish_date
        return b.publish_date.localeCompare(a.publish_date);
      }
      
      // If one has a valid date and the other doesn't, prioritize the valid one
      if (!isNaN(timeA) && isNaN(timeB)) return -1;
      if (isNaN(timeA) && !isNaN(timeB)) return 1;
      
      // If both are invalid, maintain original order
      return 0;
    } catch (error) {
      console.warn('Error sorting news articles:', error);
      return 0;
    }
  });
};

// ===== WebSocket URL Generation =====

const getNewsWebSocketUrl = () => {
  let baseUrl = API_BASE_URL;
  baseUrl = baseUrl.replace(/\/$/, '');
  
  const wsBase = baseUrl.replace('http://', 'ws://').replace('https://', 'wss://');
  const wsUrl = `${wsBase}/api/news/ws`;
  
  console.log('🔍 DEBUG: API_BASE_URL:', API_BASE_URL);
  console.log('🔍 DEBUG: Generated News WebSocket URL:', wsUrl);
  return wsUrl;
};

// ===== API Health Check =====

const checkNewsAPIHealth = async () => {
  try {
    const healthUrl = `${API_BASE_URL}/api/news/health`;
    console.log('🔍 DEBUG: Checking News API health at:', healthUrl);
    
    const response = await fetch(healthUrl, { credentials: 'include' });
    if (response.ok) {
      const data = await response.json();
      console.log('✅ DEBUG: News API is healthy:', data);
      return true;
    } else {
      console.log('⚠️ DEBUG: News API health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ DEBUG: News API health check error:', error);
    return false;
  }
};

// ===== Custom Hook =====

export function useRealTimeNews() {
  // ===== State =====
  const [connectionState, setConnectionState] = useState<NewsConnectionState>({
    isConnected: false,
    connectionStatus: 'disconnected',
    subscribedTickers: new Set(),
    settings: {
      limit: 100,
      days_back: 90, // 3 months (changed from 7 days)
      force_refresh: false
    },
    autoUpdatesEnabled: false
  });

  const [articles, setArticles] = useState<Record<string, NewsItem[]>>({});
  const [tickerStatuses, setTickerStatuses] = useState<Record<string, NewsTickerStatus>>({});
  const [subscriptionStats, setSubscriptionStats] = useState<NewsSubscriptionStats>({
    total_subscriptions: 0,
    active_tickers: [],
    total_articles_received: 0
  });
  const [lastError, setLastError] = useState<NewsWebSocketError | null>(null);

  // ===== Refs =====
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const isConnectingRef = useRef(false);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ===== WebSocket Message Handlers =====

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: NewsWebSocketMessage = JSON.parse(event.data);
      console.log('📰 Received message:', message.type, message.data);

      switch (message.type) {
        case 'connected':
          handleConnectedMessage(message);
          break;
        case 'subscribed':
          handleSubscribedMessage(message);
          break;
        case 'unsubscribed':
          handleUnsubscribedMessage(message);
          break;
        case 'news_update':
          handleNewsUpdateMessage(message);
          break;
        case 'status_update':
          handleStatusUpdateMessage(message);
          break;
        case 'completed':
          handleCompletedMessage(message);
          break;
        case 'error':
          handleErrorMessage(message);
          break;
        case 'pong':
          handlePongMessage(message);
          break;
        default:
          console.log('📨 Unknown news message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error parsing news WebSocket message:', error);
    }
  }, []);

  const handleConnectedMessage = (message: NewsWebSocketMessage) => {
    const { connection_id } = message.data;
    console.log('✅ News WebSocket connected:', connection_id);
    
    setConnectionState(prev => ({
      ...prev,
      isConnected: true,
      connectionStatus: 'connected',
      connectionId: connection_id
    }));

    // Start ping interval
    startPingInterval();
  };

  const handleSubscribedMessage = (message: NewsWebSocketMessage) => {
    const { tickers, settings, auto_updates_enabled } = message.data;
    console.log('📈 Subscribed to tickers:', tickers);

    setConnectionState(prev => ({
      ...prev,
      subscribedTickers: new Set(tickers),
      settings: settings,
      autoUpdatesEnabled: auto_updates_enabled
    }));

    setSubscriptionStats(prev => ({
      ...prev,
      total_subscriptions: tickers.length,
      active_tickers: tickers,
      last_activity: new Date().toISOString()
    }));

    // Initialize ticker statuses
    const newStatuses: Record<string, NewsTickerStatus> = {};
    tickers.forEach((ticker: string) => {
      newStatuses[ticker] = {
        ticker,
        status: 'idle',
        articles_found: 0
      };
    });
    setTickerStatuses(prev => ({ ...prev, ...newStatuses }));
  };

  const handleUnsubscribedMessage = (message: NewsWebSocketMessage) => {
    const { tickers, remaining_subscriptions } = message.data;
    console.log('📉 Unsubscribed from tickers:', tickers);

    setConnectionState(prev => {
      const newSubscribed = new Set(prev.subscribedTickers);
      tickers.forEach((ticker: string) => newSubscribed.delete(ticker));
      
      return {
        ...prev,
        subscribedTickers: newSubscribed
      };
    });

    setSubscriptionStats(prev => ({
      ...prev,
      total_subscriptions: remaining_subscriptions,
      active_tickers: prev.active_tickers.filter(t => !tickers.includes(t)),
      last_activity: new Date().toISOString()
    }));

    // Remove unsubscribed ticker statuses and articles
    setTickerStatuses(prev => {
      const newStatuses = { ...prev };
      tickers.forEach((ticker: string) => delete newStatuses[ticker]);
      return newStatuses;
    });

    setArticles(prev => {
      const newArticles = { ...prev };
      tickers.forEach((ticker: string) => delete newArticles[ticker]);
      return newArticles;
    });
  };

  const handleNewsUpdateMessage = (message: NewsWebSocketMessage) => {
    const update: NewsStreamUpdate = message.data;
    const { ticker, article, batch_info } = update;

    console.log(`💰 NEWS UPDATE: ${ticker} - "${article.title}" (${batch_info.article_index}/${batch_info.total_articles})`);

    // Convert backend article to frontend format
    const newsItem = convertNewsArticleToNewsItem(article);

    setArticles(prev => {
      const currentArticles = prev[ticker] || [];
      
      // Check if article already exists (by ID, urlHash, or URL)
      const exists = currentArticles.some(item => 
        item.id === newsItem.id || 
        item.url === newsItem.url ||
        (article.urlHash && item.id === article.urlHash)
      );

      if (exists) {
        return prev; // Don't add duplicates
      }

      // Add new article, keeping most recent first
      const updatedArticles = sortNewsByDate([newsItem, ...currentArticles])
        .slice(0, connectionState.settings.limit); // Respect limit

      return {
        ...prev,
        [ticker]: updatedArticles
      };
    });

    // Update stats
    setSubscriptionStats(prev => ({
      ...prev,
      total_articles_received: prev.total_articles_received + 1,
      last_activity: new Date().toISOString()
    }));
  };

  const handleStatusUpdateMessage = (message: NewsWebSocketMessage) => {
    const status: NewsStreamStatus = message.data;
    console.log(`📊 STATUS UPDATE: ${status.ticker} - ${status.status}: ${status.message}`);

    setTickerStatuses(prev => ({
      ...prev,
      [status.ticker]: {
        ticker: status.ticker,
        status: status.status,
        message: status.message,
        articles_found: status.articles_found,
        progress: status.progress,
        last_updated: new Date().toISOString()
      }
    }));
  };

  const handleCompletedMessage = (message: NewsWebSocketMessage) => {
    const { tickers, total_articles } = message.data;
    console.log(`✅ COMPLETED: ${tickers.join(', ')} - ${total_articles} total articles`);

    // Mark tickers as completed
    const newStatuses: Record<string, NewsTickerStatus> = {};
    tickers.forEach((ticker: string) => {
      newStatuses[ticker] = {
        ticker,
        status: 'completed',
        message: 'News feed completed',
        articles_found: articles[ticker]?.length || 0,
        last_updated: new Date().toISOString()
      };
    });
    setTickerStatuses(prev => ({ ...prev, ...newStatuses }));
  };

  const handleErrorMessage = (message: NewsWebSocketMessage) => {
    const error: NewsWebSocketError = message.data;
    console.error('❌ NEWS ERROR:', error);

    setLastError(error);

    if (error.ticker) {
      setTickerStatuses(prev => ({
        ...prev,
        [error.ticker!]: {
          ticker: error.ticker!,
          status: 'error',
          message: error.message,
          articles_found: 0,
          last_updated: new Date().toISOString()
        }
      }));
    }
  };

  const handlePongMessage = (message: NewsWebSocketMessage) => {
    console.log('🏓 Received pong from news server');
    // Just log for now, could update last ping time if needed
  };

  // ===== Connection Management =====

  const connect = async () => {
    try {
      if (isConnectingRef.current) {
        console.log('🔍 DEBUG: News connection already in progress, skipping');
        return;
      }

      if (wsRef.current && 
          (wsRef.current.readyState === WebSocket.CONNECTING || 
           wsRef.current.readyState === WebSocket.OPEN)) {
        console.log('🔍 DEBUG: News WebSocket already connecting/connected, skipping new connection');
        return;
      }

      isConnectingRef.current = true;

      // Check API health first
      const apiHealthy = await checkNewsAPIHealth();
      if (!apiHealthy) {
        console.log('❌ DEBUG: News API not available, cannot connect WebSocket');
        setConnectionState(prev => ({ ...prev, connectionStatus: 'error' }));
        isConnectingRef.current = false;
        return;
      }
      
      const wsUrl = getNewsWebSocketUrl();
      console.log('🔍 DEBUG: Attempting News WebSocket connection to:', wsUrl);
      setConnectionState(prev => ({ ...prev, connectionStatus: 'connecting' }));
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Connected to news feed at:', wsUrl);
        reconnectAttempts.current = 0;
        isConnectingRef.current = false;
      };

      ws.onmessage = handleMessage;

      ws.onclose = (event) => {
        console.log('🔌 News WebSocket connection closed:', event.code, event.reason);
        setConnectionState(prev => ({
          ...prev,
          isConnected: false,
          connectionStatus: 'disconnected'
        }));
        wsRef.current = null;
        isConnectingRef.current = false;
        stopPingInterval();
        
        // Reconnect if unexpected closure
        const wasUnexpectedClose = event.code !== 1000 && event.code !== 1001;
        const shouldReconnect = wasUnexpectedClose && 
                               reconnectAttempts.current < maxReconnectAttempts;
        
        if (shouldReconnect) {
          const delay = Math.min(Math.pow(2, reconnectAttempts.current) * 1000, 30000);
          console.log(`🔄 Reconnecting news WebSocket in ${delay/1000}s (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ News WebSocket error:', error);
        setConnectionState(prev => ({ ...prev, connectionStatus: 'error' }));
        isConnectingRef.current = false;
      };

    } catch (error) {
      console.error('❌ Failed to create news WebSocket connection:', error);
      setConnectionState(prev => ({ ...prev, connectionStatus: 'error' }));
      isConnectingRef.current = false;
    }
  };

  const disconnect = () => {
    console.log('🔍 DEBUG: News disconnect called');
    
    // Clear any pending reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    stopPingInterval();
    isConnectingRef.current = false;
    
    // Close WebSocket connection safely
    if (wsRef.current) {
      const currentState = wsRef.current.readyState;
      console.log('🔍 DEBUG: News WebSocket state before close:', currentState);
      
      if (currentState === WebSocket.OPEN || currentState === WebSocket.CONNECTING) {
        try {
          wsRef.current.close(1000, 'Manual disconnect');
        } catch (error) {
          console.error('❌ Error closing news WebSocket:', error);
        }
      }
      
      wsRef.current = null;
    }
    
    setConnectionState(prev => ({
      ...prev,
      isConnected: false,
      connectionStatus: 'disconnected'
    }));
    reconnectAttempts.current = 0;
  };

  // ===== Ping/Pong Management =====

  const startPingInterval = () => {
    stopPingInterval(); // Clear any existing interval
    
    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        sendMessage({ type: 'ping' });
      }
    }, 30000); // Ping every 30 seconds
  };

  const stopPingInterval = () => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  };

  // ===== Message Sending =====

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
        console.log('📤 Sent news message:', message.type, message);
      } catch (error) {
        console.error('❌ Error sending news message:', error);
      }
    } else {
      console.warn('⚠️ Cannot send news message - WebSocket not connected');
    }
  };

  // ===== Public API =====

  const subscribe = useCallback((tickers: string[], options?: Partial<NewsSubscription>) => {
    if (!connectionState.isConnected) {
      console.warn('⚠️ Cannot subscribe - news WebSocket not connected');
      return;
    }

    // Update connection settings if new options provided
    if (options?.limit !== undefined || options?.days_back !== undefined || options?.force_refresh !== undefined) {
      setConnectionState(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          ...(options.limit !== undefined && { limit: options.limit }),
          ...(options.days_back !== undefined && { days_back: options.days_back }),
          ...(options.force_refresh !== undefined && { force_refresh: options.force_refresh })
        }
      }));
    }

    const subscribeMessage = {
      type: 'subscribe',
      tickers: tickers.map(t => t.toUpperCase()),
      limit: options?.limit || connectionState.settings.limit,
      days_back: options?.days_back || connectionState.settings.days_back,
      force_refresh: options?.force_refresh || connectionState.settings.force_refresh,
      user_id: options?.user_id || 'news_user'
    };

    sendMessage(subscribeMessage);
  }, [connectionState.isConnected, connectionState.settings]);

  const unsubscribe = useCallback((tickers?: string[]) => {
    if (!connectionState.isConnected) {
      console.warn('⚠️ Cannot unsubscribe - news WebSocket not connected');
      return;
    }

    const unsubscribeMessage = {
      type: 'unsubscribe',
      tickers: tickers?.map(t => t.toUpperCase())
    };

    sendMessage(unsubscribeMessage);
  }, [connectionState.isConnected]);

  const refresh = useCallback((tickers?: string[]) => {
    if (!connectionState.isConnected) {
      console.warn('⚠️ Cannot refresh - news WebSocket not connected');
      return;
    }

    const refreshMessage = {
      type: 'refresh',
      tickers: tickers?.map(t => t.toUpperCase())
    };

    sendMessage(refreshMessage);
  }, [connectionState.isConnected]);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  // ===== Effects =====

  // Note: Auto-connect removed to support persistent connections
  // Connection is now managed by NewsWebSocketProvider context

  // ===== Return Hook API =====

  return {
    // Connection state
    connectionState,
    
    // Data
    articles,
    tickerStatuses,
    subscriptionStats,
    lastError,
    
    // Actions
    connect,
    disconnect,
    subscribe,
    unsubscribe, 
    refresh,
    clearError,
    
    // Utilities
    getAllArticles: () => {
      const allArticles: NewsItem[] = [];
      Object.values(articles).forEach(tickerArticles => {
        allArticles.push(...tickerArticles);
      });
      return sortNewsByDate(allArticles);
    },
    
    getArticlesForTicker: (ticker: string) => {
      const tickerArticles = articles[ticker.toUpperCase()] || [];
      return sortNewsByDate(tickerArticles);
    },
    
    getSubscribedTickers: () => Array.from(connectionState.subscribedTickers),
    
    isSubscribedTo: (ticker: string) => connectionState.subscribedTickers.has(ticker.toUpperCase())
  };
}