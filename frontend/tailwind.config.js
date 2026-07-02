/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Devanagari-friendly stack for Nepali text.
        deva: ['"Noto Sans Devanagari"', '"Mangal"', '"Kalimati"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
