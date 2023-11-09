const { fontFamily } = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} \*/
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-paddleFont)', ...fontFamily.sans],
      },
	  width: {
        '850px': '850px',
        '750px': '750px',
        '600px': '600px',
        '500px': '500px',
        '400px': '400px',
        '275px': '275px',
        '200px': '200px'
      },
    fontSize: {
      xxs: '0.6rem'
    }
    },
  },
  plugins: [],
}