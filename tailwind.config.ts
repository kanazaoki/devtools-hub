import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:          '#0D0D10',
        surface:     '#14141A',
        'surface-hi':'#1E1E26',
        border:      '#24242C',
        'border-hi': '#36363F',
        muted:       '#4E4E5C',
        dim:         '#767688',
        primary:     '#CCCCE0',
        bright:      '#EDEDF8',
        teal:        '#00C896',
      },
      fontFamily: {
        mono: ['Cascadia Code', 'Cascadia Mono', 'Consolas', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
