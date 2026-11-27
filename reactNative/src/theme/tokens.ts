export const theme = {
  colors: {
    background: '#f4f2ea', surface: '#fbfaf6', surfaceMuted: '#e9eee5',
    text: '#17251b', textMuted: '#5f6d62', primary: '#17613a',
    primaryPressed: '#0f4d2c', onPrimary: '#f8fbf5', border: '#ccd7c8',
    secondary: '#dce8d8', onSecondary: '#183322',
    error: '#b83a32', warning: '#a66416',
  },
  spacing: { xs: 4, sm: 8, control: 12, md: 16, gutter: 20, lg: 24, xl: 32 },
  radius: { input: 12, card: 16, media: 20, pill: 999 },
  typography: {
    title: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
    display: { fontSize: 38, lineHeight: 43, fontWeight: '700' },
    body: { fontSize: 16, lineHeight: 25, fontWeight: '400' },
    bodyStrong: { fontSize: 16, lineHeight: 25, fontWeight: '600' },
    subtitle: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
    label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
    brand: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  },
  layout: { contentMaxWidth: 640, compactWidth: 360, touchMin: 48 },
  welcome: { photoAspectRatio: 390 / 218, photoMaxHeight: 360, markWidth: 18, markHeight: 26 },
  startup: { cardMaxWidth: 340, iconSize: 24, bodyLineHeight: 25 },
  login: {
    captchaLetterSpacing: 3, captchaInputMinWidth: 96,
    formMaxWidth: 420, fieldMinHeight: 52, iconSize: 24,
    header: { fontSize: 28, lineHeight: 36, fontWeight: '700' },
    caption: { fontSize: 13, lineHeight: 19, fontWeight: '400' },
    motion: {
      panelDuration: 320, panelDistance: 12, panelOpacity: 0.82,
      fieldDuration: 380, fieldDistance: 16, fieldOpacity: 0.65,
    },
  },
} as const;
