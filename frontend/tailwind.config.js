/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        space: {
          950: '#030407',
          900: '#05060A',
          850: '#090A12',
          800: '#0D0E1A',
          700: '#15172A',
          600: '#1F223D',
          500: '#2E3258',
        },
        cosmic: {
          purple: '#8B5CF6',
          violet: '#A855F7',
          cyan: '#38BDF8',
          blue: '#0EA5E9',
          pink: '#EC4899',
          magenta: '#D946EF',
        },
        glass: {
          bg: 'rgba(16, 18, 35, 0.65)',
          border: 'rgba(255, 255, 255, 0.1)',
          hover: 'rgba(255, 255, 255, 0.14)',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': '0 0 15px -3px rgba(168, 85, 247, 0.35)',
        'glow-md': '0 0 25px -4px rgba(168, 85, 247, 0.45)',
        'glow-cyan': '0 0 25px -4px rgba(56, 189, 248, 0.45)',
        'glow-pink': '0 0 25px -4px rgba(236, 72, 153, 0.45)',
        'glass-edge': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.15)',
      },
      animation: {
        'spin-slow': 'spin 20s linear infinite',
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'drift': 'drift 12s ease-in-out infinite alternate',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.75', transform: 'scale(1.05)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'drift': {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '100%': { transform: 'translate(30px, -20px) scale(1.08)' },
        }
      }
    },
  },
  plugins: [],
}
