import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '@/lib/apiBase';

interface StockPrice {
  symbol: string;
  current_price: number;
  change_amount: number;
  change_percent: number;
  timestamp: string;
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

  const connect = async () => {
    try {
      // FIXED: Always check API health first
      const apiHealthy = await checkRealTimeAPIHealth();
      if (!apiHealthy) {
        console.log('❌ DEBUG: Real-time API not available, cannot connect WebSocket');
        setConnectionStatus('disconnected');
        return;
      }
      
      const wsUrl = getWebSocketUrl();
      console.log('🔍 DEBUG: Attempting WebSocket connection to:', wsUrl);
      setConnectionStatus('connecting');
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('📡 Connected to real-time stock price feed at:', wsUrl);
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;

        // Subscribe to symbols when connection opens
        if (symbols.length > 0) {
          const subscribeMessage = {
            type: 'subscribe',
            symbols: symbols,
            user_id: 'portfolio_user'
          };
          console.log('🔍 DEBUG: Sending subscription message:', subscribeMessage);
          ws.send(JSON.stringify(subscribeMessage));
          console.log('📊 DEBUG: Subscription sent for symbols:', symbols);
        }
      };

      ws.onmessage = (event) => {
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
                  // Backend sends price data directly in message.data
                  const priceData = {
                    symbol: message.data.symbol,
                    current_price: message.data.current_price,
                    change_amount: message.data.change_amount,
                    change_percent: message.data.change_percent,
                    timestamp: message.data.timestamp || new Date().toISOString()
                  };
                  
                  setPrices(prev => ({
                    ...prev,
                    [message.data.symbol]: priceData
                  }));
                  
                  console.log(`💰 PRICE UPDATE: ${message.data.symbol} = $${message.data.current_price} (${message.data.change_percent >= 0 ? '+' : ''}${message.data.change_percent?.toFixed(2)}%)`);
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
                    current_price: priceInfo.current_price,
                    change_amount: priceInfo.change_amount || 0,
                    change_percent: priceInfo.change_percent || 0,
                    timestamp: priceInfo.last_updated || new Date().toISOString()
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
        
        // FIXED: Better reconnection logic
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(Math.pow(2, reconnectAttempts.current) * 1000, 30000); // Cap at 30s
          console.log(`🔄 Reconnecting in ${delay/1000}s (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else if (event.code !== 1000) {
          console.error('❌ Max reconnection attempts reached or connection manually closed');
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        console.error('❌ Failed WebSocket URL:', wsUrl);
        console.error('❌ API Base URL:', API_BASE_URL);
        setConnectionStatus('disconnected');
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setConnectionStatus('disconnected');
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect'); // Normal closure
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
  };

  const updateSubscription = (newSymbols: string[]) => {
    if (wsRef.current && isConnected && newSymbols.length > 0) {
      const subscribeMessage = {
        type: 'subscribe',
        symbols: newSymbols,
        user_id: 'portfolio_user'
      };
      
      console.log('🔍 DEBUG: Updating subscription:', subscribeMessage);
      wsRef.current.send(JSON.stringify(subscribeMessage));
    }
  };

  // Connect when component mounts and symbols are available
  useEffect(() => {
    console.log('🔍 DEBUG: WebSocket useEffect triggered, symbols:', symbols);
    if (symbols.length > 0) {
      console.log('🔍 DEBUG: Calling connect() with symbols:', symbols);
      connect();
    } else {
      console.log('🔍 DEBUG: No symbols provided, skipping WebSocket connection');
    }
    
    return () => {
      console.log('🔍 DEBUG: WebSocket cleanup - disconnecting');
      disconnect();
    };
  }, [symbols]); // FIXED: React when symbols change

  // Update subscription when symbols change and cleanup old prices
  useEffect(() => {
    if (symbols.length > 0 && isConnected) {
      updateSubscription(symbols);
    }
    
    // Clean up prices for symbols no longer in the portfolio
    setPrices(prev => {
      const newPrices: Record<string, StockPrice> = {};
      symbols.forEach(symbol => {
        if (prev[symbol]) {
          newPrices[symbol] = prev[symbol];
        }
      });
      return newPrices;
    });
  }, [symbols, isConnected]);

  return {
    prices,
    isConnected,
    connectionStatus,
    connect,
    disconnect
  };
}
