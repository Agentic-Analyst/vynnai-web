/**
 * News Feed WebSocket Types
 * 
 * TypeScript interfaces for real-time news feed WebSocket integration.
 * These types match the backend API models for consistency.
 */

// ===== Core News Models =====

export interface NewsArticle {
  id?: string; // Article ObjectId from database
  urlHash: string; // URL hash identifier
  company: string; // Company name
  content: string; // Article content/summary
  createdAt: string; // When article was created in database (ISO string)
  publish_date: string; // Publication date as string (e.g. '5 days ago')
  scraped_at: string; // When article was scraped (datetime string)
  search_category: string; // Search category used
  serpapi_authors: string[]; // Authors from SerpAPI (can be empty)
  serpapi_snippet: string; // Snippet from SerpAPI
  serpapi_source: string; // Source from SerpAPI (can be empty)
  serpapi_source_icon: string; // Source icon from SerpAPI (can be empty)
  serpapi_thumbnail: string; // Thumbnail URL from SerpAPI
  source_url: string; // Original source URL
  ticker: string; // Related stock ticker
  title: string; // Article title
  updatedAt: string; // When article was last updated in database (ISO string)
  url: string; // Article URL
  word_count: string; // Word count as string
}

// ===== WebSocket Message Models =====

export interface NewsSubscription {
  tickers: string[];
  limit?: number;
  days_back?: number;
  force_refresh?: boolean;
  user_id?: string;
}

export interface NewsStreamUpdate {
  ticker: string;
  article: NewsArticle;
  source: 'cache' | 'fresh';
  batch_info: {
    ticker: string;
    total_articles: number;
    source: string;
    batch_size: number;
    cache_hit: boolean;
    article_index: number;
    is_last: boolean;
  };
}

export interface NewsStreamStatus {
  ticker: string;
  status: 'processing' | 'fetching' | 'completed' | 'error';
  message: string;
  articles_found: number;
  progress?: string;
}

// ===== WebSocket Message Types =====

export type NewsWebSocketMessageType = 
  | 'subscribe'
  | 'unsubscribe' 
  | 'ping'
  | 'refresh'
  | 'connected'
  | 'subscribed'
  | 'unsubscribed'
  | 'news_update'
  | 'status_update'
  | 'completed'
  | 'error'
  | 'pong';

export interface NewsWebSocketMessage {
  type: NewsWebSocketMessageType;
  data: any;
  timestamp: string;
}

// Client to Server Messages
export interface NewsSubscribeMessage {
  type: 'subscribe';
  tickers: string[];
  limit?: number;
  days_back?: number;
  force_refresh?: boolean;
  user_id?: string;
}

export interface NewsUnsubscribeMessage {
  type: 'unsubscribe';
  tickers?: string[]; // If empty, unsubscribes from all
}

export interface NewsPingMessage {
  type: 'ping';
}

export interface NewsRefreshMessage {
  type: 'refresh';
  tickers?: string[]; // If empty, refreshes all subscribed tickers
}

// Server to Client Messages
export interface NewsConnectedMessage {
  type: 'connected';
  data: {
    connection_id: string;
    timestamp: string;
    message: string;
  };
}

export interface NewsSubscribedMessage {
  type: 'subscribed';
  data: {
    tickers: string[];
    total_subscriptions: number;
    settings: {
      limit: number;
      days_back: number;
      force_refresh: boolean;
    };
    auto_updates_enabled: boolean;
    timestamp: string;
  };
}

export interface NewsUnsubscribedMessage {
  type: 'unsubscribed';
  data: {
    tickers: string[];
    remaining_subscriptions: number;
    auto_updates_removed: string[];
    timestamp: string;
  };
}

export interface NewsUpdateMessage {
  type: 'news_update';
  data: NewsStreamUpdate;
  timestamp: string;
}

export interface NewsStatusUpdateMessage {
  type: 'status_update';
  data: NewsStreamStatus;
  timestamp: string;
}

export interface NewsCompletedMessage {
  type: 'completed';
  data: {
    tickers: string[];
    total_articles: number;
    timestamp: string;
    message: string;
  };
}

export interface NewsErrorMessage {
  type: 'error';
  data: {
    error: string;
    message: string;
    ticker?: string;
    timestamp: string;
  };
}

export interface NewsPongMessage {
  type: 'pong';
  data: {
    timestamp: string;
  };
}

// ===== Hook State Types =====

