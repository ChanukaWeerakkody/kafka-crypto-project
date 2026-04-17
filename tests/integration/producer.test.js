const request = require('supertest');
const ProducerController = require('../../src/controllers/producerController');

describe('Producer Integration Tests', () => {
  let producerController;

  beforeEach(async () => {
    // Mock environment variables for testing
    process.env.NODE_ENV = 'test';
    process.env.KAFKA_BOOTSTRAP_SERVERS = 'localhost:9092';
    process.env.KAFKA_USERNAME = 'test-user';
    process.env.KAFKA_PASSWORD = 'test-pass';
    
    producerController = new ProducerController();
  });

  afterEach(async () => {
    if (producerController) {
      await producerController.shutdown();
    }
  });

  describe('Producer Lifecycle', () => {
    it('should initialize producer successfully', async () => {
      // Mock the Kafka service to avoid actual connection
      producerController.kafkaService.initialize = jest.fn();
      producerController.kafkaService.createProducer = jest.fn();
      
      await expect(producerController.initialize()).resolves.not.toThrow();
    });

    it('should handle initialization failure gracefully', async () => {
      producerController.kafkaService.initialize = jest.fn().mockRejectedValue(new Error('Connection failed'));
      
      await expect(producerController.initialize()).rejects.toThrow('Connection failed');
    });
  });

  describe('Message Production', () => {
    beforeEach(async () => {
      producerController.kafkaService.initialize = jest.fn();
      producerController.kafkaService.createProducer = jest.fn();
      producerController.kafkaService.sendMessage = jest.fn();
      
      await producerController.initialize();
    });

    it('should produce single message successfully', async () => {
      producerController.kafkaService.sendMessage.mockResolvedValue({ topic: 'test', partition: 0, offset: 0 });
      
      const result = await producerController.produceSingleMessage('BTC');
      
      expect(result).toBeDefined();
      expect(producerController.kafkaService.sendMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          symbol: 'BTC',
          price: expect.any(Number),
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle message production failure', async () => {
      producerController.kafkaService.sendMessage.mockRejectedValue(new Error('Kafka error'));
      
      await expect(producerController.produceSingleMessage('BTC')).rejects.toThrow('Kafka error');
    });
  });

  describe('Status Monitoring', () => {
    beforeEach(() => {
      producerController.kafkaService.getConnectionStatus = jest.fn().mockReturnValue({
        isConnected: true,
        hasProducer: true,
        hasConsumer: false,
      });
    });

    it('should return current status', () => {
      const status = producerController.getStatus();
      
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('connectionStatus');
      expect(status).toHaveProperty('supportedSymbols');
      expect(status).toHaveProperty('marketStats');
      expect(status).toHaveProperty('interval');
      expect(status).toHaveProperty('topic');
    });
  });
});
