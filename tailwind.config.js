/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['"Be Vietnam Pro"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono:  ['"JetBrains Mono"', 'monospace'],
        serif: ['Georgia', 'serif'],
      },
      colors: {
        studio: {
          base:     '#09090b',
          surface:  '#111113',
          card:     '#141417',
          elevated: '#18181b',
          input:    '#222226',
          border:   'rgba(255, 255, 255, 0.07)',
          accent:   '#f97316',
          accentHover: '#ea580c',
        },
        am: {
          bg:          '#09090b',
          paper:       '#111113',
          soft:        '#18181b',
          card:        '#141417',
          hover:       '#1c1c20',
          border:      'rgba(255, 255, 255, 0.07)',
          muted:       '#a1a1aa',
          ink:         '#f4f4f5',
          yellow:      '#f97316',
          yellowHover: '#ea580c',
          coral:       '#f97316',
          green:       '#22c55e',
        },
        anna: {
          bg:          '#09090b',
          surface:     '#111113',
          card:        '#141417',
          hover:       '#1c1c20',
          border:      'rgba(255, 255, 255, 0.07)',
          accent:      '#f97316',
          accentHover: '#ea580c',
          pink:        '#f97316',
          green:       '#22c55e',
          yellow:      '#f97316',
          red:         '#ef4444',
          text:        '#f4f4f5',
          muted:       '#a1a1aa',
        }
      },
      animation: {
        'spin-slow':   'spin 14s linear infinite',
        'spin-record': 'spin 11s linear infinite',
      },
    },
  },
  plugins: [],
}
