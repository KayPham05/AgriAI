export const theme = {
  colors: {
    background: '#f4f2ea', surface: '#fbfaf6', surfaceMuted: '#e9eee5',
    text: '#17251b', textMuted: '#5f6d62', primary: '#17613a',
    primaryPressed: '#0f4d2c', onPrimary: '#f8fbf5', border: '#ccd7c8',
    error: '#b83a32', warning: '#a66416',
  },
  spacing: { xs: 4, sm: 8, md: 16, gutter: 20, lg: 24, xl: 32 },
  radius: { input: 12, card: 16, media: 20 },
  typography: {
    title: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
    body: { fontSize: 16, lineHeight: 26, fontWeight: '400' },
    label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  },
  layout: { contentMaxWidth: 640, touchMin: 48 },
} as const;
