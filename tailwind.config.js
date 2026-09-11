/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['"DM Sans"', 'sans-serif'],
        mono:  ['"DM Mono"', 'monospace'],
        serif: ['Georgia', 'serif'],
      },
      colors: {
        am: {
          bg:          '#111316',
          paper:       '#181a1e',
          soft:        '#202328',
          card:        '#1e2024',
          hover:       '#25282d',
          border:      '#2a2d31',
          muted:       '#777b80',
          ink:         '#eee9e0',
          yellow:      '#e8c977',
          yellowHover: '#f0d88e',
          coral:       '#ef7864',
          green:       '#6fcf97',
        },
        anna: {
          bg:          '#111316',
          surface:     '#181a1e',
          card:        '#1e2024',
          hover:       '#25282d',
          border:      '#2a2d31',
          accent:      '#e8c977',
          accentHover: '#f0d88e',
          pink:        '#ef7864',
          green:       '#6fcf97',
          yellow:      '#e8c977',
          red:         '#ef7864',
          text:        '#eee9e0',
          muted:       '#777b80',
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
