/** @type {import('tailwindcss').Config} */

export default {

  content: [

    "./index.html",

    "./src/**/*.{js,ts,jsx,tsx}",

  ],

  theme: {

    extend: {

      fontFamily: {

        sans: ['"Be Vietnam Pro"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],

        mono: ['"JetBrains Mono"', 'monospace'],

      },

      colors: {

        studio: {

          base: '#06080f',

          surface: '#0b0f19',

          card: '#111726',

          elevated: '#171f32',

          input: '#1e293b',

          border: 'rgba(255, 255, 255, 0.08)',

          accent: '#06b6d4',

          accentHover: '#0891b2',

        },

        anna: {

          bg: '#06080f',

          surface: '#0b0f19',

          card: '#111726',

          hover: '#171f32',

          border: 'rgba(255, 255, 255, 0.08)',

          accent: '#06b6d4',

          accentHover: '#0891b2',

          pink: '#8b5cf6',

          green: '#10b981',

          yellow: '#06b6d4',

          red: '#f43f5e',

          text: '#f8fafc',

          muted: '#94a3b8',

        }

      },

    },

  },

  plugins: [],

}
