# Crypto Kafka Streaming Platform

A production-grade, scalable real-time cryptocurrency data streaming platform built with Kafka, Node.js, and modern web technologies.

## Architecture Overview

This platform implements a clean, modular architecture following industry best practices:

```
src/
|-- applications/          # Entry points for different services
|   |-- producer.js       # Crypto data producer
|   |-- consumer.js       # Message consumer
|   |-- dashboard.js      # Web dashboard server
|-- controllers/          # Business logic controllers
|   |-- producerController.js
|   |-- consumerController.js
|   |-- dashboardController.js
|-- services/            # Core business services
|   |-- kafkaService.js  # Kafka abstraction layer
|   |-- cryptoDataService.js # Crypto data generation
|-- middleware/          # Express middleware
|   |-- errorHandler.js  # Error handling
|   |-- validation.js    # Input validation
|-- utils/              # Utility functions
|   |-- logger.js        # Winston logging
|-- config/             # Configuration management
|   |-- index.js         # Centralized config
public/                 # Static frontend assets
tests/                 # Test suite
```

## Features

### Production-Grade Features
- **Modular Architecture**: Clean separation of concerns
- **Configuration Management**: Environment-based configuration with validation
- **Comprehensive Logging**: Winston-based structured logging
- **Error Handling**: Centralized error handling with custom error types
- **Input Validation**: Joi-based request validation
- **Security**: Non-root Docker containers, input sanitization
- **Health Checks**: Docker health checks and API endpoints
- **Resource Limits**: CPU and memory constraints in Docker
- **Testing**: Unit and integration tests with Jest

### Business Features
- **Multi-Crypto Support**: BTC, ETH, BNB, ADA, SOL
- **Real-time Data**: WebSocket streaming to dashboard
- **Market Simulation**: Realistic price generation with trends
- **Analytics Dashboard**: Live charts and metrics
- **Message Buffering**: In-memory message history
- **Performance Monitoring**: Message rate and system metrics

## Quick Start

### Prerequisites
- Node.js >= 18.0.0
- Kafka broker (Aiven Cloud recommended)
- SSL certificate file (ca.pem)

### 1. Environment Setup
```bash
# Run local setup script (Docker-free)
./scripts/setup-local.sh

# Or manual setup:
# Copy environment template
cp .env.example .env
# Edit with your Kafka configuration
# Install dependencies
npm install
```

### 2. Local Development (Docker-Free)
```bash
# Start all services
./start-local.sh

# Check status
./status-local.sh

# Monitor logs
./logs-local.sh

# Stop services
./stop-local.sh
```

### 3. Alternative: Individual Services
```bash
# Start services individually
npm run dev:producer
npm run dev:consumer
npm run dev:dashboard
```

### 4. Access Dashboard
Open http://localhost:3000 to view the real-time dashboard.

### 5. Docker Option (Optional)
```bash
# For containerized deployment
docker-compose up --build
```

## Configuration

### Environment Variables
```bash
# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS=kafka-xxx.cloud.com:12345
KAFKA_USERNAME=your_username
KAFKA_PASSWORD=your_password
KAFKA_CLIENT_ID=crypto-service
KAFKA_SSL_REJECT_UNAUTHORIZED=true
KAFKA_CA_CERT=path/to/ca.pem

# Server Configuration
SERVER_PORT=3000
SERVER_HOST=0.0.0.0
CORS_ORIGIN=*

# Producer Configuration
KAFKA_TOPIC=hii
PRODUCER_INTERVAL_MS=5000
KAFKA_PARTITIONER=LegacyPartitioner

# Consumer Configuration
KAFKA_CONSUMER_GROUP_ID=crypto-consumer-group
KAFKA_CONSUMER_FROM_BEGINNING=false

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json

# Environment
NODE_ENV=development
```

## Deployment

