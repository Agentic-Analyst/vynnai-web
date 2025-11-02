import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '@/lib/apiBase';

interface StockPrice {
  symbol: string;
  name?: string;
  sector?: string;
  industry?: string;
  current_price: number;
  change_amount: number;
  change_percent: number;
  volume?: number;
  market_cap?: number;
  timestamp: string;
  bid?: number;
  ask?: number;
  high_52w?: number;
  low_52w?: number;
  day_high?: number;
  day_low?: number;
  avg_volume?: number;
  pe_ratio?: number;
  dividend_yield?: number;
}

interface WebSocketMessage {
  type: string;
  data?: any;
}

// FIXED: WebSocket URL generation - now integrated with FastAPI on same port
const getWebSocketUrl = () => {
    // Use the same API_BASE_URL as other APIs (api.vynnai.com)
    let baseUrl = API_BASE_URL;
  
    // Remove trailing slash
    baseUrl = baseUrl.replace(/\/$/, '');
  
    // Convert HTTP(S) to WebSocket protocol and add WebSocket endpoint path
    const wsBase = baseUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    const wsUrl = `${wsBase}/api/realtime/ws`;
    
    console.log('🔍 DEBUG: API_BASE_URL:', API_BASE_URL);
    console.log('🔍 DEBUG: Generated WebSocket URL:', wsUrl);
    return wsUrl;
};

