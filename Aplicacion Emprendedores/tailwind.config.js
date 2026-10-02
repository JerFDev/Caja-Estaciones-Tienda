/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#d5792a', // Bariloche Municipio brand orange
          600: '#be6318',
          700: '#9c4c0f',
          800: '#7e3d10',
          900: '#673310',
        },
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#d5792a',
          600: '#be6318',
          700: '#9c4c0f',
          800: '#7e3d10',
          900: '#673310',
        }
      }
    },
  },
  plugins: [],
};
