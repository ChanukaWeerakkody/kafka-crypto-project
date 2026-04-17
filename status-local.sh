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