### Local Development (Recommended)
```bash
# Setup and start all services
./scripts/setup-local.sh
./start-local.sh

# Monitor and manage
./status-local.sh
./logs-local.sh
./stop-local.sh
```

### Docker Deployment (Optional)
```bash
# Build production image
npm run docker:build

# Run individual services
npm run docker:run:producer
npm run docker:run:consumer
npm run docker:run:dashboard

# Or use Docker Compose for full stack
docker-compose up -d
```

### Production Considerations
- Use environment-specific `.env` files
- Configure proper SSL/TLS certificates
- Set up log rotation for `logs/` directory
- Configure monitoring and alerting
- Use secrets management for sensitive data
- See DEPLOYMENT.md for detailed production guide

## API Endpoints

### Dashboard API
- `GET /api/health` - Health check
- `GET /api/status` - Service status
- `GET /api/messages/recent?limit=20` - Recent messages

### WebSocket Events
- `crypto-update` - Real-time price updates
- `initial-data` - Historical data on connection

## Monitoring

### Health Checks
```bash
# Check service health
curl http://localhost:3000/api/health

# Check all services status
./status-local.sh

# Docker health status (if using Docker)
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Logs
```bash
# Live log monitoring
./logs-local.sh

# Individual service logs
tail -f logs/producer.log
tail -f logs/consumer.log
tail -f logs/dashboard.log

# Docker logs (if using Docker)
docker-compose logs -f crypto-dashboard
```

### Metrics
The dashboard provides real-time metrics:
- Messages per second
- Total message count
- Connected clients
- Buffer size
- System uptime

## Testing

### Run Tests
```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Linting
npm run lint
npm run lint:fix
```

### Test Structure
- Unit tests in `tests/unit/`
- Integration tests in `tests/integration/`
- Coverage target: 80% across all metrics

## Security

### Implemented Security Measures
- Non-root Docker containers
- Input validation and sanitization
- Environment variable protection
- SSL/TLS for Kafka connections
- Rate limiting on API endpoints
- CORS configuration

### Security Best Practices
- Regularly update dependencies
- Use secrets management
- Implement proper authentication
- Monitor for security vulnerabilities
- Use HTTPS in production

## Performance

### Optimization Features
- Connection pooling
- Message buffering
- Efficient data structures
- Minimal memory footprint
- Lazy loading of components

### Scaling Considerations
- Horizontal scaling with multiple consumers
- Kafka partitioning for parallel processing
- Load balancing for dashboard instances
- Database sharding for persistence (if added)

## Troubleshooting

### Common Issues

#### Kafka Connection Issues
```bash
# Check Kafka connectivity
telnet kafka-35eadd43-chanuka-6c78.k.aivencloud.com 18468

# Verify SSL certificates
openssl s_client -connect kafka-35eadd43-chanuka-6c78.k.aivencloud.com:18468 -showcerts

# Check configuration
npm run validate
```

#### Service Not Starting
```bash
# Check configuration
npm run validate

# View detailed logs
./status-local.sh

# Check individual service logs
tail -f logs/producer.log
tail -f logs/consumer.log
tail -f logs/dashboard.log
```

#### Dashboard Not Loading
```bash
# Check port availability
lsof -i :3000

# Verify API health
curl http://localhost:3000/api/health

# Check dashboard logs
tail -f logs/dashboard.log
```

#### SSL Certificate Issues
```bash
# Verify certificate exists and is readable
ls -la ca.pem
chmod 600 ca.pem

# Check certificate format
openssl x509 -in ca.pem -text -noout
```

## Development

### Adding New Features
1. Add services to `src/services/`
2. Create controllers in `src/controllers/`
3. Add tests in `tests/`
4. Update configuration if needed
5. Update documentation

### Code Style
- ESLint configuration with Standard style
- Pre-commit hooks recommended
- Follow existing patterns and conventions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review logs for error details
- See LOCAL-DEVELOPMENT.md for detailed local setup guide
- See DEPLOYMENT.md for production deployment guide
