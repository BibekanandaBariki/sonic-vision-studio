import { useEffect, useMemo, useRef, useState } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, WifiOff, Wifi, Activity, Sparkles } from 'lucide-react'
import AudioVisualizer from './components/AudioVisualizer'
import AudioControls from './components/AudioControls'
import TranscriptionDisplay from './components/TranscriptionDisplay'
import SceneBackground from './components/SceneBackground'
import { startAudioCapture, stopAudioCapture } from './services/audioService'
import {
  connectWebSocket,
  disconnectWebSocket,
  openTranscriptionStream,
  sendAudioChunk,
} from './services/websocketService'
import './App.css'
import './index.css'

const colorSchemes = [
  { start: '#00D4FF', mid: '#9D00FF', end: '#FF006E', name: 'Neon Pulse' },
  { start: '#00FF87', mid: '#60EFFF', end: '#0061FF', name: 'Ocean Drive' },
  { start: '#FF006E', mid: '#FFBE0B', end: '#FB5607', name: 'Sunset Rush' },
  { start: '#B537F2', mid: '#FF006E', end: '#FFB700', name: 'Cosmic Bloom' },
]

function App() {
  const [isRecording, setIsRecording] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [partialTranscript, setPartialTranscript] = useState('')
  const [finalTranscripts, setFinalTranscripts] = useState([])
  const [audioLevel, setAudioLevel] = useState(0)
  const [colorIndex, setColorIndex] = useState(0)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const dataArrayRef = useRef(null)
  const rafRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const [runId] = useState('run-initial')

  const scheme = useMemo(() => colorSchemes[colorIndex], [colorIndex])

  useEffect(() => {
    return () => {
      stopRecording()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleTranscriptionStream = () => {
    const stream = openTranscriptionStream({
      onMessage: (payload) => {
        if (payload.type === 'partial') {
          setPartialTranscript(payload.text)
        } else if (payload.type === 'final') {
          setFinalTranscripts((prev) => [...prev, payload.text])
          setPartialTranscript('')
        }
      },
      onError: () => {
        toast.error('Transcription stream interrupted')
      },
    })
    return stream
  }

  const startVisualizerLoop = () => {
    const draw = () => {
      if (analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current)
        const max = Math.max(...dataArrayRef.current)
        setAudioLevel(max / 255)
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
  }

  const stopVisualizerLoop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    setAudioLevel(0)
  }

  const startRecording = async () => {
    try {
      console.log('Starting recording process');
      const { audioContext, analyser, dataArray, mediaRecorder } =
        await startAudioCapture({
          onAudioData: (blob) => {
            console.log('Sending audio chunk');
            sendAudioChunk(blob)
          },
          runId,
        })

      audioContextRef.current = audioContext
      analyserRef.current = analyser
      dataArrayRef.current = dataArray
      mediaRecorderRef.current = mediaRecorder

      console.log('Connecting to WebSocket');
      connectWebSocket({
        onOpen: () => {
          console.log('WebSocket connection opened');
          setConnectionStatus('connected')
        },
        onClose: () => {
          console.log('WebSocket connection closed');
          setConnectionStatus('disconnected')
        },
        onError: () => {
          console.log('WebSocket error occurred');
          setConnectionStatus('error')
          toast.error('WebSocket error')
        },
      })

      handleTranscriptionStream()
      startVisualizerLoop()
      setIsRecording(true)
      toast.success('Microphone live')
    } catch (err) {
      console.error('Error starting recording:', err)
      toast.error('Unable to start microphone')
    }
  }

  const stopRecording = () => {
    stopVisualizerLoop()
    stopAudioCapture(mediaRecorderRef.current, audioContextRef.current)
    disconnectWebSocket()
    setIsRecording(false)
    setConnectionStatus('disconnected')
    setPartialTranscript('')
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const cycleColor = () => {
    setColorIndex((prev) => (prev + 1) % colorSchemes.length)
  }

  return (
    <div className="relative overflow-hidden text-slate-100 min-h-screen">
      <div className="noise-overlay" />
      <SceneBackground />
      <Toaster position="top-right" />
      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 backdrop-blur-2xl bg-slate-900/40 border-b border-white/5">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-neon-blue to-neon-purple shadow-glow flex items-center justify-center">
                <Sparkles className="text-white" size={20} />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-neon-blue">
                  PrepXL // Live
                </p>
                <h1 className="text-xl font-semibold">Sonic Vision Studio</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10">
                {connectionStatus === 'connected' ? (
                  <Wifi className="text-emerald-400" size={18} />
                ) : (
                  <WifiOff className="text-amber-400" size={18} />
                )}
                <span className="text-sm capitalize">{connectionStatus}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10">
                <Activity className="text-neon-blue animate-pulse" size={18} />
                <span className="text-sm">{Math.round(audioLevel * 100)}%</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-6 pb-16 pt-6 space-y-8">
          <section className="glass-surface neon-border rounded-3xl p-8 flex flex-col lg:flex-row gap-8 shadow-2xl">
            <div className="flex-1 space-y-6">
              <div className="space-y-3">
                <p className="text-sm uppercase tracking-[0.25em] text-neon-blue">
                  Futuristic audio intelligence
                </p>
                <h2 className="text-3xl lg:text-4xl font-semibold leading-tight">
                  Circular Equalizer with live transcription streaming
                </h2>
                <p className="text-slate-300 max-w-2xl">
                  Capture microphone audio, visualize 128 neon frequency bars,
                  and receive low-latency Gemini-powered streaming transcripts.
                </p>
              </div>
              <AudioControls
                isRecording={isRecording}
                onToggle={toggleRecording}
                onColorCycle={cycleColor}
                colorName={scheme.name}
                connectionStatus={connectionStatus}
              />
            </div>
            <div className="flex-1 flex items-center justify-center">
              <AudioVisualizer
                isActive={isRecording}
                getFrequencyData={() => dataArrayRef.current}
                colorScheme={scheme}
                onCycleScheme={cycleColor}
              />
            </div>
          </section>

          <section className="glass-surface rounded-3xl p-6 neon-border shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-neon-blue">
                  Streaming transcription
                </p>
                <h3 className="text-2xl font-semibold">Live Insights</h3>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={isRecording ? 'live' : 'idle'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border ${isRecording
                      ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300'
                      : 'border-white/10 bg-white/5 text-white'
                    }`}
                >
                  {isRecording ? (
                    <Mic size={16} />
                  ) : (
                    <MicOff size={16} className="text-amber-300" />
                  )}
                  <span className="text-sm">
                    {isRecording ? 'Capturing voice' : 'Not recording'}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>
            <TranscriptionDisplay
              partial={partialTranscript}
              finals={finalTranscripts}
              audioLevel={audioLevel}
            />
          </section>
        </main>
      </div>
    </div>
  )
}

export default App
