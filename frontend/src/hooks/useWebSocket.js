import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

/**
 * WebSocket context and hooks for real-time functionality
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Connection state management
 * - Room-based subscriptions
 * - Message queuing for offline scenarios
 * - Performance optimized with React patterns
 */

const WebSocketContext = createContext(null);

// Connection states
const CONNECTION_STATES = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error'
};

export const WebSocketProvider = ({ children, url, token, options = {} }) => {
  const [connectionState, setConnectionState] = useState(CONNECTION_STATES.DISCONNECTED);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const messageQueueRef = useRef([]);
  const subscribersRef = useRef(new Map());
  const reconnectAttempts = useRef(0);

  const {
    maxReconnectAttempts = 5,
    reconnectInterval = 1000,
    maxReconnectInterval = 30000,
    heartbeatInterval = 30000
  } = options;

  // Generate WebSocket URL with token
  const getWebSocketUrl = useCallback(() => {
    const wsUrl = url.replace(/^http/, 'ws');
    return `${wsUrl}?token=${encodeURIComponent(token)}`;
  }, [url, token]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    if (!token) {
      setError('No authentication token available');
      return;
    }

    try {
      setConnectionState(CONNECTION_STATES.CONNECTING);
      setError(null);

      const ws = new WebSocket(getWebSocketUrl());

      ws.onopen = () => {
        console.log('🔗 WebSocket connected');
        setConnectionState(CONNECTION_STATES.CONNECTED);
        reconnectAttempts.current = 0;

        // Send queued messages
        while (messageQueueRef.current.length > 0) {
          const message = messageQueueRef.current.shift();
          ws.send(JSON.stringify(message));
        }

        // Start heartbeat
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);

          // Handle system messages
          switch (message.type) {
            case 'pong':
              // Heartbeat response - connection is healthy
              break;
            case 'error':
              setError(message.message);
              break;
            default:
              // Notify subscribers
              notifySubscribers(message);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('🔗 WebSocket disconnected:', event.code, event.reason);
        setConnectionState(CONNECTION_STATES.DISCONNECTED);
        stopHeartbeat();

        // Attempt reconnection if not intentional
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          attemptReconnect();
        }
      };

      ws.onerror = (error) => {
        console.error('🔗 WebSocket error:', error);
        setConnectionState(CONNECTION_STATES.ERROR);
        setError('Connection error occurred');
      };

      wsRef.current = ws;

    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setConnectionState(CONNECTION_STATES.ERROR);
      setError(err.message);
    }
  }, [getWebSocketUrl, token, maxReconnectAttempts]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopHeartbeat();

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    setConnectionState(CONNECTION_STATES.DISCONNECTED);
  }, []);

  // Reconnection logic with exponential backoff
  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      setConnectionState(CONNECTION_STATES.ERROR);
      setError('Max reconnection attempts reached');
      return;
    }

    setConnectionState(CONNECTION_STATES.RECONNECTING);
    reconnectAttempts.current++;

    const delay = Math.min(
      reconnectInterval * Math.pow(2, reconnectAttempts.current - 1),
      maxReconnectInterval
    );

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect, maxReconnectAttempts, reconnectInterval, maxReconnectInterval]);

  // Heartbeat management
  const heartbeatIntervalRef = useRef(null);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendMessage({ type: 'ping' });
      }
    }, heartbeatInterval);
  }, [heartbeatInterval]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Send message to server
  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    } else {
      // Queue message for when connection is restored
      messageQueueRef.current.push(message);
      return false;
    }
  }, []);

  // Subscription management
  const subscribe = useCallback((eventType, callback) => {
    const subscriptionId = Math.random().toString(36).substring(2);
    
    if (!subscribersRef.current.has(eventType)) {
      subscribersRef.current.set(eventType, new Map());
    }
    
    subscribersRef.current.get(eventType).set(subscriptionId, callback);

    // Return unsubscribe function
    return () => {
      const typeSubscribers = subscribersRef.current.get(eventType);
      if (typeSubscribers) {
        typeSubscribers.delete(subscriptionId);
        if (typeSubscribers.size === 0) {
          subscribersRef.current.delete(eventType);
        }
      }
    };
  }, []);

  const notifySubscribers = useCallback((message) => {
    const typeSubscribers = subscribersRef.current.get(message.type);
    if (typeSubscribers) {
      typeSubscribers.forEach(callback => {
        try {
          callback(message);
        } catch (err) {
          console.error('Error in WebSocket subscriber:', err);
        }
      });
    }
  }, []);

  // Room management
  const joinRoom = useCallback((roomName) => {
    sendMessage({ type: 'join_room', room: roomName });
  }, [sendMessage]);

  const leaveRoom = useCallback((roomName) => {
    sendMessage({ type: 'leave_room', room: roomName });
  }, [sendMessage]);

  // Effect to handle connection lifecycle
  useEffect(() => {
    if (token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [token, connect, disconnect]);

  // Context value
  const value = {
    connectionState,
    lastMessage,
    error,
    connect,
    disconnect,
    sendMessage,
    subscribe,
    joinRoom,
    leaveRoom,
    isConnected: connectionState === CONNECTION_STATES.CONNECTED,
    isConnecting: connectionState === CONNECTION_STATES.CONNECTING,
    isReconnecting: connectionState === CONNECTION_STATES.RECONNECTING
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Hook to use WebSocket context
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

// Specialized hooks for common use cases
export const useInventoryUpdates = (locationId = null) => {
  const { subscribe, joinRoom, leaveRoom, isConnected } = useWebSocket();
  const [inventoryData, setInventoryData] = useState(null);

  useEffect(() => {
    if (!isConnected) return;

    // Join appropriate room
    const room = locationId ? `inventory_location_${locationId}` : 'inventory_all';
    joinRoom(room);

    // Subscribe to inventory updates
    const unsubscribe = subscribe('inventory_update', (message) => {
      setInventoryData(message.data);
    });

    return () => {
      unsubscribe();
      leaveRoom(room);
    };
  }, [isConnected, locationId, subscribe, joinRoom, leaveRoom]);

  return inventoryData;
};

export const useSalesUpdates = (locationId = null) => {
  const { subscribe, joinRoom, leaveRoom, isConnected } = useWebSocket();
  const [salesData, setSalesData] = useState([]);

  useEffect(() => {
    if (!isConnected) return;

    const room = locationId ? `sales_location_${locationId}` : 'sales_all';
    joinRoom(room);

    const unsubscribe = subscribe('new_sale', (message) => {
      setSalesData(prev => [message.data, ...prev.slice(0, 49)]); // Keep last 50
    });

    return () => {
      unsubscribe();
      leaveRoom(room);
    };
  }, [isConnected, locationId, subscribe, joinRoom, leaveRoom]);

  return salesData;
};

export const useLowStockAlerts = () => {
  const { subscribe, joinRoom, leaveRoom, isConnected } = useWebSocket();
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!isConnected) return;

    joinRoom('inventory_all');

    const unsubscribe = subscribe('low_stock_alert', (message) => {
      setAlerts(prev => [
        {
          id: Date.now(),
          ...message.data,
          timestamp: new Date().toISOString()
        },
        ...prev.slice(0, 9) // Keep last 10 alerts
      ]);
    });

    return () => {
      unsubscribe();
      leaveRoom('inventory_all');
    };
  }, [isConnected, subscribe, joinRoom, leaveRoom]);

  const dismissAlert = useCallback((alertId) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  return { alerts, dismissAlert };
};

// Connection status component
export const WebSocketStatus = ({ className = '' }) => {
  const { connectionState, error } = useWebSocket();

  const getStatusDisplay = () => {
    switch (connectionState) {
      case CONNECTION_STATES.CONNECTED:
        return { text: 'Connected', color: 'text-green-600', icon: '🟢' };
      case CONNECTION_STATES.CONNECTING:
        return { text: 'Connecting...', color: 'text-yellow-600', icon: '🟡' };
      case CONNECTION_STATES.RECONNECTING:
        return { text: 'Reconnecting...', color: 'text-yellow-600', icon: '🟡' };
      case CONNECTION_STATES.ERROR:
        return { text: 'Connection Error', color: 'text-red-600', icon: '🔴' };
      default:
        return { text: 'Disconnected', color: 'text-gray-600', icon: '⚫' };
    }
  };

  const status = getStatusDisplay();

  return (
    <div className={`flex items-center space-x-2 text-sm ${className}`}>
      <span>{status.icon}</span>
      <span className={status.color}>{status.text}</span>
      {error && (
        <span className="text-xs text-red-500" title={error}>
          ⚠️
        </span>
      )}
    </div>
  );
};

export default {
  WebSocketProvider,
  useWebSocket,
  useInventoryUpdates,
  useSalesUpdates,
  useLowStockAlerts,
  WebSocketStatus
};