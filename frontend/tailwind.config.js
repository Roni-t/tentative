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
          950: '#000000',
          900: '#050505',
          850: '#09090B',
          800: '#121214',
          700: '#18181B',
          600: '#27272A',
          500: '#3F3F46',
        },
        cosmic: {
          purple: '#FFFFFF',
          violet: '#F4F4F5',
          cyan: '#E4E4E7',
          blue: '#D4D4D8',
          pink: '#FAFAFA',
          magenta: '#A1A1AA',
        },
        glass: {
          bg: 'rgba(18, 18, 18, 0.75)',
          border: 'rgba(255, 255, 255, 0.12)',
          hover: 'rgba(255, 255, 255, 0.2)',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': '0 0 15px -3px rgba(255, 255, 255, 0.35)',
        'glow-md': '0 0 25px -4px rgba(255, 255, 255, 0.55)',
        'glow-cyan': '0 0 25px -4px rgba(255, 255, 255, 0.45)',
        'glow-pink': '0 0 25px -4px rgba(255, 255, 255, 0.45)',
        'glow-white': '0 0 35px rgba(255, 255, 255, 0.7)',
        'glass-edge': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.2)',
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
