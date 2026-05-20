/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: '#FFD700',
        goldDark: '#B8860B',
      },
      fontFamily: {
        bebas: ['"Bebas Neue"', 'sans-serif'],
      },
      animation: {
        pulseStrong: 'pulseStrong 1s ease-in-out infinite',
      },
      keyframes: {
        pulseStrong: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 20px rgba(34,197,94,0.6)' },
          '50%': { transform: 'scale(1.04)', boxShadow: '0 0 40px rgba(34,197,94,0.9)' },
        },
      },
    },
  },
  plugins: [],
}
