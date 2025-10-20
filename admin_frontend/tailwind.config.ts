import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2D4A8A',
        secondary: '#4F6FB8',
        accent: '#E67E22',
        muted: '#F4F6FB',
      }
    }
  },
  plugins: [],
} satisfies Config;
