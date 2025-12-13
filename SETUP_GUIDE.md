# Setup Guide - PrepXL Audio Studio

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Create .env file from example
cp env.example .env

# Edit .env and add your Gemini API key:
# GEMINI_API_KEY=AIzaSyCJu2hh6x0Pjdk5rDXpZP7igDZ440pFZ08

# Or set as environment variable:
export GEMINI_API_KEY=AIzaSyCJu2hh6x0Pjdk5rDXpZP7igDZ440pFZ08

# Run backend
mvn spring-boot:run
```

The backend will start on `http://localhost:8080`

### 2. Frontend Setup

```bash
cd frontend

# Create .env file from example
cp env.example .env

# Edit .env (URLs should already be correct):
# VITE_WS_URL=ws://localhost:8080/api/audio/stream
# VITE_SSE_URL=http://localhost:8080/api/transcription/stream

# Install dependencies
npm install

# Run frontend
npm run dev
```

The frontend will start on `http://localhost:5173` (or similar Vite port)

## Troubleshooting Transcription Not Appearing

### Issue: Transcription text not showing in UI

**Root Causes & Fixes:**

1. **SSE Format Issue** ✅ FIXED
   - Backend now sends proper SSE format: `data: {...}\n\n`
   - Check browser console for SSE connection logs

2. **Gemini API Key Missing**
   - Ensure `GEMINI_API_KEY` is set in backend `.env` or environment
   - Check backend logs for API errors

3. **Backend Not Running**
   - Verify backend is running on port 8080
   - Check: `curl http://localhost:8080/api/transcription/stream`

4. **CORS Issues**
   - CORS is configured to allow all origins
   - Check browser console for CORS errors

5. **SSE Connection Failed**
   - Open browser DevTools → Network tab
   - Look for `/api/transcription/stream` request
   - Should show as "EventStream" type
   - Check for connection errors

### Debug Steps:

1. **Check Backend Logs**:
   ```bash
   # Look for:
   # - "SSE transcription stream subscribed"
   # - "Transcript: <text>"
   # - Gemini API errors
   ```

2. **Check Frontend Console**:
   ```javascript
   // Should see:
   // "Opening SSE transcription stream at: ..."
   // "SSE transcription stream opened"
   // "SSE message received: ..."
   // "Parsed transcription payload: ..."
   ```

3. **Test SSE Endpoint Directly**:
   ```bash
   curl -N http://localhost:8080/api/transcription/stream
   # Should see: data: {"type":"partial","text":"..."}\n\n
   ```

4. **Check WebSocket Connection**:
   - Browser DevTools → Network → WS tab
   - Should see connection to `ws://localhost:8080/api/audio/stream`
   - Status should be "101 Switching Protocols"

## Verification Checklist

- [ ] Backend starts without errors
- [ ] Frontend connects to backend WebSocket
- [ ] SSE stream opens (check Network tab)
- [ ] Microphone permission granted
- [ ] Audio visualizer shows activity
- [ ] Transcription appears in UI (after speaking)

## Common Issues

### "WebSocket connection failed"
- Ensure backend is running
- Check firewall/port blocking
- Verify URL in frontend `.env`

### "SSE stream not receiving data"
- Check backend logs for Gemini API errors
- Verify API key is correct
- Wait 5 seconds (buffering delay) before expecting transcription

### "Transcription appears but is empty"
- Check backend logs for Gemini API response
- Verify audio chunks are being sent (check WebSocket messages)
- Check Gemini API quota/limits

## Next Steps

1. Test with actual speech (speak clearly for 10+ seconds)
2. Check browser console for any errors
3. Verify transcription appears in the UI
4. Complete website analysis task (www.prepxl.app)



