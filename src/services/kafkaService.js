const { Kafka, Partitioners } = require('kafkajs');
const logger = require('../utils/logger');
const { config } = require('../config');
const Redis = require('ioredis');
const redis = new Redis({
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true
});

redis.on('error', (err) => {
  logger.warn('Redis connection error:', err.message);
});

redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

class KafkaService {
  constructor() {
    this.kafka = null;
    this.producer = null;
    this.consumer = null;
    this.isConnected = false;
  }

  async initialize() {
    try {
      this.kafka = new Kafka(config.kafka);
      logger.info('Kafka client initialized');
    } catch (error) {
      logger.error('Failed to initialize Kafka client:', error);
      throw error;
    }
  }

  async createProducer() {
    if (!this.kafka) {
      throw new Error('Kafka client not initialized');
    }

    try {
      this.producer = this.kafka.producer({
        createPartitioner: Partitioners[config.producer.createPartitioner],
      });
      
      await this.producer.connect();
      this.isConnected = true;
      logger.info('Kafka producer connected successfully');
      
      return this.producer;
    } catch (error) {
      logger.error('Failed to connect producer:', error);
      throw error;
    }
  }

  async createConsumer(groupId = null) {
    if (!this.kafka) {
      throw new Error('Kafka client not initialized');
    }

    try {
      const consumerConfig = { 
        groupId: groupId || config.consumer.groupId 
      };
      
      this.consumer = this.kafka.consumer(consumerConfig);
      await this.consumer.connect();
      logger.info('Kafka consumer connected successfully');
      
      return this.consumer;
    } catch (error) {
      logger.error('Failed to connect consumer:', error);
      throw error;
    }
  }

  async sendMessage(topic, message) {
    if (!this.producer || !this.isConnected) {
      throw new Error('Producer not connected');
    }

    try {
      const payload = {
        topic,
        messages: [
          {
            value: JSON.stringify(message),
            timestamp: Date.now(),
          },
        ],
      };

      const result = await this.producer.send(payload);
      logger.debug('Message sent successfully', { topic, messageId: result });
      
      return result;
    } catch (error) {
      logger.error('Failed to send message:', error);
      throw error;
    }
  }

  async subscribeToTopic(topic, handler, options = {}) {
    if (!this.consumer) {
      throw new Error('Consumer not connected');
    }

    try {
      await this.consumer.subscribe({
        topic,
        fromBeginning: options.fromBeginning ?? config.consumer.fromBeginning,
      });

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const parsedMessage = JSON.parse(message.value.toString());
            await handler(parsedMessage, { topic, partition, message });
          } catch (parseError) {
            logger.error('Failed to parse message:', parseError);
            if (options.onParseError) {
              await options.onParseError(message.value.toString(), { topic, partition, message });
            }
          }
        },
        eachBatch: options.eachBatch,
      });

      logger.info(`Subscribed to topic: ${topic}`);
    } catch (error) {
      logger.error('Failed to subscribe to topic:', error);
      throw error;
    }
  }

  async disconnect() {
    const disconnectPromises = [];

    if (this.producer) {
      disconnectPromises.push(
        this.producer.disconnect().catch(error => {
          logger.error('Error disconnecting producer:', error);
        })
      );
    }

    if (this.consumer) {
      disconnectPromises.push(
        this.consumer.disconnect().catch(error => {
          logger.error('Error disconnecting consumer:', error);
        })
      );
    }

    await Promise.all(disconnectPromises);
    this.isConnected = false;
    logger.info('Kafka service disconnected');
  }

  async handleIncomingMessage(data) {
    const { price, time, symbol } = data;
    const key = `prices:${symbol}`;

    try {
      await redis.zadd(key, Date.now(), JSON.stringify(data));
      await redis.zremrangebyrank(key, 0, -51);
      logger.debug(`Cached ${symbol} price to Redis`);
    } catch (error) {
      logger.warn('Failed to cache to Redis:', error.message);
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      hasProducer: !!this.producer,
      hasConsumer: !!this.consumer,
    };
  }
}

module.exports = KafkaService;
