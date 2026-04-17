#!/bin/bash

# Production Setup Script for Crypto Kafka Streaming Platform
# This script sets up the environment for production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check prerequisites
print_status "Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check Node.js (for local development)
if ! command -v node &> /dev/null; then
    print_warning "Node.js is not installed. Required for local development only."
fi

print_status "Prerequisites check completed."

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p logs
mkdir -p certs
mkdir -p data

# Set permissions
chmod 755 logs certs data
chmod 600 certs/* 2>/dev/null || true

# Copy environment template if .env doesn't exist
if [ ! -f .env ]; then
    print_status "Creating .env file from template..."
    cp .env.example .env
    print_warning "Please edit .env file with your actual configuration before proceeding."
else
    print_status ".env file already exists."
fi

# Install dependencies
if command -v node &> /dev/null; then
    print_status "Installing Node.js dependencies..."
    npm install
    npm ci --only=production
fi

# Validate configuration
print_status "Validating configuration..."
if command -v node &> /dev/null; then
    node -e "
        try {
            require('./src/config').validateConfig();
            console.log('Configuration validation passed');
        } catch (error) {
            console.error('Configuration validation failed:', error.message);
            process.exit(1);
        }
    "
else
    print_warning "Skipping configuration validation (Node.js not available)"
fi

# Build Docker image
print_status "Building Docker image..."
docker build -t kafka-crypto-prod:latest .

# Run tests (if Node.js available)
if command -v node &> /dev/null; then
    print_status "Running tests..."
    npm test
else
    print_warning "Skipping tests (Node.js not available)"
fi

# Create logrotate configuration
print_status "Setting up log rotation..."
sudo tee /etc/logrotate.d/crypto-kafka > /dev/null <<EOF
$(pwd)/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $(whoami) $(whoami)
    postrotate
        docker-compose restart crypto-producer crypto-consumer crypto-dashboard 2>/dev/null || true
    endscript
}
EOF

# Create systemd service files (optional)
if command -v systemctl &> /dev/null; then
    print_status "Creating systemd service files..."
    
    # Create systemd directory
    sudo mkdir -p /etc/systemd/system
    
    # Producer service
    sudo tee /etc/systemd/system/crypto-producer.service > /dev/null <<EOF
[Unit]
Description=Crypto Kafka Producer
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/docker-compose up -d crypto-producer
ExecStop=/usr/bin/docker-compose stop crypto-producer
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

    # Consumer service
    sudo tee /etc/systemd/system/crypto-consumer.service > /dev/null <<EOF
[Unit]
Description=Crypto Kafka Consumer
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/docker-compose up -d crypto-consumer
ExecStop=/usr/bin/docker-compose stop crypto-consumer
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

    # Dashboard service
    sudo tee /etc/systemd/system/crypto-dashboard.service > /dev/null <<EOF
[Unit]
Description=Crypto Kafka Dashboard
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/docker-compose up -d crypto-dashboard
ExecStop=/usr/bin/docker-compose stop crypto-dashboard
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd
    sudo systemctl daemon-reload
    
    print_status "Systemd services created. Use 'systemctl enable crypto-producer' to enable auto-start."
fi

# Create monitoring script
print_status "Creating monitoring script..."
cat > monitor.sh << 'EOF'
#!/bin/bash

# Monitoring script for Crypto Kafka Platform
# This script checks the health of all services

echo "=== Crypto Kafka Platform Health Check ==="
echo "Timestamp: $(date)"
echo

# Check Docker containers
echo "Docker Containers:"
docker-compose ps
echo

# Check service health
echo "Service Health:"
curl -s http://localhost:3000/api/health | jq . || echo "Dashboard not responding"
echo

# Check logs for errors
echo "Recent Errors:"
docker-compose logs --tail=10 | grep -i error || echo "No recent errors"
echo

# Check resource usage
echo "Resource Usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
echo

# Check disk space
echo "Disk Usage:"
df -h | grep -E "(Filesystem|/dev/)"
echo
EOF

chmod +x monitor.sh

# Create backup script
print_status "Creating backup script..."
cat > backup.sh << 'EOF'
#!/bin/bash

# Backup script for Crypto Kafka Platform

BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Creating backup in $BACKUP_DIR..."

# Backup configuration
cp .env "$BACKUP_DIR/"
cp docker-compose.yml "$BACKUP_DIR/"

# Backup logs
cp -r logs "$BACKUP_DIR/" 2>/dev/null || true

# Backup certificates
cp -r certs "$BACKUP_DIR/" 2>/dev/null || true

# Create compressed backup
tar -czf "${BACKUP_DIR}.tar.gz" -C backups "$(basename $BACKUP_DIR)"
rm -rf "$BACKUP_DIR"

echo "Backup completed: ${BACKUP_DIR}.tar.gz"
EOF

chmod +x backup.sh

# Print completion message
print_status "Setup completed successfully!"
echo
print_status "Next steps:"
echo "1. Edit .env file with your actual Kafka configuration"
echo "2. Place your SSL certificates in the certs/ directory"
echo "3. Start the services: docker-compose up -d"
echo "4. Monitor the services: ./monitor.sh"
echo "5. Access the dashboard: http://localhost:3000"
echo
print_status "For production deployment, see DEPLOYMENT.md"
echo
print_warning "Remember to:"
echo "- Configure proper SSL certificates"
echo "- Set up monitoring and alerting"
echo "- Regularly run ./backup.sh"
echo "- Review security configurations"
