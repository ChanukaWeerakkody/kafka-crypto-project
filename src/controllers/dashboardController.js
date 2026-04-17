const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const logger = require('../utils/logger');
const ConsumerController = require('./consumerController');
const { config } = require('../config');

class DashboardController {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: config.server.cors,
    });
    this.consumerController = new ConsumerController();
    this.connectedClients = new Set();
    this.messageBuffer = [];
    this.maxBufferSize = 100;
  }

  async initialize() {
    try {
      this.setupMiddleware();
      this.setupRoutes();
      this.setupSocketHandlers();
      await this.consumerController.initialize('dashboard-group');
      
      logger.info('Dashboard controller initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize dashboard controller:', error);
      throw error;
    }
  }

  setupMiddleware() {
    this.app.use(express.static(path.join(__dirname, '../../public')));
    this.app.use(express.json());
    
    // Request logging middleware
    this.app.use((req, res, next) => {
      logger.debug(`${req.method} ${req.path}`, { ip: req.ip });
      next();
    });
  }

  setupRoutes() {
    // Serve dashboard HTML
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../../public/dashboard.html'));
    });

    // API endpoints
    this.app.get('/api/status', (req, res) => {
      res.json({
        status: 'running',
        connectedClients: this.connectedClients.size,
        bufferSize: this.messageBuffer.length,
        consumerStatus: this.consumerController.getStatus(),
        timestamp: new Date().toISOString(),
      });
    });

    this.app.get('/api/messages/recent', (req, res) => {
      const limit = parseInt(req.query.limit) || 20;
      const recentMessages = this.messageBuffer.slice(-limit);
      res.json(recentMessages);
    });

    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Error handler
    this.app.use((err, req, res, next) => {
      logger.error('Express error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      this.connectedClients.add(socket.id);
      logger.info(`Client connected: ${socket.id}. Total clients: ${this.connectedClients.size}`);

      // Send recent messages to new client
      if (this.messageBuffer.length > 0) {
        socket.emit('initial-data', this.messageBuffer.slice(-20));
      }

      socket.on('disconnect', () => {
        this.connectedClients.delete(socket.id);
        logger.info(`Client disconnected: ${socket.id}. Total clients: ${this.connectedClients.size}`);
      });

      socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

  async startConsuming() {
    const messageHandler = this.consumerController.createMessageHandler(
      async (message, metadata) => {
        this.processCryptoMessage(message);
      }
    );

    this.consumerController.registerHandler(config.producer.topic, messageHandler);
    await this.consumerController.startConsuming();
    
    logger.info('Dashboard started consuming crypto messages');
  }

  processCryptoMessage(message) {
    try {
      // Add timestamp if not present
      if (!message.receivedAt) {
        message.receivedAt = new Date().toISOString();
      }

      // Add to buffer
      this.messageBuffer.push(message);
      
      // Maintain buffer size
      if (this.messageBuffer.length > this.maxBufferSize) {
        this.messageBuffer.shift();
      }

      // Broadcast to all connected clients
      this.io.emit('crypto-update', message);
      
      logger.debug(`Processed and broadcasted ${message.symbol} price: $${message.price}`);
    } catch (error) {
      logger.error('Error processing crypto message:', error);
    }
  }

  async start() {
    try {
      await this.startConsuming();
      
      this.server.listen(config.server.port, config.server.host, () => {
        logger.info(`Dashboard server running on ${config.server.host}:${config.server.port}`);
      });
    } catch (error) {
      logger.error('Failed to start dashboard:', error);
      throw error;
    }
  }

  async stop() {
    logger.info('Stopping dashboard server');
    
    // Close all socket connections
    this.io.close();
    
    // Stop consumer
    await this.consumerController.shutdown();
    
    // Close server
    return new Promise((resolve) => {
      this.server.close(resolve);
    });
  }

  getStatus() {
    return {
      connectedClients: this.connectedClients.size,
      bufferSize: this.messageBuffer.length,
      consumerStatus: this.consumerController.getStatus(),
      serverConfig: config.server,
    };
  }
}

module.exports = DashboardController;
