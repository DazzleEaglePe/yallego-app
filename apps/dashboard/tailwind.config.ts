import { tokens } from '@yallego/design-tokens';
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: tokens.color,
      fontFamily: {
        sans: tokens.font.sans.split(', '),
        mono: tokens.font.mono.split(', '),
      },
      borderRadius: tokens.radius,
    },
  },
  plugins: [],
} satisfies Config;
