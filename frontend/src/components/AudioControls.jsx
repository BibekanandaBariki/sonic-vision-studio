import { motion } from 'framer-motion'
import { Mic, MicOff, Palette, Repeat2 } from 'lucide-react'

const buttonBase =
  'relative overflow-hidden rounded-2xl px-5 py-3 font-semibold flex items-center gap-3'

const AudioControls = ({
  isRecording,
  onToggle,
  onColorCycle,
  colorName,
  connectionStatus,
}) => {
  return (
    <div className="flex flex-wrap gap-3">
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        onClick={onToggle}
        className={`${buttonBase} ${
          isRecording
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-500/25'
            : 'bg-gradient-to-r from-neon-pink to-neon-purple shadow-lg shadow-neon-purple/25'
        } text-white`}
      >
        <motion.div
          className="absolute inset-0 bg-white/15"
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 0.6 }}
        />
        <span className="relative z-10 flex items-center gap-2">
          {isRecording ? <Mic size={18} /> : <MicOff size={18} />}
          {isRecording ? 'Stop Capture' : 'Start Capture'}
        </span>
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        onClick={onColorCycle}
        className={`${buttonBase} bg-white/5 border border-white/10 text-white`}
      >
        <Palette size={18} />
        <div className="text-left">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
            Visual Style
          </p>
          <p className="text-sm font-semibold">{colorName}</p>
        </div>
        <Repeat2 size={16} className="ml-auto text-neon-blue" />
      </motion.button>

      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/10">
        <div
          className={`h-3 w-3 rounded-full ${
            connectionStatus === 'connected'
              ? 'bg-emerald-400 shadow-glow'
              : 'bg-amber-400'
          }`}
        />
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Backend Link
          </p>
          <p className="text-sm capitalize">{connectionStatus}</p>
        </div>
      </div>
    </div>
  )
}

export default AudioControls

