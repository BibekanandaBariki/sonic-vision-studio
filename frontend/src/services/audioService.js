const SAMPLE_RATE = 16000
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
    // Simple averaging (linear interpolation or decimation could be better but this is fast)
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

const convertFloat32ToInt16 = (buffer) => {
  let l = buffer.length
  let buf = new Int16Array(l)
  while (l--) {
    buf[l] = Math.min(1, buffer[l]) * 0x7fff
  }
  return buf.buffer
}

export const startAudioCapture = async ({ onAudioData, runId }) => {
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
      sampleRate: SAMPLE_RATE, // Try to request 16kHz context directly if possible
    })

    // Fallback: if browser doesn't support requesting sample rate, we handle resampling
    const source = audioContext.createMediaStreamSource(stream)
    const processor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1)

    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.8
    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    source.connect(analyser)
    analyser.connect(processor)
    processor.connect(audioContext.destination)

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0)
      // Check if we need to resample
      let pcmData = inputData
      if (audioContext.sampleRate !== SAMPLE_RATE) {
        pcmData = downsampleBuffer(inputData, audioContext.sampleRate, SAMPLE_RATE)
      }

      const int16Data = convertFloat32ToInt16(pcmData)
      if (int16Data.byteLength > 0) {
        // Send as Blob or raw ArrayBuffer? 
        // APP expects Blob in the current logic, let's wrap it
        const blob = new Blob([int16Data], { type: 'audio/pcm' })
        onAudioData?.(blob)
      }
    }

    return {
      audioContext, analyser, dataArray, mediaRecorder: {
        state: 'recording', stop: () => {
          processor.disconnect()
          source.disconnect()
          stream.getTracks().forEach(t => t.stop())
        }
      }
    }
  } catch (error) {
    console.error("Error accessing microphone:", error)
    throw error
  }
}

export const stopAudioCapture = (mediaRecorder, audioContext) => {
  try {
    if (mediaRecorder && mediaRecorder.stop) {
      mediaRecorder.stop()
    }
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close()
    }
  } catch (e) {
    console.warn("Error stopping audio capture", e)
  }
}

