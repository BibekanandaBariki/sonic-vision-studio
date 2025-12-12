# PrepXL Audio Studio

Futuristic microphone visualizer + streaming transcription (React + Vite + Tailwind + Three.js) with a Spring Boot WebFlux backend for low-latency SSE/WebSocket transport.

## Prerequisites
- Node 18+
- Java 17+
- Maven (or use Docker for the backend) — Maven CLI not bundled locally, add if you need to build.

## Frontend
```bash
cd /Users/bibekanandabariki/Documents/PrepXL_Project/frontend
npm install
npm run dev
```

Environment: create `.env` if you want to inject backend URLs:
```
VITE_WS_URL=ws://localhost:8080/api/audio/stream
VITE_SSE_URL=http://localhost:8080/api/transcription/stream
```

## Backend
1) Ensure Maven is available (`brew install maven`) or use a containerized build.
2) Build & run:
```bash
cd /Users/bibekanandabariki/Documents/PrepXL_Project/backend
mvn spring-boot:run
```

Env:
```
GEMINI_API_KEY=your_key
```

## Debug-mode logging
- Instrumentation writes NDJSON to `/Users/bibekanandabariki/Documents/PrepXL_Project/.cursor/debug.log`
- Clear the log with the debug UI before each run (required by workflow).

## Features
- Circular neon equalizer (128 bins, FFT 2048) @ 60 FPS
- WebGL background (React Three Fiber) + Framer Motion micro-interactions
- WebSocket audio chunk streaming + SSE partial/final transcripts
- Tailwind glassmorphism, neon gradients, responsive breakpoints

## Testing checklist
- Frontend: mic permission, 60 FPS, responsive, websocket stability
- Backend: chunk receipt, streaming responses, backpressure, Gemini integration

