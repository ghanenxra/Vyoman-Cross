/**
 * Vyoman Cross — Theme configuration
 * Single source of truth for colors, fonts, and design tokens.
 * Swap values here to retheme the entire app.
 */
export const theme = {
  colors: {
    bg: '#0a0e14',
    bgCard: '#111820',
    bgHover: '#1a2230',
    text: '#e2e8f0',
    textMuted: '#94a3b8',
    textDim: '#64748b',
    accent: '#38bdf8',
    accentDim: '#0c4a6e',
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
    border: '#1e293b',
  },
  fonts: {
    heading: '"Exo 2", sans-serif',
    body: '"Inter", sans-serif',
    mono: '"JetBrains Mono", monospace',
  },
} as const;
