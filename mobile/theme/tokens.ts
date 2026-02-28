// GymTrainer Design Tokens
// Raw design values — the single source of truth for all visual styling.

export const colors = {
  // Backgrounds
  background: '#121212',
  surface: '#1E1E1E',
  surfaceElevated: '#2A2A2C',

  // Borders
  border: '#3A3A3C',
  borderSubtle: '#2C2C2E',

  // Accent (Electric Teal)
  accent: '#06C882',
  accentLight: '#34D4A0',
  accentMuted: 'rgba(6, 200, 130, 0.15)',

  // Secondary accent (Warm Amber — charts, progress, secondary badges)
  accentSecondary: '#F59E0B',
  accentSecondaryMuted: 'rgba(245, 158, 11, 0.15)',

  // Gradients (hero cards, active workout)
  gradientStart: 'rgba(6, 200, 130, 0.08)',
  gradientEnd: 'transparent',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#ABABAB',
  textMuted: '#6B6B6B',

  // Semantic
  success: '#34C759',
  warning: '#F59E0B',
  destructive: '#FF3B30',

  // On-accent (text on teal backgrounds)
  onAccent: '#121212',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
} as const;

export const fontFamilies = {
  // Headings
  heading: 'Urbanist_700Bold',
  headingSemiBold: 'Urbanist_600SemiBold',
  headingRegular: 'Urbanist_400Regular',
  // Body
  body: 'Poppins_400Regular',
  bodyLight: 'Poppins_300Light',
  bodyMedium: 'Poppins_500Medium',
  bodySemiBold: 'Poppins_600SemiBold',
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
} as const;
