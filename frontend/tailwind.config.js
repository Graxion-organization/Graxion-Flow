/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        whatsapp: { DEFAULT: '#25D366', dark: '#128C7E', light: '#DCF8C6' },
        brand: {
          50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0',
          500: '#22c55e', 600: '#16a34a', 700: '#15803d',
          900: '#14532d',
        },
      },
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(10px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
};
