const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Kafka connection error
  if (err.name === 'KafkaJSConnectionError') {
    const message = 'Failed to connect to Kafka broker';
    error = new AppError(message, 503);
  }

  // Kafka protocol error
  if (err.name === 'KafkaJSProtocolError') {
    const message = 'Kafka protocol error occurred';
    error = new AppError(message, 503);
  }

  // Validation error
  if (err.name === 'ValidationError') {
    const message = 'Invalid data provided';
    error = new AppError(message, 400);
  }

  // JSON parse error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    const message = 'Invalid JSON in request body';
    error = new AppError(message, 400);
  }

  // Default error
  if (!error.isOperational) {
    const message = 'Something went wrong';
    error = new AppError(message, 500);
  }

  res.status(error.statusCode).json({
    status: error.status,
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

const notFound = (req, res, next) => {
  const error = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
  next(error);
};

module.exports = { AppError, errorHandler, catchAsync, notFound };
