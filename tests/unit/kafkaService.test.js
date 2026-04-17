const KafkaService = require('../../src/services/kafkaService');

// Mock kafkajs
jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    producer: jest.fn().mockReturnValue({
      connect: jest.fn(),
      send: jest.fn(),
      disconnect: jest.fn(),
    }),
    consumer: jest.fn().mockReturnValue({
      connect: jest.fn(),
      subscribe: jest.fn(),
      run: jest.fn(),
      disconnect: jest.fn(),
    }),
  })),
  Partitioners: {
    LegacyPartitioner: 'LegacyPartitioner',
  },
}));

describe('KafkaService', () => {
  let kafkaService;
  let mockConfig;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    mockConfig = {
      kafka: {
        clientId: 'test-client',
        brokers: ['localhost:9092'],
        ssl: {
          rejectUnauthorized: true,
          ca: ['test-cert'],
        },
        sasl: {
          mechanism: 'scram-sha-256',
          username: 'test-user',
          password: 'test-pass',
        },
      },
    };
    
    // Mock process.env
    process.env.KAFKA_BOOTSTRAP_SERVERS = 'localhost:9092';
    process.env.KAFKA_USERNAME = 'test-user';
    process.env.KAFKA_PASSWORD = 'test-pass';
    
    kafkaService = new KafkaService();
  });

  describe('initialize', () => {
    it('should initialize Kafka client successfully', async () => {
      await kafkaService.initialize();
      expect(kafkaService.kafka).toBeDefined();
    });
  });

  describe('createProducer', () => {
    it('should create and connect producer', async () => {
      await kafkaService.initialize();
      const producer = await kafkaService.createProducer();
      
      expect(producer).toBeDefined();
      expect(kafkaService.isConnected).toBe(true);
    });

    it('should throw error if Kafka client not initialized', async () => {
      await expect(kafkaService.createProducer()).rejects.toThrow('Kafka client not initialized');
    });
  });

  describe('createConsumer', () => {
    it('should create and connect consumer', async () => {
      await kafkaService.initialize();
      const consumer = await kafkaService.createConsumer();
      
      expect(consumer).toBeDefined();
    });

    it('should throw error if Kafka client not initialized', async () => {
      await expect(kafkaService.createConsumer()).rejects.toThrow('Kafka client not initialized');
    });
  });

  describe('sendMessage', () => {
    beforeEach(async () => {
      await kafkaService.initialize();
      await kafkaService.createProducer();
    });

    it('should send message successfully', async () => {
      const message = { symbol: 'BTC', price: 50000 };
      const result = await kafkaService.sendMessage('test-topic', message);
      
      expect(result).toBeDefined();
    });

    it('should throw error if producer not connected', async () => {
      kafkaService.isConnected = false;
      
      await expect(kafkaService.sendMessage('test-topic', {}))
        .rejects.toThrow('Producer not connected');
    });
  });

  describe('subscribeToTopic', () => {
    beforeEach(async () => {
      await kafkaService.initialize();
      await kafkaService.createConsumer();
    });

    it('should subscribe to topic and handle messages', async () => {
      const handler = jest.fn();
      
      await kafkaService.subscribeToTopic('test-topic', handler);
      
      expect(kafkaService.consumer.subscribe).toHaveBeenCalledWith({
        topic: 'test-topic',
        fromBeginning: false,
      });
      expect(kafkaService.consumer.run).toHaveBeenCalled();
    });

    it('should throw error if consumer not connected', async () => {
      kafkaService.consumer = null;
      
      await expect(kafkaService.subscribeToTopic('test-topic', jest.fn()))
        .rejects.toThrow('Consumer not connected');
    });
  });

  describe('getConnectionStatus', () => {
    it('should return connection status', () => {
      const status = kafkaService.getConnectionStatus();
      
      expect(status).toHaveProperty('isConnected');
      expect(status).toHaveProperty('hasProducer');
      expect(status).toHaveProperty('hasConsumer');
    });
  });

  describe('disconnect', () => {
    it('should disconnect producer and consumer', async () => {
      await kafkaService.initialize();
      await kafkaService.createProducer();
      await kafkaService.createConsumer();
      
      await kafkaService.disconnect();
      
      expect(kafkaService.producer.disconnect).toHaveBeenCalled();
      expect(kafkaService.consumer.disconnect).toHaveBeenCalled();
      expect(kafkaService.isConnected).toBe(false);
    });
  });
});
