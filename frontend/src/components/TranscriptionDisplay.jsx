import { motion, AnimatePresence } from 'framer-motion'
import { User, Bot, Mic } from 'lucide-react'
import { useEffect, useRef } from 'react'

const TranscriptionDisplay = ({ partial, conversation, audioLevel, isSpeaking }) => {
  const bottomRef = useRef(null)

  // Auto-scroll to bottom directly
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [conversation, partial])

  return (
    <div className="space-y-6">
      {/* Header / Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User size={16} className="text-neon-blue" />
          <p className="text-xs uppercase tracking-[0.25em] text-neon-blue">Conversation History</p>
        </div>

        {/* VAD Status Indicator */}
        {isSpeaking && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="flex items-center gap-1"
          >
            <Mic size={14} className="text-emerald-400" />
            <motion.span
              className="text-xs text-emerald-400"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Speaking...
            </motion.span>
          </motion.div>
        )}
      </div>

      <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {conversation.map((item, idx) => (
          <div key={item.id || idx} className="space-y-2">
            {/* User Bubble */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-4 bg-white/5 border border-white/10"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-1">
                You said
              </p>
              <p className="text-lg leading-relaxed">{item.user}</p>
            </motion.div>

            {/* AI Bubble - Directly below */}
            <AnimatePresence>
              {item.ai && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-2xl p-4 bg-gradient-to-r from-neon-purple/10 to-neon-pink/10 border border-neon-purple/30 ml-4 lg:ml-8"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Bot size={14} className="text-neon-purple" />
                    <p className="text-xs uppercase tracking-[0.2em] text-neon-purple">
                      Ai Response (Gemini)
                    </p>
                  </div>
                  <p className="text-lg leading-relaxed text-purple-100">{item.ai}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {/* Active Partial Transcript */}
        <AnimatePresence mode="popLayout">
          {partial && (
            <motion.div
              key="partial"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-2xl p-4 bg-emerald-500/10 border border-emerald-400/30 shadow-inner"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-400 mb-2">
                Listening...
              </p>
              <motion.p
                className="text-lg leading-relaxed text-emerald-300"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              >
                {partial}
                <span className="inline-block w-2 h-4 bg-emerald-400/80 ml-1 animate-pulse" />
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Audio Level Indicator */}
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