// FIXED: Add API health check to ensure backend is ready
const checkRealTimeAPIHealth = async () => {
  try {
    const healthUrl = `${API_BASE_URL}/api/realtime/health`;
    console.log('🔍 DEBUG: Checking API health at:', healthUrl);
    
    const response = await fetch(healthUrl, { credentials: 'include' });
    if (response.ok) {
      const data = await response.json();
      console.log('✅ DEBUG: Real-time API is healthy:', data);
      return true;
    } else {
      console.log('⚠️ DEBUG: API health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ DEBUG: API health check error:', error);
    return false;
  }
};

export function useRealTimeStockPrices(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, StockPrice>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const isConnectingRef = useRef(false); // FIXED: Track connection attempts

  const connect = async () => {
    try {
      // FIXED: Prevent multiple concurrent connections
      if (isConnectingRef.current) {
        console.log('🔍 DEBUG: Connection already in progress, skipping');
        return;
      }

      if (wsRef.current && 
          (wsRef.current.readyState === WebSocket.CONNECTING || 
           wsRef.current.readyState === WebSocket.OPEN)) {
        console.log('🔍 DEBUG: WebSocket already connecting/connected, skipping new connection');
        return;
      }

      isConnectingRef.current = true;

      // FIXED: Always check API health first
      const apiHealthy = await checkRealTimeAPIHealth();
      if (!apiHealthy) {
        console.log('❌ DEBUG: Real-time API not available, cannot connect WebSocket');
        setConnectionStatus('disconnected');
        isConnectingRef.current = false;
        return;
      }
      
      const wsUrl = getWebSocketUrl();
      console.log('🔍 DEBUG: Attempting WebSocket connection to:', wsUrl);
      setConnectionStatus('connecting');
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Connected to real-time stock price feed at:', wsUrl);
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
        isConnectingRef.current = false;
        
        // Send subscription for symbols with proper state checking
        if (symbols.length > 0 && ws.readyState === WebSocket.OPEN) {
          try {
            const subscribeMessage = {
              type: 'subscribe',
              symbols: symbols,
              user_id: 'portfolio_user'
            };
            console.log('🔍 DEBUG: Sending subscription message:', subscribeMessage);
            ws.send(JSON.stringify(subscribeMessage));
            console.log('📊 DEBUG: Subscription sent for symbols:', symbols);
          } catch (error) {
            console.error('❌ Error sending initial subscription:', error);
          }
        }
      };      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'connected':
              console.log('✅ WebSocket connection confirmed:', message.data);
              break;
              
            case 'subscribed':
              console.log('📈 Subscription confirmed for:', message.data?.symbols);
              break;
              
            case 'price_update':
              console.log('🔍 DEBUG: Received price_update:', message.data);
              if (message.data && message.data.symbol) {
                try {
                  // Backend sends comprehensive price data directly in message.data
                  const priceData = {
                    symbol: message.data.symbol,
                    name: message.data.name,
                    sector: message.data.sector,
                    industry: message.data.industry,
                    current_price: message.data.current_price,
                    change_amount: message.data.change_amount,
                    change_percent: message.data.change_percent,
                    volume: message.data.volume,
                    market_cap: message.data.market_cap,
                    timestamp: message.data.timestamp || new Date().toISOString(),
                    bid: message.data.bid,
                    ask: message.data.ask,
                    high_52w: message.data.high_52w,
                    low_52w: message.data.low_52w,
                    day_high: message.data.day_high,
                    day_low: message.data.day_low,
                    avg_volume: message.data.avg_volume,
                    pe_ratio: message.data.pe_ratio,
                    dividend_yield: message.data.dividend_yield
                  };
                  
                  setPrices(prev => ({
                    ...prev,
                    [message.data.symbol]: priceData
                  }));
                  
                  console.log(`💰 PRICE UPDATE: ${message.data.symbol} = $${message.data.current_price} (${message.data.change_percent >= 0 ? '+' : ''}${message.data.change_percent?.toFixed(2)}%) Vol: ${message.data.volume ? (message.data.volume / 1000000).toFixed(1) + 'M' : 'N/A'}`);
                } catch (priceUpdateError) {
                  console.error('❌ Error processing price update:', priceUpdateError);
                }
              }
              break;
              
            case 'current_price':
              console.log('🔍 DEBUG: Received current_price:', message.data);
              if (message.data?.price && message.data.price.symbol) {
                try {
                  // Backend sends price object nested in message.data.price
                  const priceInfo = message.data.price;
                  const priceData = {
                    symbol: priceInfo.symbol,
                    name: priceInfo.name,
                    sector: priceInfo.sector,
                    industry: priceInfo.industry,
                    current_price: priceInfo.current_price,
                    change_amount: priceInfo.change_amount || 0,
                    change_percent: priceInfo.change_percent || 0,
                    volume: priceInfo.volume,
                    market_cap: priceInfo.market_cap,
                    timestamp: priceInfo.last_updated || new Date().toISOString(),
                    bid: priceInfo.bid,
                    ask: priceInfo.ask,
                    high_52w: priceInfo.high_52w,
                    low_52w: priceInfo.low_52w,
                    day_high: priceInfo.day_high,
                    day_low: priceInfo.day_low,
                    avg_volume: priceInfo.avg_volume,
                    pe_ratio: priceInfo.pe_ratio,
                    dividend_yield: priceInfo.dividend_yield
                  };
                  
                  setPrices(prev => ({
                    ...prev,
                    [priceInfo.symbol]: priceData
                  }));
                  
                  console.log(`💰 CURRENT PRICE: ${priceInfo.symbol} = $${priceInfo.current_price}`);
                } catch (currentPriceError) {
                  console.error('❌ Error processing current price:', currentPriceError);
                }
              }
              break;
              
            case 'error':
              console.error('❌ WebSocket error:', message.data);
              break;
              
            default:
              console.log('📨 Unknown message type:', message.type, message);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket connection closed:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        wsRef.current = null;
        isConnectingRef.current = false;
        
        // FIXED: Only reconnect for unexpected closures and if we still have symbols
        const wasUnexpectedClose = event.code !== 1000 && event.code !== 1001; // Normal closure codes
        const shouldReconnect = wasUnexpectedClose && 
                               symbols.length > 0 && 
                               reconnectAttempts.current < maxReconnectAttempts;
        
        if (shouldReconnect) {
          const delay = Math.min(Math.pow(2, reconnectAttempts.current) * 1000, 30000); // Cap at 30s
          console.log(`🔄 Reconnecting in ${delay/1000}s (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else if (wasUnexpectedClose) {
          console.error('❌ Max reconnection attempts reached or no symbols to reconnect for');
        } else {
          console.log('✅ WebSocket connection closed normally');
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        console.error('❌ Failed WebSocket URL:', wsUrl);
        console.error('❌ API Base URL:', API_BASE_URL);
        setConnectionStatus('disconnected');
        isConnectingRef.current = false;
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setConnectionStatus('disconnected');
      isConnectingRef.current = false;
    }
  };

  const disconnect = () => {
    console.log('🔍 DEBUG: Disconnect called');
    
    // Clear any pending reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Reset connection state
    isConnectingRef.current = false;
    
    // Close WebSocket connection safely
    if (wsRef.current) {
      const currentState = wsRef.current.readyState;
      console.log('🔍 DEBUG: WebSocket state before close:', currentState);
      
      if (currentState === WebSocket.OPEN || currentState === WebSocket.CONNECTING) {
        try {
          wsRef.current.close(1000, 'Manual disconnect'); // Normal closure
        } catch (error) {
          console.error('❌ Error closing WebSocket:', error);
        }
      }
      
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
    reconnectAttempts.current = 0;
  };

  const updateSubscription = (newSymbols: string[]) => {
    // FIXED: Check both connection state and WebSocket ready state
    if (wsRef.current && 
        wsRef.current.readyState === WebSocket.OPEN && 
        isConnected && 
        newSymbols.length > 0) {
      
      try {
        const subscribeMessage = {
          type: 'subscribe',
          symbols: newSymbols,
          user_id: 'portfolio_user'
        };
        
        console.log('🔍 DEBUG: Updating subscription:', subscribeMessage);
        wsRef.current.send(JSON.stringify(subscribeMessage));
      } catch (error) {
        console.error('❌ Error sending subscription update:', error);
      }
    } else {
      console.log('🔍 DEBUG: Skipping subscription update - WebSocket not ready:', {
        hasWebSocket: !!wsRef.current,
        readyState: wsRef.current?.readyState,
        isConnected,
        symbolsLength: newSymbols.length
      });
    }
  };

  // Connect when component mounts and symbols are available  
  useEffect(() => {
    console.log('🔍 DEBUG: WebSocket useEffect triggered, symbols:', symbols);
    
    if (symbols.length > 0) {
      // Don't reconnect if already connected - just update subscription
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isConnected) {
        console.log('🔍 DEBUG: WebSocket already connected, updating subscription only');
        updateSubscription(symbols);
        return;
      }
      
      // Only connect if not already connecting or connected
      if (!wsRef.current || 
          (wsRef.current.readyState !== WebSocket.CONNECTING && 
           wsRef.current.readyState !== WebSocket.OPEN)) {
        console.log('🔍 DEBUG: Calling connect() with symbols:', symbols);
        
        // Small delay to prevent rapid reconnections when symbols change quickly
        const connectTimer = setTimeout(() => {
          connect();
        }, 200); // Increased delay for more stability
        
        return () => clearTimeout(connectTimer);
      }
    } else {
      console.log('🔍 DEBUG: No symbols provided, disconnecting if connected');
      disconnect();
    }
  }, [symbols.join(',')]); // FIXED: Use stable dependency

  // FIXED: Add debounced subscription updates to prevent rapid-fire updates
  useEffect(() => {
    // Only update subscription if we have a stable connection
    if (!isConnected || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    // Debounce subscription updates to prevent rapid-fire API calls
    const timeoutId = setTimeout(() => {
      if (symbols.length > 0 && isConnected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log('🔍 DEBUG: Debounced subscription update for symbols:', symbols);
        updateSubscription(symbols);
      }
      
      // Clean up prices for symbols no longer in the list
      setPrices(prev => {
        const newPrices: Record<string, StockPrice> = {};
        symbols.forEach(symbol => {
          if (prev[symbol]) {
            newPrices[symbol] = prev[symbol];
          }
        });
        
        // Only update if the prices actually changed
        const prevKeys = Object.keys(prev).sort();
        const newKeys = Object.keys(newPrices).sort();
        const hasChanges = prevKeys.length !== newKeys.length || 
                          prevKeys.some((key, index) => key !== newKeys[index]);
        
        if (hasChanges) {
          console.log('🔍 DEBUG: Cleaning up prices, removed:', prevKeys.filter(key => !newKeys.includes(key)));
        }
        
        return hasChanges ? newPrices : prev;
      });
    }, 300); // Increased debounce time for more stability

    return () => clearTimeout(timeoutId);
  }, [symbols.join(','), isConnected]);

  // Note: Auto-cleanup removed to support persistent connections
  // Connection is now managed by StockPricesWebSocketProvider context

  return {
    prices,
    isConnected,
    connectionStatus,
    connect,
    disconnect
  };
}
