const logger = require('../utils/logger');
const KafkaService = require('../services/kafkaService');
const { config } = require('../config');

class ConsumerController {
  constructor() {
    this.kafkaService = new KafkaService();
    this.messageHandlers = new Map();
    this.isRunning = false;
  }

  async initialize(groupId = null) {
    try {
      await this.kafkaService.initialize();
      await this.kafkaService.createConsumer(groupId);
      logger.info('Consumer controller initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize consumer controller:', error);
      throw error;
    }
  }

  registerHandler(topic, handler, options = {}) {
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }

    this.messageHandlers.set(topic, { handler, options });
    logger.info(`Handler registered for topic: ${topic}`);
  }

  async startConsuming(topics = null) {
    if (this.isRunning) {
      logger.warn('Consumer is already running');
      return;
    }

    if (this.messageHandlers.size === 0) {
      throw new Error('No message handlers registered');
    }

    this.isRunning = true;
    logger.info('Starting message consumption');

    const topicsToSubscribe = topics || Array.from(this.messageHandlers.keys());

    for (const topic of topicsToSubscribe) {
      const handlerConfig = this.messageHandlers.get(topic);
      if (handlerConfig) {
        try {
          await this.kafkaService.subscribeToTopic(
            topic,
            handlerConfig.handler,
            handlerConfig.options
          );
        } catch (error) {
          logger.error(`Failed to subscribe to topic ${topic}:`, error);
          throw error;
        }
      }
    }

    logger.info(`Consumer started for topics: ${topicsToSubscribe.join(', ')}`);
  }

  async stopConsuming() {
    if (!this.isRunning) {
      logger.warn('Consumer is not running');
      return;
    }

    this.isRunning = false;
    await this.kafkaService.disconnect();
    logger.info('Consumer stopped');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      connectionStatus: this.kafkaService.getConnectionStatus(),
      registeredHandlers: Array.from(this.messageHandlers.keys()),
    };
  }

  createMessageHandler(handlerFunction) {
    return async (message, metadata) => {
      try {
        await handlerFunction(message, metadata);
        logger.debug(`Message processed successfully from topic: ${metadata.topic}`);
      } catch (error) {
        logger.error(`Error processing message from topic ${metadata.topic}:`, error);
        
        // In production, you might want to implement dead letter queue logic here
        if (error.name === 'ValidationError') {
          logger.warn('Validation error - skipping message');
          return;
        }
        
        throw error; // Re-throw for Kafka to handle retry logic
      }
    };
  }

  async shutdown() {
    logger.info('Shutting down consumer controller');
    await this.stopConsuming();
    logger.info('Consumer controller shutdown complete');
  }
}

module.exports = ConsumerController;
