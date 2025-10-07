const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Real-time WebSocket service for live updates
 * Features:
 * - JWT authentication
 * - Room-based subscriptions (by location, user role, etc.)
 * - Automatic reconnection handling
 * - Rate limiting and flood protection
 * - Performance monitoring
 */
class WebSocketService {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this)
    });
    
    this.clients = new Map(); // clientId -> { ws, user, rooms, lastActivity }
    this.rooms = new Map();   // roomName -> Set<clientId>
    this.stats = {
      connections: 0,
      messagesPerSecond: 0,
      totalMessages: 0,
      startTime: Date.now()
    };
    
    this.setupWebSocketServer();
    this.startStatsCollection();
    
    console.log('🔗 WebSocket service initialized');
  }

  // Verify client connection with JWT
  async verifyClient(info) {
    try {
      const url = new URL(info.req.url, `http://${info.req.headers.host}`);
      const token = url.searchParams.get('token');
      
      if (!token) {
        return false;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      const user = await User.findByPk(decoded.userId);
      
      if (!user) {
        return false;
      }

      // Store user info for later use
      info.req.user = user;
      return true;
      
    } catch (error) {
      console.error('WebSocket auth error:', error.message);
      return false;
    }
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const user = req.user;
      
      // Initialize client
      this.clients.set(clientId, {
        ws,
        user,
        rooms: new Set(),
        lastActivity: Date.now(),
        messageCount: 0,
        rateLimitReset: Date.now() + 60000 // 1 minute window
      });

      this.stats.connections++;
      
      console.log(`📱 Client connected: ${user.firstName} (${clientId})`);

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connection',
        message: 'Connected to Fortune Tiles real-time service',
        timestamp: new Date().toISOString()
      });

      // Auto-join user to their default rooms
      this.joinRoom(clientId, `user_${user.id}`);
      this.joinRoom(clientId, `role_${user.role || 'user'}`);

      // Handle messages
      ws.on('message', (data) => {
        this.handleClientMessage(clientId, data);
      });

      // Handle disconnect
      ws.on('close', () => {
        this.handleClientDisconnect(clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error.message);
        this.handleClientDisconnect(clientId);
      });

      // Ping/pong for connection health
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });
    });

    // Heartbeat to detect broken connections
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds
  }

  handleClientMessage(clientId, data) {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;

      // Rate limiting
      if (!this.checkRateLimit(clientId)) {
        this.sendToClient(clientId, {
          type: 'error',
          message: 'Rate limit exceeded. Please slow down.'
        });
        return;
      }

      const message = JSON.parse(data);
      client.lastActivity = Date.now();
      this.stats.totalMessages++;

      switch (message.type) {
        case 'join_room':
          this.joinRoom(clientId, message.room);
          break;

        case 'leave_room':
          this.leaveRoom(clientId, message.room);
          break;

        case 'subscribe_inventory':
          this.handleInventorySubscription(clientId, message.locationId);
          break;

        case 'subscribe_sales':
          this.handleSalesSubscription(clientId, message.locationId);
          break;

        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
          break;

        default:
          console.warn(`Unknown message type: ${message.type}`);
      }

    } catch (error) {
      console.error('Error handling client message:', error.message);
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Invalid message format'
      });
    }
  }

  handleClientDisconnect(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all rooms
    client.rooms.forEach(room => {
      this.leaveRoom(clientId, room);
    });

    this.clients.delete(clientId);
    this.stats.connections--;
    
    console.log(`📱 Client disconnected: ${client.user.firstName} (${clientId})`);
  }

  // Room management
  joinRoom(clientId, roomName) {
    const client = this.clients.get(clientId);
    if (!client) return false;

    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set());
    }

    this.rooms.get(roomName).add(clientId);
    client.rooms.add(roomName);

    this.sendToClient(clientId, {
      type: 'room_joined',
      room: roomName,
      timestamp: new Date().toISOString()
    });

    return true;
  }

  leaveRoom(clientId, roomName) {
    const client = this.clients.get(clientId);
    if (!client) return false;

    if (this.rooms.has(roomName)) {
      this.rooms.get(roomName).delete(clientId);
      
      // Clean up empty rooms
      if (this.rooms.get(roomName).size === 0) {
        this.rooms.delete(roomName);
      }
    }

    client.rooms.delete(roomName);

    this.sendToClient(clientId, {
      type: 'room_left',
      room: roomName,
      timestamp: new Date().toISOString()
    });

    return true;
  }

  // Specialized subscription handlers
  handleInventorySubscription(clientId, locationId = null) {
    const room = locationId ? `inventory_location_${locationId}` : 'inventory_all';
    this.joinRoom(clientId, room);
  }

  handleSalesSubscription(clientId, locationId = null) {
    const room = locationId ? `sales_location_${locationId}` : 'sales_all';
    this.joinRoom(clientId, room);
  }

  // Broadcasting methods
  broadcast(message, roomName = null) {
    const payload = {
      ...message,
      timestamp: new Date().toISOString()
    };

    if (roomName) {
      this.broadcastToRoom(roomName, payload);
    } else {
      // Broadcast to all connected clients
      this.clients.forEach((client, clientId) => {
        this.sendToClient(clientId, payload);
      });
    }
  }

  broadcastToRoom(roomName, message) {
    const room = this.rooms.get(roomName);
    if (!room) return;

    room.forEach(clientId => {
      this.sendToClient(clientId, message);
    });
  }

  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`Failed to send message to client ${clientId}:`, error.message);
      return false;
    }
  }

  // Rate limiting
  checkRateLimit(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return false;

    const now = Date.now();
    
    // Reset counter every minute
    if (now > client.rateLimitReset) {
      client.messageCount = 0;
      client.rateLimitReset = now + 60000;
    }

    client.messageCount++;
    
    // Allow 60 messages per minute
    return client.messageCount <= 60;
  }

  // Public methods for triggering real-time updates
  notifyInventoryUpdate(inventoryData, locationId = null) {
    const room = locationId ? `inventory_location_${locationId}` : 'inventory_all';
    this.broadcastToRoom(room, {
      type: 'inventory_update',
      data: inventoryData
    });
  }

  notifyNewSale(saleData, locationId = null) {
    const rooms = ['sales_all'];
    if (locationId) {
      rooms.push(`sales_location_${locationId}`);
    }

    rooms.forEach(room => {
      this.broadcastToRoom(room, {
        type: 'new_sale',
        data: saleData
      });
    });
  }

  notifyLowStock(productData, locationId = null) {
    const room = locationId ? `inventory_location_${locationId}` : 'inventory_all';
    this.broadcastToRoom(room, {
      type: 'low_stock_alert',
      data: productData,
      priority: 'high'
    });
  }

  // Utility methods
  generateClientId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  startStatsCollection() {
    setInterval(() => {
      // Calculate messages per second
      const now = Date.now();
      const secondsElapsed = (now - this.stats.startTime) / 1000;
      this.stats.messagesPerSecond = Math.round(this.stats.totalMessages / secondsElapsed);
    }, 5000);
  }

  getStats() {
    return {
      ...this.stats,
      activeRooms: this.rooms.size,
      totalRoomSubscriptions: Array.from(this.rooms.values()).reduce((sum, room) => sum + room.size, 0)
    };
  }
}

module.exports = WebSocketService;