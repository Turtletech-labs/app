// Design tokens. Every colour, size and radius used by the app comes from here.
export const colors = {
  bg: '#F4F2EC',
  surface: '#FFFFFF',
  ink: '#1B1F4B',
  muted: '#5A5F73',
  line: '#E1DED5',
  teal: '#0F6E70',
  tealTint: '#DCEDEC',
  saffron: '#B4580C',
  saffronTint: '#FBE9D6',
  sos: '#B3261E',
  sosTint: '#F9E0DE',
  good: '#2E7D4F',
  goodTint: '#E0F1E6',
  white: '#FFFFFF',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const type = {
  title: { fontSize: 24, fontWeight: '700' as const, color: colors.ink },
  h2: { fontSize: 18, fontWeight: '700' as const, color: colors.ink },
  body: { fontSize: 15, lineHeight: 22, color: colors.ink },
  small: { fontSize: 13, lineHeight: 18, color: colors.muted },
  label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.4, color: colors.muted },
} as const;

// Content column width on tablets and desktop browsers.
export const maxWidth = 560;
