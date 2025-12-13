#!/bin/bash

# Kill ports 8080 and 5173 to ensure clean start
echo "🧹 Cleaning up old processes..."
lsof -t -i :8080 | xargs kill -9 2>/dev/null
lsof -t -i :5173 | xargs kill -9 2>/dev/null

# Load API Key from backend/.env if exists
if [ -f "backend/.env" ]; then
    export $(grep -v '^#' backend/.env | xargs)
fi

if [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ Error: GEMINI_API_KEY is not set."
    echo "Please create 'backend/.env' with GEMINI_API_KEY=... or export it in your shell."
    exit 1
fi

echo "🚀 Starting Backend (Spring Boot)..."
cd backend
# Run in background, log to backend.log
mvn spring-boot:run > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

echo "⏳ Waiting for Backend to initialize..."
# Wait loop for port 8080
until lsof -i :8080 >/dev/null; do
    sleep 1
done
echo "✅ Backend is UP!"

echo "🚀 Starting Frontend (Vite)..."
cd frontend
# Run in background, log to frontend.log
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo " "
echo "🎉 Project Started Successfully!"
echo "------------------------------------------------"
echo "👉 Frontend: http://localhost:5173"
echo "👉 Backend Logs: tail -f backend.log"
echo "------------------------------------------------"
echo "Press CTRL+C to stop (processes run in background)"

wait $BACKEND_PID $FRONTEND_PID
