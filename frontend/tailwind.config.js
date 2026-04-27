/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#00455D',
          dark:    '#003347',
          darker:  '#002233',
          light:   '#E5F8FF',
          muted:   '#B3CCDA',
          faint:   '#F0FAFF',
        },
        accent: {
          DEFAULT: '#4DD2FF',
          soft:    '#99E5FF',
          light:   '#E5F8FF',
        },
        ink: {
          DEFAULT: '#101828',
          mid:     '#344054',
          sub:     '#667085',
          muted:   '#98A2B3',
          faint:   '#D0D5DD',
        },
        edge: {
          DEFAULT: '#E4E7EC',
          soft:    '#EAECF0',
          active:  '#99E5FF',
        }
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
}
