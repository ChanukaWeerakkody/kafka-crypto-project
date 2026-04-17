#!/bin/bash

# Local Development Setup Script for Crypto Kafka Streaming Platform
# This script sets up the environment for local development without Docker

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

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed."
    exit 1
fi

print_status "Prerequisites check completed."

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p logs
mkdir -p certs

# Set permissions
chmod 755 logs certs

# Copy environment template if .env doesn't exist
if [ ! -f .env ]; then
    print_status "Creating .env file from template..."
    cp .env.example .env
    print_warning "Please edit .env file with your actual configuration before proceeding."
else
    print_status ".env file already exists."
fi

# Install dependencies
print_status "Installing Node.js dependencies..."
npm install

# Validate configuration
print_status "Validating configuration..."
node -e "
    try {
        require('./src/config').validateConfig();
        console.log('Configuration validation passed');
    } catch (error) {
        console.error('Configuration validation failed:', error.message);
        process.exit(1);
    }
    console.log('Kafka configuration validated successfully');
"

# Copy SSL certificate if it exists
if [ -f "ca.pem" ]; then
    print_status "Copying SSL certificate to certs directory..."
    cp ca.pem certs/ca.pem
    chmod 600 certs/ca.pem
else
    print_warning "SSL certificate (ca.pem) not found. Please ensure your Kafka SSL certificate is available."
fi

# Run tests
print_status "Running tests..."
npm test

# Create local development scripts
print_status "Creating local development scripts..."

# Create start script
cat > start-local.sh << 'EOF'
#!/bin/bash

# Local Development Start Script

echo "=== Starting Crypto Kafka Platform (Local Development) ==="

# Check if .env exists
if [ ! -f .env ]; then
    echo "Error: .env file not found. Please run ./scripts/setup-local.sh first."
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Start producer in background
echo "Starting producer..."
npm run dev:producer > logs/producer.log 2>&1 &
PRODUCER_PID=$!
echo "Producer PID: $PRODUCER_PID"

# Wait a moment for producer to start
sleep 2

# Start consumer in background
echo "Starting consumer..."
npm run dev:consumer > logs/consumer.log 2>&1 &
CONSUMER_PID=$!
echo "Consumer PID: $CONSUMER_PID"

# Wait a moment for consumer to start
sleep 2

# Start dashboard in background
echo "Starting dashboard..."
npm run dev:dashboard > logs/dashboard.log 2>&1 &
DASHBOARD_PID=$!
echo "Dashboard PID: $DASHBOARD_PID"

# Save PIDs to file
echo "$PRODUCER_PID" > .producer.pid
echo "$CONSUMER_PID" > .consumer.pid
echo "$DASHBOARD_PID" > .dashboard.pid

echo ""
echo "=== Services Started ==="
echo "Producer: PID $PRODUCER_PID (logs/producer.log)"
echo "Consumer: PID $CONSUMER_PID (logs/consumer.log)"
echo "Dashboard: PID $DASHBOARD_PID (logs/dashboard.log)"
echo ""
echo "Dashboard URL: http://localhost:3000"
echo ""
echo "To stop all services, run: ./stop-local.sh"
echo "To view logs, run: tail -f logs/[service].log"
EOF

chmod +x start-local.sh

# Create stop script
cat > stop-local.sh << 'EOF'
#!/bin/bash

# Local Development Stop Script

echo "=== Stopping Crypto Kafka Platform (Local Development) ==="

# Stop services if running
if [ -f .producer.pid ]; then
    PID=$(cat .producer.pid)
    if kill -0 $PID 2>/dev/null; then
        echo "Stopping producer (PID: $PID)..."
        kill $PID
    fi
    rm .producer.pid
fi

if [ -f .consumer.pid ]; then
    PID=$(cat .consumer.pid)
    if kill -0 $PID 2>/dev/null; then
        echo "Stopping consumer (PID: $PID)..."
        kill $PID
    fi
    rm .consumer.pid
fi

if [ -f .dashboard.pid ]; then
    PID=$(cat .dashboard.pid)
    if kill -0 $PID 2>/dev/null; then
        echo "Stopping dashboard (PID: $PID)..."
        kill $PID
    fi
    rm .dashboard.pid
fi

echo "All services stopped."
EOF

chmod +x stop-local.sh

# Create status script
cat > status-local.sh << 'EOF'
#!/bin/bash

# Local Development Status Script

echo "=== Crypto Kafka Platform Status ==="
echo "Timestamp: $(date)"
echo

# Check if services are running
check_service() {
    local service=$1
    local pid_file=".$service.pid"
    
    if [ -f $pid_file ]; then
        local pid=$(cat $pid_file)
        if kill -0 $pid 2>/dev/null; then
            echo "Service: $service - RUNNING (PID: $pid)"
            return 0
        else
            echo "Service: $service - STOPPED (stale PID file)"
            rm $pid_file
            return 1
        fi
    else
        echo "Service: $service - STOPPED"
        return 1
    fi
}

# Check each service
check_service "producer"
check_service "consumer"
check_service "dashboard"

echo

# Check dashboard accessibility
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "Dashboard API: ACCESSIBLE"
else
    echo "Dashboard API: NOT ACCESSIBLE"
fi

echo

# Show recent log entries
echo "=== Recent Log Entries ==="
echo "Producer (last 5 lines):"
tail -5 logs/producer.log 2>/dev/null || echo "No producer logs"
echo
echo "Consumer (last 5 lines):"
tail -5 logs/consumer.log 2>/dev/null || echo "No consumer logs"
echo
echo "Dashboard (last 5 lines):"
tail -5 logs/dashboard.log 2>/dev/null || echo "No dashboard logs"
EOF

chmod +x status-local.sh

# Create log monitoring script
cat > logs-local.sh << 'EOF'
#!/bin/bash

# Local Development Log Monitoring Script

echo "=== Crypto Kafka Platform Logs ==="
echo "Press Ctrl+C to stop monitoring"
echo

# Function to show logs
show_logs() {
    local service=$1
    local log_file="logs/$service.log"
    
    if [ -f $log_file ]; then
        echo "=== $service Logs ==="
        tail -f $log_file &
        local pid=$!
        echo $pid > .$service.log.pid
    else
        echo "No log file found for $service"
    fi
}

# Start monitoring all services
show_logs "producer"
show_logs "consumer"
show_logs "dashboard"

# Wait for Ctrl+C
trap 'echo "Stopping log monitoring..."; kill $(cat .*.log.pid 2>/dev/null); rm -f .*.log.pid; exit 0' INT

# Keep script running
while true; do
    sleep 1
done
EOF

chmod +x logs-local.sh

# Print completion message
print_status "Local development setup completed successfully!"
echo
print_status "Next steps:"
echo "1. Ensure your Kafka cluster is accessible from your network"
echo "2. Verify SSL certificate (ca.pem) is in the project root"
echo "3. Start all services: ./start-local.sh"
echo "4. Check status: ./status-local.sh"
echo "5. Access dashboard: http://localhost:3000"
echo "6. Monitor logs: ./logs-local.sh"
echo "7. Stop services: ./stop-local.sh"
echo
print_warning "Important notes:"
echo "- Make sure your Kafka cluster allows connections from your IP"
echo "- Check firewall settings if connection issues occur"
echo "- Monitor logs for any connection or authentication errors"
echo
print_status "For troubleshooting, check the logs directory and run ./status-local.sh"
