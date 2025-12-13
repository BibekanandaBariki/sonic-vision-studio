#!/bin/bash
# scripts/check_env_and_endpoints.sh

echo "=== Checking Environment Variables ==="
if [ -f "frontend/.env" ]; then
    echo "frontend/.env exists"
    grep "VITE_" frontend/.env
else
    echo "ERROR: frontend/.env missing"
fi

echo "=== Checking Endpoints ==="
# Check if backend port is open (assuming 8080)
nc -z 127.0.0.1 8080
if [ $? -eq 0 ]; then
    echo "Backend Port 8080 is OPEN"
else
    echo "Backend Port 8080 is CLOSED"
fi

# Check SSE Endpoint
echo "Checking SSE Endpoint..."
curl -v http://127.0.0.1:8080/api/transcription/stream > /dev/null 2>&1 &
PID=$!
sleep 2
kill $PID
echo "SSE validation attempt complete."
