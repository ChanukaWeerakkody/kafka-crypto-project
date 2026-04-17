#!/usr/bin/env node

const logger = require('../utils/logger');
const { config, validateConfig } = require('../config');
const ConsumerController = require('../controllers/consumerController');

class ConsumerApplication {
  constructor() {
    this.consumerController = new ConsumerController();
    this.isShuttingDown = false;
  }

  async initialize() {
    try {
      // Validate configuration
      validateConfig();
      logger.info('Configuration validated successfully');

      // Initialize consumer controller
      await this.consumerController.initialize();
      logger.info('Consumer application initialized');

      // Setup message handlers
      this.setupMessageHandlers();

      // Setup graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to initialize consumer application:', error);
      process.exit(1);
    }
  }

  setupMessageHandlers() {
    // Handler for crypto price messages
    const cryptoMessageHandler = async (message, metadata) => {
      logger.info(`Received crypto message: ${message.symbol} - $${message.price}`, {
        topic: metadata.topic,
        partition: metadata.partition,
        timestamp: message.timestamp,
      });

      // Process message (add your business logic here)
      this.processCryptoMessage(message);
    };

    // Handler for invalid messages
    const parseErrorHandler = async (rawMessage, metadata) => {
      logger.warn('Failed to parse message', {
        topic: metadata.topic,
        partition: metadata.partition,
        rawMessage: rawMessage.substring(0, 100),
      });
    };

    // Register handlers
    this.consumerController.registerHandler(
      config.producer.topic,
      cryptoMessageHandler,
      { onParseError: parseErrorHandler }
    );
  }

  processCryptoMessage(message) {
    // Add your custom business logic here
    // Examples:
    // - Store in database
    // - Trigger alerts
    // - Send notifications
    // - Perform analytics
    
    logger.debug('Processing crypto message', {
      symbol: message.symbol,
      price: message.price,
      change24h: message.change24h,
      volume: message.volume,
    });
  }

  async start() {
    try {
      await this.consumerController.startConsuming();
      logger.info('Consumer application started successfully');

      // Log status periodically
      setInterval(() => {
        const status = this.consumerController.getStatus();
        logger.debug('Consumer status', status);
      }, 30000);

    } catch (error) {
      logger.error('Failed to start consumer application:', error);
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      if (this.isShuttingDown) {
        logger.warn('Shutdown already in progress');
        return;
      }

      this.isShuttingDown = true;
      logger.info(`Received ${signal}, shutting down gracefully...`);

      try {
        await this.consumerController.shutdown();
        logger.info('Consumer application shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon
  }

  async run() {
    await this.initialize();
    await this.start();
  }
}

// Run the application
if (require.main === module) {
  const app = new ConsumerApplication();
  app.run().catch(error => {
    logger.error('Unhandled error in consumer application:', error);
    process.exit(1);
  });
}

module.exports = ConsumerApplication;
