# Local Development Guide

This guide covers setting up and running the Crypto Kafka Streaming Platform locally without Docker using your existing Kafka configuration.

## Prerequisites

### Required Software
- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Git** (for version control)

### Network Requirements
- Access to your Kafka cluster (Aiven cloud)
- Open network connection to `kafka-35eadd43-chanuka-6c78.k.aivencloud.com:18468`
- SSL certificate file (`ca.pem`) in project root

## Quick Start

### 1. Setup Local Environment
```bash
# Run the local setup script
./scripts/setup-local.sh
```

This script will:
- Check Node.js installation
- Install dependencies
- Validate configuration
- Create development scripts
- Set up logging directories

### 2. Start All Services
```bash
# Start producer, consumer, and dashboard
./start-local.sh
```

### 3. Access Dashboard
Open http://localhost:3000 in your browser

### 4. Monitor Services
```bash
# Check service status
./status-local.sh

# View live logs
./logs-local.sh
```

### 5. Stop Services
```bash
# Stop all running services
./stop-local.sh
```

## Configuration

Your `.env` file is already configured with your Kafka settings:

```bash
# Kafka Configuration (Aiven Cloud)
KAFKA_BOOTSTRAP_SERVERS=kafka-35eadd43-chanuka-6c78.k.aivencloud.com:18468
KAFKA_USERNAME=avnadmin
KAFKA_PASSWORD=YOUR_AIVEN_PASSWORD
KAFKA_CLIENT_ID=crypto-service
KAFKA_SSL_REJECT_UNAUTHORIZED=true
KAFKA_CA_CERT=ca.pem

# Server Configuration
SERVER_PORT=3000
SERVER_HOST=localhost
CORS_ORIGIN=*

# Producer Configuration
KAFKA_TOPIC=crypto-prices
PRODUCER_INTERVAL_MS=5000
```

## Development Scripts

### Available Scripts
```bash
# Setup and validation
./scripts/setup-local.sh          # Initial setup
npm run validate                  # Validate configuration

# Service management
./start-local.sh                  # Start all services
./stop-local.sh                   # Stop all services
./status-local.sh                 # Check service status
./logs-local.sh                   # Monitor live logs

# Individual services
npm run dev:producer              # Start producer only
npm run dev:consumer              # Start consumer only
npm run dev:dashboard             # Start dashboard only

# Development tools
npm test                          # Run tests
npm run lint                      # Code linting
npm run lint:fix                  # Fix linting issues
```

## Service Architecture

### Producer Service
- **Purpose**: Generates crypto price data and publishes to Kafka
- **Port**: No public port (internal service)
- **Logs**: `logs/producer.log`
- **Process**: Runs in background with PID tracking

### Consumer Service
- **Purpose**: Consumes messages from Kafka and processes them
- **Port**: No public port (internal service)
- **Logs**: `logs/consumer.log`
- **Process**: Runs in background with PID tracking

### Dashboard Service
- **Purpose**: Web interface for real-time monitoring
- **Port**: 3000
- **URL**: http://localhost:3000
- **Logs**: `logs/dashboard.log`
- **Features**: WebSocket real-time updates, charts, metrics

## Troubleshooting

### Common Issues

#### 1. Kafka Connection Failed
**Symptoms**: Connection errors in logs
**Solutions**:
```bash
# Check network connectivity
telnet kafka-35eadd43-chanuka-6c78.k.aivencloud.com 18468

# Verify SSL certificate
ls -la ca.pem

# Check .env configuration
cat .env | grep KAFKA
```

#### 2. Port Already in Use
**Symptoms**: Dashboard fails to start
**Solutions**:
```bash
# Check what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change port in .env
echo "SERVER_PORT=3001" >> .env
```

#### 3. SSL Certificate Issues
**Symptoms**: SSL handshake errors
**Solutions**:
```bash
# Ensure certificate exists and is readable
ls -la ca.pem
chmod 600 ca.pem

# Verify certificate format
openssl x509 -in ca.pem -text -noout
```

#### 4. High Memory Usage
**Symptoms**: System becomes slow
**Solutions**:
```bash
# Check Node.js processes
ps aux | grep node

# Restart services
./stop-local.sh
./start-local.sh

# Check logs for memory leaks
tail -f logs/*.log
```

### Log Analysis

#### Producer Logs
```bash
# View producer logs
tail -f logs/producer.log

# Look for connection errors
grep "error" logs/producer.log

# Check message production
grep "Produced message" logs/producer.log
```

#### Consumer Logs
```bash
# View consumer logs
tail -f logs/consumer.log

# Look for message processing
grep "Received crypto message" logs/consumer.log

# Check for connection issues
grep "Connection" logs/consumer.log
```

#### Dashboard Logs
```bash
# View dashboard logs
tail -f logs/dashboard.log

# Check WebSocket connections
grep "Client connected" logs/dashboard.log

# Look for API errors
grep "ERROR" logs/dashboard.log
```

## Development Workflow

### 1. Making Changes
```bash
# Stop services
./stop-local.sh

# Make code changes
# Edit files in src/ directory

# Restart services
./start-local.sh

# Check logs for errors
./status-local.sh
```

### 2. Testing Changes
```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Check code quality
npm run lint
```

### 3. Debugging
```bash
# Start individual service with debug output
NODE_ENV=development npm run dev:producer

# Use Node.js debugger
node --inspect src/applications/producer.js
```

## Performance Monitoring

### Local Monitoring
```bash
# Check system resources
top -p $(pgrep node)

# Monitor network connections
netstat -an | grep :3000

# Check disk space
df -h logs/
```

### Application Metrics
- Access http://localhost:3000/api/status for service status
- Check dashboard for real-time metrics
- Monitor log files for error rates

## Security Considerations

### Local Development Security
- Your Kafka credentials are in `.env` file (don't commit to Git)
- SSL certificate is required for secure connections
- Local server binds to localhost only
- No external network exposure by default

### Best Practices
```bash
# Never commit .env file
echo ".env" >> .gitignore

# Keep SSL certificate secure
chmod 600 ca.pem

# Regularly update dependencies
npm audit fix
```

## Advanced Configuration

### Custom Topics
```bash
# Edit .env to change topic
echo "KAFKA_TOPIC=my-custom-topic" >> .env

# Or create multiple producers
cp src/applications/producer.js src/applications/producer-custom.js
# Edit the new file for custom configuration
```

### Multiple Consumers
```bash
# Start additional consumer with different group
KAFKA_CONSUMER_GROUP_ID=second-consumer-group npm run dev:consumer
```

### Custom Logging
```bash
# Change log level
echo "LOG_LEVEL=debug" >> .env

# Use simple format for development
echo "LOG_FORMAT=simple" >> .env
```

## Integration with External Tools

### IDE Integration
- **VS Code**: Install Node.js and Docker extensions
- **WebStorm**: Configure Node.js run configurations
- **Debugging**: Use built-in Node.js debugger

### API Testing
```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test status endpoint
curl http://localhost:3000/api/status

# Test recent messages
curl http://localhost:3000/api/messages/recent?limit=5
```

### WebSocket Testing
```bash
# Use wscat for WebSocket testing
npm install -g wscat
wscat -c ws://localhost:3000/socket.io/
```

This local development setup provides a complete Docker-free environment for developing and testing the Crypto Kafka Streaming Platform using your existing Aiven Kafka configuration.
