import { MicVAD } from '@ricky0123/vad-web'

/**
 * Voice Activity Detection Service
 * Detects when user is speaking vs silence/background noise
 */
class VADService {
    constructor() {
        this.vad = null
        this.isInitialized = false
        this.isSpeaking = false
        this.onSpeechStart = null
        this.onSpeechEnd = null
        this.onVADMisfire = null
    }

    /**
     * Initialize VAD with configuration
     */
    async initialize(options = {}) {
        if (this.isInitialized) {
            console.log('VAD already initialized')
            return
        }

        try {
            console.log('Initializing VAD...')

            this.vad = await MicVAD.new({
                // Sensitivity settings
                positiveSpeechThreshold: options.positiveSpeechThreshold || 0.8,
                negativeSpeechThreshold: options.negativeSpeechThreshold || 0.5,
                minSpeechFrames: options.minSpeechFrames || 3,

                // Callbacks
                onSpeechStart: () => {
                    console.log('VAD: Speech started')
                    this.isSpeaking = true
                    if (this.onSpeechStart) this.onSpeechStart()
                },

                onSpeechEnd: (audio) => {
                    console.log('VAD: Speech ended', audio.length, 'samples')
                    this.isSpeaking = false
                    if (this.onSpeechEnd) this.onSpeechEnd(audio)
                },

                onVADMisfire: () => {
                    console.log('VAD: Misfire (false positive)')
                    if (this.onVADMisfire) this.onVADMisfire()
                }
            })

            this.isInitialized = true
            console.log('VAD initialized successfully')
        } catch (error) {
            console.error('Failed to initialize VAD:', error)
            throw error
        }
    }

    /**
     * Start VAD detection
     */
    async start() {
        if (!this.isInitialized) {
            await this.initialize()
        }

        if (this.vad) {
            console.log('Starting VAD...')
            await this.vad.start()
        }
    }

    /**
     * Stop VAD detection
     */
    stop() {
        if (this.vad) {
            console.log('Stopping VAD...')
            this.vad.pause()
            this.isSpeaking = false
        }
    }

    /**
     * Destroy VAD instance
     */
    destroy() {
        if (this.vad) {
            console.log('Destroying VAD...')
            this.vad.destroy()
            this.vad = null
            this.isInitialized = false
            this.isSpeaking = false
        }
    }

    /**
     * Check if currently speaking
     */
    getIsSpeaking() {
        return this.isSpeaking
    }

    /**
     * Set callbacks
     */
    setCallbacks({ onSpeechStart, onSpeechEnd, onVADMisfire }) {
        this.onSpeechStart = onSpeechStart
        this.onSpeechEnd = onSpeechEnd
        this.onVADMisfire = onVADMisfire
    }
}

// Export singleton instance
export const vadService = new VADService()
export default vadService
