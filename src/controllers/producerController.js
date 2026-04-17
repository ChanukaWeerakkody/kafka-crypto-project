const logger = require('../utils/logger');
const KafkaService = require('../services/kafkaService');
const CryptoDataService = require('../services/cryptoDataService');
const { config } = require('../config');

class ProducerController {
  constructor() {
    this.kafkaService = new KafkaService();
    this.cryptoService = new CryptoDataService();
    this.isRunning = false;
    this.intervalId = null;
  }

  async initialize() {
    try {
      await this.kafkaService.initialize();
      await this.kafkaService.createProducer();
      logger.info('Producer controller initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize producer controller:', error);
      throw error;
    }
  }

  async startProduction() {
    if (this.isRunning) {
      logger.warn('Producer is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting crypto price production');

    this.intervalId = setInterval(async () => {
      try {
        const cryptoData = this.cryptoService.generateAllPrices();
        
        for (const data of cryptoData) {
          try {
            this.cryptoService.validatePriceData(data);
            await this.kafkaService.sendMessage(config.producer.topic, data);
            logger.debug(`Produced message for ${data.symbol}: $${data.price}`);
          } catch (error) {
            logger.error(`Failed to produce message for ${data.symbol}:`, error);
          }
        }
      } catch (error) {
        logger.error('Error in production cycle:', error);
      }
    }, config.producer.interval);

    logger.info(`Producer started with interval: ${config.producer.interval}ms`);
  }

  async stopProduction() {
    if (!this.isRunning) {
      logger.warn('Producer is not running');
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info('Producer stopped');
  }

  async produceSingleMessage(symbol) {
    try {
      const cryptoData = this.cryptoService.generateCryptoPrice(symbol);
      this.cryptoService.validatePriceData(cryptoData);
      
      const result = await this.kafkaService.sendMessage(config.producer.topic, cryptoData);
      logger.info(`Single message produced for ${symbol}: $${cryptoData.price}`);
      
      return result;
    } catch (error) {
      logger.error(`Failed to produce single message for ${symbol}:`, error);
      throw error;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      connectionStatus: this.kafkaService.getConnectionStatus(),
      supportedSymbols: this.cryptoService.getSupportedSymbols(),
      marketStats: this.cryptoService.getMarketStats(),
      interval: config.producer.interval,
      topic: config.producer.topic,
    };
  }

  async shutdown() {
    logger.info('Shutting down producer controller');
    
    await this.stopProduction();
    await this.kafkaService.disconnect();
    
    logger.info('Producer controller shutdown complete');
  }
}

module.exports = ProducerController;
