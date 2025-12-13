import EnergyVAD from './energyVAD'

const SAMPLE_RATE = 48000
const BUFFER_SIZE = 4096

const downsampleBuffer = (buffer, inputSampleRate, outputSampleRate) => {
  if (outputSampleRate === inputSampleRate) {
    return buffer
  }
  const sampleRateRatio = inputSampleRate / outputSampleRate
  const newLength = Math.round(buffer.length / sampleRateRatio)
  const result = new Float32Array(newLength)
  let offsetResult = 0
  let offsetBuffer = 0
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio)
    let accum = 0,
      count = 0
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i]
      count++
    }
    result[offsetResult] = count > 0 ? accum / count : 0
    offsetResult++
    offsetBuffer = nextOffsetBuffer
  }
  return result
}

function floatTo16BitPCM(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  let offset = 0;

  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    let sample = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return buffer;
}

/**
 * Start real-time audio capture with VAD
 * 
 * @param {Object} options
 * @param {Function} options.onAudioData - Callback for audio chunks (only during speech)
 * @param {Function} options.onSpeechStart - Callback when speech starts
 * @param {Function} options.onSpeechEnd - Callback when speech ends
 * @param {Function} options.onEnergyUpdate - Callback for energy level updates
 * @param {Object} options.vadConfig - VAD configuration
 * @param {boolean} options.useVAD - Enable/disable VAD (default: true)
 * @returns {Object} Audio context, analyser, and controls
 */
export const startAudioCapture = async ({
  onAudioData,
  onSpeechStart,
  onSpeechEnd,
  onEnergyUpdate,
  vadConfig = {},
  useVAD = true,
}) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        autoGainControl: true,
        noiseSuppression: true,
      },
    })

    const audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: SAMPLE_RATE,
    })

    const source = audioContext.createMediaStreamSource(stream)
    const processor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1)

    // Create analyser for visualizer (independent of VAD)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.8
    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    // Connect audio graph
    source.connect(analyser)
    analyser.connect(processor)
    processor.connect(audioContext.destination)

    // Initialize VAD
    let vad = null
    let speechActive = false
    if (useVAD) {
      vad = new EnergyVAD(vadConfig)

      vad.setSpeechStartCallback(() => {
        console.log('[VAD] Speech started')
        speechActive = true
        onSpeechStart?.()
      })

      vad.setSpeechEndCallback(() => {
        console.log('[VAD] Speech ended - sending silence marker')
        speechActive = false
        onSpeechEnd?.()
        // Send silence marker as text to indicate end of utterance
        onAudioData?.("silence")
      })

      vad.setEnergyUpdateCallback((energy) => {
        onEnergyUpdate?.(energy)
      })
    }

    // Process audio in real-time
    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0)

      // Resample if needed
      let pcmData = inputData
      if (audioContext.sampleRate !== SAMPLE_RATE) {
        pcmData = downsampleBuffer(inputData, audioContext.sampleRate, SAMPLE_RATE)
      }

      // VAD check
      let shouldSend = true
      if (useVAD && vad) {
        shouldSend = vad.update(pcmData)
      }

      // Send audio chunk only if VAD approves (or VAD disabled)
      if (shouldSend && pcmData.length > 0) {
        const pcm16 = floatTo16BitPCM(pcmData)
        if (pcm16.byteLength > 0) {
          const blob = new Blob([pcm16], { type: 'audio/pcm' })
          onAudioData?.(blob)
        }
      }
    }

    return {
      audioContext,
      analyser,
      dataArray,
      vad,
      stream,
      stop: () => {
        processor.disconnect()
        source.disconnect()
        stream.getTracks().forEach((t) => t.stop())
        if (audioContext.state !== 'closed') {
          audioContext.close()
        }
      },
    }
  } catch (error) {
    console.error('Error accessing microphone:', error)
    throw error
  }
}

export const stopAudioCapture = (captureResult) => {
  try {
    if (captureResult && captureResult.stop) {
      captureResult.stop()
    }
  } catch (e) {
    console.warn('Error stopping audio capture', e)
  }
}