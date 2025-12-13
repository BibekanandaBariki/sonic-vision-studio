import { useState, useEffect, useRef } from 'react'
import EnergyVAD from '../services/energyVAD'

/**
 * React hook for Voice Activity Detection
 * 
 * @param {Object} config - VAD configuration
 * @returns {Object} VAD state and controls
 */
export const useVAD = (config = {}) => {
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [energy, setEnergy] = useState(0)
    const vadRef = useRef(null)

    useEffect(() => {
        // Initialize VAD
        vadRef.current = new EnergyVAD(config)

        // Set up callbacks
        vadRef.current.setSpeechStartCallback(() => {
            setIsSpeaking(true)
        })

        vadRef.current.setSpeechEndCallback(() => {
            setIsSpeaking(false)
        })

        vadRef.current.setEnergyUpdateCallback((energyLevel) => {
            setEnergy(energyLevel)
        })

        return () => {
            if (vadRef.current) {
                vadRef.current.reset()
            }
        }
    }, []) // Only initialize once

    /**
     * Update VAD with new audio frame
     * @param {Float32Array} audioData
     * @returns {boolean} Current speaking state
     */
    const update = (audioData) => {
        if (vadRef.current) {
            return vadRef.current.update(audioData)
        }
        return false
    }

    /**
     * Update VAD configuration
     * @param {Object} newConfig
     */
    const updateConfig = (newConfig) => {
        if (vadRef.current) {
            vadRef.current.updateConfig(newConfig)
        }
    }

    /**
     * Reset VAD state
     */
    const reset = () => {
        if (vadRef.current) {
            vadRef.current.reset()
            setIsSpeaking(false)
            setEnergy(0)
        }
    }

    return {
        isSpeaking,
        energy,
        update,
        updateConfig,
        reset,
        vad: vadRef.current
    }
}

export default useVAD
