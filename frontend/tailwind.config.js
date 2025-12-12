/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'neon-blue': '#00D4FF',
        'neon-purple': '#9D00FF',
        'neon-pink': '#FF006E',
        'neon-cyan': '#00FFF5',
        'bg-primary': '#0A0E27',
        'bg-secondary': '#151932',
      },
      boxShadow: {
        glow: '0 0 25px rgba(0, 212, 255, 0.35)',
      },
      backgroundImage: {
        'primary-gradient':
          'linear-gradient(135deg, #00D4FF 0%, #9D00FF 50%, #FF006E 100%)',
      },
      animation: {
        'spin-slow': 'spin 12s linear infinite',
        'pulse-neon': 'pulse-neon 2.5s ease-in-out infinite',
      },
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(0, 212, 255, 0.3)' },
          '50%': { boxShadow: '0 0 35px rgba(157, 0, 255, 0.55)' },
        },
      },
    },
  },
  plugins: [],
}

