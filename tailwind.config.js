/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
      },
      colors: {
        background: '#13141f',
        surface: '#242636',
        primary: '#fbbf24', // yellow-400
      }
    },
  },
  plugins: [],
}