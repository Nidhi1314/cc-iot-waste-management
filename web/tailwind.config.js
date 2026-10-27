/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        eco: {
          bg: '#F8FAF6',
          canvas: '#F8FAF6',
          surface: '#FFFFFF',
          border: '#E2E8F0',
          borderLight: '#EDF2F7',
          text: '#0F172A',
          muted: '#475569',
          soft: '#64748B',
          dim: '#94A3B8',
          pine: '#1B4332',
          pineHover: '#143527',
          forest: '#2D6A4F',
          sage: '#2D6A4F',
          leaf: '#2D6A4F',
          amber: '#D97706',
          amberLight: '#FEF3C7',
          red: '#DC2626',
          redLight: '#FEE2E2',
        },
        app: '#F8FAF6',
        panel: '#FFFFFF',
        panel2: '#F1F5F9',
        line: '#E2E8F0',
        main: '#0F172A',
        muted: '#475569',
        soft: '#64748B',
        accent: '#2D6A4F',
        accentStrong: '#1B4332',
        success: '#2D6A4F',
        warning: '#D97706',
        danger: '#DC2626',
      },
      boxShadow: {
        'eco-sm': '0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
        'eco': '0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.05)',
        'eco-lg': '0 10px 15px -3px rgba(15, 23, 42, 0.06), 0 4px 6px -4px rgba(15, 23, 42, 0.06)',
      },
      animation: {
        'alert-pulse': 'alertRing 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        alertRing: {
          '75%, 100%': {
            transform: 'scale(2.2)',
            opacity: '0',
          },
        },
      },
    },
  },
  plugins: [],
};
