/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Core design tokens (unified palette)
        app: 'var(--bg)',
        panel: 'var(--panel)',
        panel2: 'var(--panel2)',
        line: 'var(--border)',
        border2: 'var(--border2)',
        main: 'var(--text)',
        muted: 'var(--muted)',
        soft: 'var(--soft)',
        dim: 'var(--dim)',
        accent: 'var(--purple)',
        accentStrong: 'var(--blue)',
        onAccent: 'var(--on-accent)',
        success: 'var(--green)',
        warning: 'var(--orange)',
        danger: 'var(--red)',
        dangerBg: 'var(--danger-glow)',
        emptyBg: 'rgba(49, 50, 68, 0.5)',
        mapBg: 'var(--panel)',
        // Legacy aliases (backward compat)
        color_app: 'var(--color-app)',
        color_panel: 'var(--color-panel)',
        // Admin terminal tokens
        terminal: 'var(--t-bg)',
        terminalPanel: 'var(--t-panel)',
        terminalPanel2: 'var(--t-panel2)',
        terminalBorder: 'var(--t-border)',
        terminalText: 'var(--t-text)',
        terminalMuted: 'var(--t-muted)',
        terminalAccent: 'var(--t-accent)',
        terminalAccent2: 'var(--t-accent2)',
        terminalWarn: 'var(--t-warn)',
        terminalDanger: 'var(--t-danger)',
        // Driver fresh tokens
        fresh: 'var(--d-bg)',
        freshPanel: 'var(--d-panel)',
        freshBorder: 'var(--d-border)',
        freshText: 'var(--d-text)',
        freshMuted: 'var(--d-muted)',
        freshAccent: 'var(--d-accent)',
        freshAccentLight: 'var(--d-accent-light)',
        freshWarn: 'var(--d-warn)',
        freshDanger: 'var(--d-danger)',
      },
    },
  },
  plugins: [],
};
