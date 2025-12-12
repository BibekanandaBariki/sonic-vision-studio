import { motion, AnimatePresence } from 'framer-motion'

const TranscriptionDisplay = ({ partial, finals, audioLevel }) => {
  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {partial && (
          <motion.div
            key="partial"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl p-4 bg-white/5 border border-white/10 shadow-inner"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-neon-blue mb-2">
              Streaming...
            </p>
            <motion.p
              className="text-lg leading-relaxed"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            >
              {partial}
              <span className="inline-block w-2 h-4 bg-neon-blue/80 ml-1 animate-pulse" />
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-3">
        {finals.map((text, idx) => (
          <motion.div
            key={`${text}-${idx}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4 bg-gradient-to-r from-white/5 to-white/0 border border-white/10"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-1">
              Final {idx + 1}
            </p>
            <p className="text-lg leading-relaxed">{text}</p>
          </motion.div>
        ))}
      </div>

      <div className="h-2 rounded-full bg-white/5 border border-white/10 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink"
          animate={{ width: `${Math.max(audioLevel * 100, 5)}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 18 }}
        />
      </div>
    </div>
  )
}

export default TranscriptionDisplay

