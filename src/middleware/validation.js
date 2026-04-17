const Joi = require('joi');
const { AppError } = require('./errorHandler');

const cryptoMessageSchema = Joi.object({
  symbol: Joi.string().valid('BTC', 'ETH', 'BNB', 'ADA', 'SOL').required(),
  price: Joi.number().positive().required(),
  timestamp: Joi.string().isoDate().required(),
  volume: Joi.number().positive().optional(),
  change24h: Joi.number().optional(),
  trend: Joi.string().valid('up', 'down').optional(),
});

const configSchema = Joi.object({
  kafka: Joi.object({
    clientId: Joi.string().required(),
    brokers: Joi.array().items(Joi.string()).min(1).required(),
    ssl: Joi.object({
      rejectUnauthorized: Joi.boolean().required(),
      ca: Joi.array().items(Joi.string()).optional(),
    }).required(),
    sasl: Joi.object({
      mechanism: Joi.string().valid('scram-sha-256').required(),
      username: Joi.string().required(),
      password: Joi.string().required(),
    }).optional(),
  }).required(),
  
  server: Joi.object({
    port: Joi.number().port().required(),
    host: Joi.string().required(),
    cors: Joi.object({
      origin: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).required(),
      credentials: Joi.boolean().required(),
    }).required(),
  }).required(),
  
  producer: Joi.object({
    topic: Joi.string().required(),
    interval: Joi.number().positive().required(),
    createPartitioner: Joi.string().required(),
  }).required(),
  
  consumer: Joi.object({
    groupId: Joi.string().required(),
    fromBeginning: Joi.boolean().required(),
  }).required(),
  
  logging: Joi.object({
    level: Joi.string().valid('error', 'warn', 'info', 'debug').required(),
    format: Joi.string().valid('json', 'simple').required(),
  }).required(),
});

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      return next(new AppError(message, 400));
    }
    next();
  };
};

const validateCryptoMessage = (data) => {
  const { error } = cryptoMessageSchema.validate(data);
  if (error) {
    throw new AppError(`Invalid crypto message: ${error.details[0].message}`, 400);
  }
  return true;
};

const validateConfig = (config) => {
  const { error } = configSchema.validate(config);
  if (error) {
    throw new AppError(`Configuration validation failed: ${error.details[0].message}`, 500);
  }
  return true;
};

const sanitizeInput = (req, res, next) => {
  // Remove potential XSS attacks
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      }
    });
  }
  next();
};

module.exports = {
  validate,
  validateCryptoMessage,
  validateConfig,
  sanitizeInput,
  schemas: {
    cryptoMessage: cryptoMessageSchema,
    config: configSchema,
  },
};
