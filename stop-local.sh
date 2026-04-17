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
