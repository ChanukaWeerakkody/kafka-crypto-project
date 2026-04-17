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
