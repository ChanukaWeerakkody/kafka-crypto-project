#!/usr/bin/env node

const logger = require('../utils/logger');
const { config, validateConfig } = require('../config');
const DashboardController = require('../controllers/dashboardController');

class DashboardApplication {
  constructor() {
    this.dashboardController = new DashboardController();
    this.isShuttingDown = false;
  }

  async initialize() {
    try {
      // Validate configuration
      validateConfig();
      logger.info('Configuration validated successfully');

      // Initialize dashboard controller
      await this.dashboardController.initialize();
      logger.info('Dashboard application initialized');

      // Setup graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to initialize dashboard application:', error);
      process.exit(1);
    }
  }

  async start() {
    try {
      await this.dashboardController.start();
      logger.info('Dashboard application started successfully');

      // Log status periodically
      setInterval(() => {
        const status = this.dashboardController.getStatus();
        logger.debug('Dashboard status', status);
      }, 60000);

    } catch (error) {
      logger.error('Failed to start dashboard application:', error);
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
        await this.dashboardController.stop();
        logger.info('Dashboard application shutdown complete');
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
  const app = new DashboardApplication();
  app.run().catch(error => {
    logger.error('Unhandled error in dashboard application:', error);
    process.exit(1);
  });
}

module.exports = DashboardApplication;
