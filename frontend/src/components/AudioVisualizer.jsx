import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

const FREQ_BINS = 128

const AudioVisualizer = ({ isActive, getFrequencyData, colorScheme, onCycleScheme }) => {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const size = Math.min(window.innerWidth * 0.6, 540)
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(dpr, dpr)

    const render = () => {
      const freqData = getFrequencyData ? getFrequencyData() : null
      ctx.clearRect(0, 0, size, size)

      ctx.save()
      ctx.translate(size / 2, size / 2)
      ctx.rotate((Date.now() % 40000) / 40000 * Math.PI * 2)

      const radius = size * 0.3
      const barWidth = (Math.PI * 2) / FREQ_BINS

      if (freqData && freqData.length) {
        for (let i = 0; i < FREQ_BINS; i += 1) {
          const value = freqData[i]
          const intensity = value / 255
          const barLength = radius * 0.45 * intensity
          const angle = i * barWidth
          const gradient = ctx.createLinearGradient(0, 0, Math.cos(angle), Math.sin(angle))
          gradient.addColorStop(0, colorScheme.start)
          gradient.addColorStop(0.5, colorScheme.mid)
          gradient.addColorStop(1, colorScheme.end)

          ctx.save()
          ctx.rotate(angle)
          ctx.fillStyle = gradient
          ctx.shadowColor = colorScheme.mid
          ctx.shadowBlur = 14 * intensity
          ctx.fillRect(radius, -4, barLength + 12, 8)
          ctx.restore()
        }
      }

      // inner pulse ring
      ctx.beginPath()
      ctx.arc(0, 0, radius * 0.65, 0, Math.PI * 2)
      ctx.strokeStyle = colorScheme.start
      ctx.lineWidth = 6
      ctx.globalAlpha = 0.4 + (freqData ? Math.max(...freqData) / 255 : 0) * 0.3
      ctx.shadowColor = colorScheme.start
      ctx.shadowBlur = 20
      ctx.stroke()
      ctx.restore()

      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [colorScheme, getFrequencyData])

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="relative flex items-center justify-center"
    >
      <motion.div
        className="absolute inset-6 rounded-full blur-3xl"
        animate={{
          background: [
            `radial-gradient(circle, ${colorScheme.start}33, transparent 55%)`,
            `radial-gradient(circle, ${colorScheme.mid}33, transparent 55%)`,
            `radial-gradient(circle, ${colorScheme.end}33, transparent 55%)`,
          ],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <canvas
        ref={canvasRef}
        className={`rounded-full backdrop-blur-3xl bg-white/5 border border-white/10 ${
          isActive ? 'shadow-[0_0_40px_rgba(0,212,255,0.35)]' : ''
        }`}
        onClick={onCycleScheme}
      />
      <div className="absolute bottom-4 text-xs text-slate-300 uppercase tracking-[0.2em]">
        Tap to cycle schemes
      </div>
    </motion.div>
  )
}

export default AudioVisualizer

