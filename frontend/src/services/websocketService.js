// Use environment variable for server endpoint, fallback to localhost if not set
const SERVER_ENDPOINT = import.meta.env.VITE_SERVER_ENDPOINT || 'http://localhost:7242/ingest/56d66e28-d31b-4d04-8908-21ece4d06145'
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/api/audio/stream'
const SSE_URL = import.meta.env.VITE_SSE_URL || 'http://localhost:8080/api/transcription/stream'

const basePayload = ({ hypothesisId, location, message, data = {}, runId = 'run-repro3' }) => ({
  sessionId: 'debug-session',
  runId,
  hypothesisId,
  location,
  message,
  data,
  timestamp: Date.now(),
})

// #region agent log
const sendLog = (payload) => {
  // Only send logs if server endpoint is configured
  if (SERVER_ENDPOINT) {
    fetch(SERVER_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => { })
  }
}
// #endregion

let ws
let heartbeatInterval

export const connectWebSocket = ({ onOpen, onClose, onError }) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('WebSocket already connected')
    return ws
  }

  try {
    console.log('Attempting to connect to WebSocket at:', WS_URL);
    ws = new WebSocket(WS_URL)
    ws.binaryType = 'arraybuffer'

    // Set up heartbeat to keep connection alive
    const setupHeartbeat = () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
      }

      heartbeatInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          console.log('Sending heartbeat ping');
          ws.send('ping')
        }
      }, 25000) // Every 25 seconds
    }

    ws.onopen = () => {
      console.log('WebSocket connection opened');
      onOpen?.()
      setupHeartbeat()
      sendLog(
        basePayload({
          hypothesisId: 'H4',
          location: 'websocketService.js:onopen',
          message: 'WebSocket opened',
        }),
      )
    }

    ws.onmessage = (event) => {
      console.log('Received message from WebSocket:', event.data);
      if (event.data === 'connected' || event.data === 'ack') {
        return
      }
    }

    ws.onerror = (err) => {
      console.log('WebSocket error:', err);
      onError?.(err)
      sendLog(
        basePayload({
          hypothesisId: 'H4',
          location: 'websocketService.js:onerror',
          message: 'WebSocket error',
          data: { error: err?.message || 'unknown' },
        }),
      )
    }

    ws.onclose = (event) => {
      console.log('WebSocket connection closed:', event);
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
        heartbeatInterval = null
      }
      onClose?.()
      sendLog(
        basePayload({
          hypothesisId: 'H5',
          location: 'websocketService.js:onclose',
          message: 'WebSocket closed',
          data: { code: event.code, reason: event.reason }
        }),
      )
    }

    return ws
  } catch (error) {
    console.error('Failed to create WebSocket:', error)
    onError?.(error)
    return null
  }
}

export const sendAudioChunk = async (data) => {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  
  if (typeof data === 'string') {
    // Send text data (like silence marker)
    ws.send(data)
  } else if (data instanceof Blob) {
    // Send binary data (audio chunks)
    const buffer = await data.arrayBuffer()
    ws.send(buffer)
  }
  
  sendLog(
    basePayload({
      hypothesisId: 'H3',
      location: 'websocketService.js:sendAudioChunk',
      message: 'Chunk sent',
      data: { bytes: typeof data === 'string' ? data.length : (data instanceof Blob ? await data.arrayBuffer().then(buf => buf.byteLength) : 0) },
    }),
  )
}

export const disconnectWebSocket = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
  }
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close()
  }
}

export const openTranscriptionStream = ({ onMessage, onError }) => {
  console.log('Opening SSE transcription stream at:', SSE_URL)
  const evtSource = new EventSource(SSE_URL)

  evtSource.onopen = () => {
    console.log('SSE transcription stream opened')
  }

  evtSource.onmessage = (event) => {
    try {
      console.log('SSE message received:', event.data)
      // SSE format: "data: {...}" - extract JSON part
      let dataStr = event.data
      if (dataStr.startsWith('data:')) {
        // Remove "data:" prefix and trim whitespace
        dataStr = dataStr.substring(5).trim()
      }
      const payload = JSON.parse(dataStr)
      console.log('Parsed transcription payload:', payload)
      onMessage?.(payload)
    } catch (err) {
      console.error('Error parsing SSE message:', err, 'Raw data:', event.data)
      onError?.(err)
    }
  }

  evtSource.onerror = (err) => {
    console.error('SSE transcription stream error:', err)
    // Don't close on first error - EventSource will auto-reconnect
    // Only close if it's a fatal error
    if (evtSource.readyState === EventSource.CLOSED) {
      onError?.(err)
    }
  }

  return evtSource
}