export interface NewsConnectionState {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  connectionId?: string;
  subscribedTickers: Set<string>;
  settings: {
    limit: number;
    days_back: number;
    force_refresh: boolean;
  };
  autoUpdatesEnabled: boolean;
}

export interface NewsTickerStatus {
  ticker: string;
  status: 'idle' | 'processing' | 'fetching' | 'completed' | 'error';
  message?: string;
  articles_found: number;
  progress?: string;
  last_updated?: string;
}

export interface NewsSubscriptionStats {
  total_subscriptions: number;
  active_tickers: string[];
  total_articles_received: number;
  last_activity?: string;
}

// ===== Error Types =====

export interface NewsWebSocketError {
  error: string;
  message: string;
  ticker?: string;
  timestamp: string;
}

// ===== Conversion Utilities =====

/**
 * Convert backend NewsArticle to frontend NewsItem format
 */
export function convertNewsArticleToNewsItem(article: NewsArticle): import('@/utils/stocksApi').NewsItem {
  // Parse the publish_date or use createdAt as fallback
  let publishedAt: Date;
  try {
    if (article.publish_date && article.publish_date !== 'N/A') {
      // Try to parse relative dates like "5 days ago"
      publishedAt = parseRelativeDate(article.publish_date);
    } else {
      publishedAt = new Date(article.createdAt);
    }
  } catch {
    publishedAt = new Date(article.createdAt);
  }

  return {
    id: article.id || article.urlHash,
    title: article.title,
    summary: article.content || article.serpapi_snippet,
    source: article.serpapi_source || extractDomainFromUrl(article.source_url),
    url: article.url || article.source_url,
    imageUrl: article.serpapi_thumbnail || undefined,
    publishedAt: publishedAt,
    relatedSymbols: [article.ticker],
    // Additional fields from WebSocket data
    publish_date: article.publish_date,
    search_category: article.search_category,
    word_count: article.word_count,
    serpapi_snippet: article.serpapi_snippet
  };
}

/**
 * Parse relative date strings like "5 days ago" into Date objects
 */
function parseRelativeDate(relativeDate: string): Date {
  const now = new Date();
  const lowerDate = relativeDate.toLowerCase();
  
  if (lowerDate.includes('day') && lowerDate.includes('ago')) {
    const days = parseInt(lowerDate.match(/(\d+)\s*day/)?.[1] || '0');
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }
  
  if (lowerDate.includes('hour') && lowerDate.includes('ago')) {
    const hours = parseInt(lowerDate.match(/(\d+)\s*hour/)?.[1] || '0');
    return new Date(now.getTime() - hours * 60 * 60 * 1000);
  }
  
  if (lowerDate.includes('minute') && lowerDate.includes('ago')) {
    const minutes = parseInt(lowerDate.match(/(\d+)\s*minute/)?.[1] || '0');
    return new Date(now.getTime() - minutes * 60 * 1000);
  }
  
  if (lowerDate.includes('week') && lowerDate.includes('ago')) {
    const weeks = parseInt(lowerDate.match(/(\d+)\s*week/)?.[1] || '0');
    return new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
  }
  
  // If we can't parse, return current time minus 1 hour as fallback
  return new Date(now.getTime() - 60 * 60 * 1000);
}

/**
 * Extract domain name from URL for source display
 */
function extractDomainFromUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch {
    return 'Unknown Source';
  }
}

/**
 * Convert frontend NewsItem to backend NewsArticle format
 */
export function convertNewsItemToNewsArticle(item: import('@/utils/stocksApi').NewsItem, ticker: string): NewsArticle {
  const now = new Date().toISOString();
  
  return {
    id: item.id,
    urlHash: item.id || `${ticker}-${Date.now()}`,
    company: ticker, // Use ticker as company name
    content: item.summary,
    createdAt: now,
    publish_date: formatRelativeTime(item.publishedAt),
    scraped_at: now,
    search_category: 'manual',
    serpapi_authors: [],
    serpapi_snippet: item.summary,
    serpapi_source: item.source,
    serpapi_source_icon: '',
    serpapi_thumbnail: item.imageUrl || '',
    source_url: item.url,
    ticker: ticker,
    title: item.title,
    updatedAt: now,
    url: item.url,
    word_count: estimateWordCount(item.summary).toString()
  };
}

/**
 * Format a Date as relative time string
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
}

/**
 * Estimate word count for a text string
 */
function estimateWordCount(text: string): number {
  return text.trim().split(/\s+/).length;
}