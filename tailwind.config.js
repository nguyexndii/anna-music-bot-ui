/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        brand: ['"Playfair Display"', 'serif'],
        sans: ['"Be Vietnam Pro"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        body: ['"Be Vietnam Pro"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // Stitch Boutique Vinyl Lounge Palette
        surface: {
          DEFAULT: '#111316',
          dim: '#111316',
          bright: '#37393d',
          'container-lowest': '#0c0e11',
          'container-low': '#16181b',
          container: '#1c1e22',
          'container-high': '#24272c',
          'container-highest': '#2e3137',
        },
        'on-surface': {
          DEFAULT: '#e2e2e6',
          variant: '#aba395',
        },
        outline: {
          DEFAULT: '#7f786c',
          variant: '#37342e',
        },
        primary: {
          DEFAULT: '#ffe6a9',
          container: '#e8c977',
        },
        'on-primary': {
          DEFAULT: '#3d2e00',
          container: '#4a3b05',
        },
        secondary: {
          DEFAULT: '#ef7864',
          container: '#7a2b1f',
        },
        'on-secondary': {
          container: '#ffc1b8',
        },
        tertiary: {
          DEFAULT: '#9bfcc0',
          container: '#205739',
        },
        'on-tertiary': {
          container: '#bbfce0',
        },

        // Backward compatibility aliases
        studio: {
          base: '#111316',
          surface: '#16181b',
          card: '#1c1e22',
          elevated: '#24272c',
          input: '#141619',
          border: 'rgba(255, 255, 255, 0.07)',
          accent: '#e8c977',
          accentHover: '#ffe6a9',
        },
        anna: {
          bg: '#111316',
          surface: '#16181b',
          card: '#1c1e22',
          hover: '#24272c',
          border: 'rgba(255, 255, 255, 0.07)',
          accent: '#e8c977',
          accentHover: '#ffe6a9',
          pink: '#ef7864',
          green: '#9bfcc0',
          yellow: '#e8c977',
          red: '#ef7864',
          text: '#e2e2e6',
          muted: '#aba395',
        }
      },
    },
  },
  plugins: [],
}
