#!/usr/bin/env node

const logger = require('../utils/logger');
const { config, validateConfig } = require('../config');
const ProducerController = require('../controllers/producerController');

class ProducerApplication {
  constructor() {
    this.producerController = new ProducerController();
    this.isShuttingDown = false;
  }

  async initialize() {
    try {
      // Validate configuration
      validateConfig();
      logger.info('Configuration validated successfully');

      // Initialize producer controller
      await this.producerController.initialize();
      logger.info('Producer application initialized');

      // Setup graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to initialize producer application:', error);
      process.exit(1);
    }
  }

  async start() {
    try {
      await this.producerController.startProduction();
      logger.info('Producer application started successfully');

      // Log status periodically
      setInterval(() => {
        const status = this.producerController.getStatus();
        logger.debug('Producer status', status);
      }, 30000);

    } catch (error) {
      logger.error('Failed to start producer application:', error);
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
        await this.producerController.shutdown();
        logger.info('Producer application shutdown complete');
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
  const app = new ProducerApplication();
  app.run().catch(error => {
    logger.error('Unhandled error in producer application:', error);
    process.exit(1);
  });
}

module.exports = ProducerApplication;
