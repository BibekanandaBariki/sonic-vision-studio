# Real-Time STT System Fixes - Implementation Plan

## Root Cause Analysis
1. **Hallucinated Transcriptions**: GeminiTranscriptionService uses `generateContent` REST API with system instructions, but Gemini treats this as a conversational model, generating responses instead of pure transcription.
2. **Continuous Processing**: Frontend sends audio chunks continuously without VAD gating. AudioStreamHandler processes every binary message, and AudioProcessingService forwards all chunks to GeminiTranscriptionService.
3. **Multiple Requests/429 Errors**: The buffering logic waits for silence markers, but frontend never sends them. However, the system may be triggering multiple requests due to improper session management or parallel processing.
4. **No Utterance Boundaries**: No VAD integration on frontend, no silence detection on backend, leading to continuous streaming.

## Implementation Tasks

### Frontend Fixes
- [ ] Integrate VAD in audioService.js to gate audio transmission
- [ ] Send explicit END_OF_SPEECH signals (silence markers) when speech ends
- [ ] Prevent sending silence/noise chunks

### Backend Fixes
- [ ] Fix GeminiTranscriptionService to use proper transcription-only configuration
- [ ] Ensure one utterance = one Gemini request with proper session lifecycle
- [ ] Add rate limiting and prevent parallel calls
- [ ] Handle WebSocket disconnects cleanly

### Gemini Integration Fix
- [ ] Replace chat-style generation with strict transcription behavior
- [ ] Use correct request format for audio transcription
- [ ] Ensure stateless requests and prevent auto-continuation

### Rate Limiting & Safety
- [ ] Implement proper throttling (500ms between requests)
- [ ] Add concurrency control (max 1 concurrent request)
- [ ] Stay within Gemini limits while maintaining <100ms latency

## Files to Edit
- [ ] frontend/src/services/audioService.js
- [ ] frontend/src/services/websocketService.js
- [ ] backend/src/main/java/com/app/service/GeminiTranscriptionService.java
- [ ] backend/src/main/java/com/app/service/AudioProcessingService.java
- [ ] backend/src/main/java/com/app/controller/AudioStreamHandler.java

## Validation Tests
- [ ] Test 1: Input "Hi" → Output: "Hi" (nothing else)
- [ ] Test 2: User stops speaking → No new Gemini calls, no output
- [ ] Test 3: Multiple short utterances → Each utterance creates exactly one Gemini session, no 429 errors
