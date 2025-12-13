/**
 * Energy-Based Voice Activity Detection (VAD)
 * 
 * Lightweight VAD using RMS energy calculation from Web Audio API.
 * No external dependencies - pure JavaScript implementation.
 * 
 * @module energyVAD
 */

/**
 * Default VAD configuration
 */
const DEFAULT_CONFIG = {
    // Energy threshold for speech detection (0.0 - 1.0)
    energyThreshold: 0.02,

    // Minimum consecutive frames to confirm speech start
    minSpeechFrames: 3,

    // Minimum consecutive silence frames before speech end
    minSilenceFrames: 10,

    // Exponential smoothing factor for energy (0.0 - 1.0)
    smoothingFactor: 0.3,

    // Minimum speech duration in ms (prevents false positives)
    minSpeechDuration: 100,

    // Silence duration in ms before stopping
    silenceDuration: 400
}

/**
 * Energy-based VAD class
 */
class EnergyVAD {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config }

        // State tracking
        this.isSpeaking = false
        this.smoothedEnergy = 0
        this.speechFrameCount = 0
        this.silenceFrameCount = 0
        this.speechStartTime = null

        // Callbacks
        this.onSpeechStart = null
        this.onSpeechEnd = null
        this.onEnergyUpdate = null

        // Frame timing (assuming 60 FPS audio processing)
        this.frameInterval = 1000 / 60 // ~16.67ms per frame
        this.minSpeechFrames = Math.ceil(this.config.minSpeechDuration / this.frameInterval)
        this.minSilenceFrames = Math.ceil(this.config.silenceDuration / this.frameInterval)
    }

    /**
     * Calculate RMS (Root Mean Square) energy of audio data
     * @param {Float32Array} audioData - Audio samples
     * @returns {number} RMS energy value (0.0 - 1.0)
     */
    calculateRMS(audioData) {
        if (!audioData || audioData.length === 0) return 0

        let sum = 0
        for (let i = 0; i < audioData.length; i++) {
            sum += audioData[i] * audioData[i]
        }

        return Math.sqrt(sum / audioData.length)
    }

    /**
     * Apply exponential smoothing to reduce noise
     * @param {number} newEnergy - Current energy value
     * @returns {number} Smoothed energy value
     */
    smoothEnergy(newEnergy) {
        const alpha = this.config.smoothingFactor
        this.smoothedEnergy = alpha * newEnergy + (1 - alpha) * this.smoothedEnergy
        return this.smoothedEnergy
    }

    /**
     * Update VAD state with new audio frame
     * @param {Float32Array} audioData - Audio samples from current frame
     * @returns {boolean} True if currently speaking
     */
    update(audioData) {
        // Calculate energy
        const rawEnergy = this.calculateRMS(audioData)
        const energy = this.smoothEnergy(rawEnergy)

        // Notify energy update
        if (this.onEnergyUpdate) {
            this.onEnergyUpdate(energy)
        }

        // Determine if current frame has speech
        const hasEnergy = energy > this.config.energyThreshold

        if (hasEnergy) {
            this.speechFrameCount++
            this.silenceFrameCount = 0

            // Start speech if we have enough consecutive speech frames
            if (!this.isSpeaking && this.speechFrameCount >= this.config.minSpeechFrames) {
                this.startSpeech()
            }
        } else {
            this.silenceFrameCount++
            this.speechFrameCount = 0

            // End speech if we have enough consecutive silence frames
            if (this.isSpeaking && this.silenceFrameCount >= this.minSilenceFrames) {
                this.endSpeech()
            }
        }

        return this.isSpeaking
    }

    /**
     * Trigger speech start event
     * @private
     */
    startSpeech() {
        this.isSpeaking = true
        this.speechStartTime = Date.now()

        if (this.onSpeechStart) {
            this.onSpeechStart()
        }
    }

    /**
     * Trigger speech end event
     * @private
     */
    endSpeech() {
        // Verify minimum speech duration
        const speechDuration = Date.now() - this.speechStartTime
        if (speechDuration < this.config.minSpeechDuration) {
            // Too short, likely false positive - ignore
            this.isSpeaking = false
            this.speechStartTime = null
            return
        }

        this.isSpeaking = false
        this.speechStartTime = null

        if (this.onSpeechEnd) {
            this.onSpeechEnd()
        }
    }

    /**
     * Set callback for speech start event
     * @param {Function} callback
     */
    setSpeechStartCallback(callback) {
        this.onSpeechStart = callback
    }

    /**
     * Set callback for speech end event
     * @param {Function} callback
     */
    setSpeechEndCallback(callback) {
        this.onSpeechEnd = callback
    }

    /**
     * Set callback for energy updates
     * @param {Function} callback - Receives energy value (0.0 - 1.0)
     */
    setEnergyUpdateCallback(callback) {
        this.onEnergyUpdate = callback
    }

    /**
     * Get current speaking state
     * @returns {boolean}
     */
    getIsSpeaking() {
        return this.isSpeaking
    }

    /**
     * Get current smoothed energy level
     * @returns {number}
     */
    getEnergy() {
        return this.smoothedEnergy
    }

    /**
     * Update configuration
     * @param {Object} newConfig - Partial config to merge
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig }

        // Recalculate frame counts
        this.minSpeechFrames = Math.ceil(this.config.minSpeechDuration / this.frameInterval)
        this.minSilenceFrames = Math.ceil(this.config.silenceDuration / this.frameInterval)
    }

    /**
     * Reset VAD state
     */
    reset() {
        this.isSpeaking = false
        this.smoothedEnergy = 0
        this.speechFrameCount = 0
        this.silenceFrameCount = 0
        this.speechStartTime = null
    }
}

export default EnergyVAD
export { DEFAULT_CONFIG }
