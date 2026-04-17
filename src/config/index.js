require('dotenv').config();

const config = {
  kafka: {
    clientId: process.env.KAFKA_CLIENT_ID || 'crypto-service',
    brokers: (process.env.KAFKA_BOOTSTRAP_SERVERS || '').split(',').filter(Boolean),
    ssl: {
      rejectUnauthorized: process.env.KAFKA_SSL_REJECT_UNAUTHORIZED === 'true',
      ca: process.env.KAFKA_CA_CERT ? [require('fs').readFileSync(process.env.KAFKA_CA_CERT, 'utf-8')] : undefined,
    },
    sasl: process.env.KAFKA_USERNAME && process.env.KAFKA_PASSWORD ? {
      mechanism: 'scram-sha-256',
      username: process.env.KAFKA_USERNAME,
      password: process.env.KAFKA_PASSWORD,
    } : undefined,
  },
  
  server: {
    port: parseInt(process.env.SERVER_PORT || '3000'),
    host: process.env.SERVER_HOST || '0.0.0.0',
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    },
  },
  
  producer: {
    topic: process.env.KAFKA_TOPIC || 'crypto-prices',
    interval: parseInt(process.env.PRODUCER_INTERVAL_MS || '5000'),
    createPartitioner: process.env.KAFKA_PARTITIONER || 'LegacyPartitioner',
  },
  
  consumer: {
    groupId: process.env.KAFKA_CONSUMER_GROUP_ID || 'crypto-consumer-group',
    fromBeginning: process.env.KAFKA_CONSUMER_FROM_BEGINNING === 'true',
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
  
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    metricsPort: parseInt(process.env.METRICS_PORT || '9090'),
  },
};

function validateConfig() {
  const errors = [];
  
  if (!config.kafka.brokers || config.kafka.brokers.length === 0) {
    errors.push('KAFKA_BOOTSTRAP_SERVERS is required');
  }
  
  if (config.kafka.sasl && (!config.kafka.sasl.username || !config.kafka.sasl.password)) {
    errors.push('KAFKA_USERNAME and KAFKA_PASSWORD are required when SASL is enabled');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
  }
}

module.exports = { config, validateConfig };
