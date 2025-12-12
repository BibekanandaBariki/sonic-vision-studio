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
    }).catch(() => {})
  }
}
// #endregion

let socket
let heartbeatInterval

export const connectWebSocket = ({ onOpen, onClose, onError }) => {
  console.log('Attempting to connect to WebSocket at:', WS_URL);
  socket = new WebSocket(WS_URL)
  socket.binaryType = 'arraybuffer'
  
  // Set up heartbeat to keep connection alive
  const setupHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
    }
    
    heartbeatInterval = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        // Send a ping message to keep connection alive
        console.log('Sending heartbeat ping');
        socket.send('ping')
      }
    }, 25000) // Every 25 seconds
  }
  
  socket.onopen = () => {
    console.log('WebSocket connection opened');
    onOpen?.()
    setupHeartbeat()
    // #region agent log
    sendLog(
      basePayload({
        hypothesisId: 'H4',
        location: 'websocketService.js:onopen',
        message: 'WebSocket opened',
      }),
    )
    // #endregion
  }
  
  socket.onmessage = (event) => {
    console.log('Received message from WebSocket:', event.data);
    // Handle messages from server (like acknowledgments)
    if (event.data === 'connected' || event.data === 'ack') {
      // Just acknowledge, don't need to do anything special
      return
    }
    
    // Handle any other messages if needed
  }
  
  socket.onerror = (err) => {
    console.log('WebSocket error:', err);
    onError?.(err)
    // #region agent log
    sendLog(
      basePayload({
        hypothesisId: 'H4',
        location: 'websocketService.js:onerror',
        message: 'WebSocket error',
        data: { error: err?.message || 'unknown' },
      }),
    )
    // #endregion
  }
  
  socket.onclose = (event) => {
    console.log('WebSocket connection closed:', event);
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
    onClose?.()
    // #region agent log
    sendLog(
      basePayload({
        hypothesisId: 'H5',
        location: 'websocketService.js:onclose',
        message: 'WebSocket closed',
        data: { code: event.code, reason: event.reason }
      }),
    )
    // #endregion
  }
}

export const sendAudioChunk = async (blob) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) return
  const buffer = await blob.arrayBuffer()
  socket.send(buffer)
  // #region agent log
  sendLog(
    basePayload({
      hypothesisId: 'H3',
      location: 'websocketService.js:sendAudioChunk',
      message: 'Chunk sent',
      data: { bytes: buffer.byteLength },
    }),
  )
  // #endregion
}

export const disconnectWebSocket = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
  }
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.close()
  }
}

export const openTranscriptionStream = ({ onMessage, onError }) => {
  const evtSource = new EventSource(SSE_URL)

  evtSource.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data)
      onMessage?.(payload)
    } catch (err) {
      onError?.(err)
    }
  }

  evtSource.onerror = (err) => {
    onError?.(err)
    evtSource.close()
  }

  return evtSource
}