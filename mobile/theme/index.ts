import { MD3DarkTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';
import type { MD3Type } from 'react-native-paper/lib/typescript/types';
import { colors, fontFamilies } from './tokens';

export { colors, spacing, radii, fontFamilies, fontSizes } from './tokens';

const baseFont = {
  fontFamily: fontFamilies.body,
  letterSpacing: 0,
};

const fontVariants: Record<string, Partial<MD3Type>> = {
  displayLarge: { ...baseFont, fontFamily: fontFamilies.heading, fontSize: 57, lineHeight: 64, fontWeight: '700' as const },
  displayMedium: { ...baseFont, fontFamily: fontFamilies.heading, fontSize: 45, lineHeight: 52, fontWeight: '700' as const },
  displaySmall: { ...baseFont, fontFamily: fontFamilies.heading, fontSize: 36, lineHeight: 44, fontWeight: '700' as const },
  headlineLarge: { ...baseFont, fontFamily: fontFamilies.heading, fontSize: 32, lineHeight: 40, fontWeight: '700' as const },
  headlineMedium: { ...baseFont, fontFamily: fontFamilies.heading, fontSize: 28, lineHeight: 36, fontWeight: '700' as const },
  headlineSmall: { ...baseFont, fontFamily: fontFamilies.headingSemiBold, fontSize: 24, lineHeight: 32, fontWeight: '600' as const },
  titleLarge: { ...baseFont, fontFamily: fontFamilies.headingSemiBold, fontSize: 22, lineHeight: 28, fontWeight: '600' as const },
  titleMedium: { ...baseFont, fontFamily: fontFamilies.headingSemiBold, fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  titleSmall: { ...baseFont, fontFamily: fontFamilies.headingSemiBold, fontSize: 14, lineHeight: 20, fontWeight: '600' as const },
  bodyLarge: { ...baseFont, fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyMedium: { ...baseFont, fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  bodySmall: { ...baseFont, fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  labelLarge: { ...baseFont, fontFamily: fontFamilies.bodyMedium, fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
  labelMedium: { ...baseFont, fontFamily: fontFamilies.bodyMedium, fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  labelSmall: { ...baseFont, fontFamily: fontFamilies.bodyMedium, fontSize: 11, lineHeight: 16, fontWeight: '500' as const },
};

const fonts = configureFonts({ config: fontVariants });

export const theme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.accent,
    onPrimary: colors.onAccent,
    primaryContainer: colors.accentMuted,
    onPrimaryContainer: colors.accent,
    secondary: colors.accent,
    onSecondary: colors.onAccent,
    secondaryContainer: colors.accentMuted,
    onSecondaryContainer: colors.accent,
    tertiary: colors.accentLight,
    onTertiary: colors.onAccent,
    tertiaryContainer: colors.accentMuted,
    onTertiaryContainer: colors.accentLight,
    error: colors.destructive,
    onError: colors.textPrimary,
    errorContainer: '#93000a',
    onErrorContainer: '#ffdad6',
    background: colors.background,
    onBackground: colors.textPrimary,
    surface: colors.surface,
    onSurface: colors.textPrimary,
    surfaceVariant: colors.surfaceElevated,
    onSurfaceVariant: colors.textSecondary,
    outline: colors.border,
    outlineVariant: colors.borderSubtle,
    inverseSurface: colors.textPrimary,
    inverseOnSurface: colors.background,
    inversePrimary: colors.accent,
    elevation: {
      level0: 'transparent',
      level1: colors.surface,
      level2: colors.surfaceElevated,
      level3: '#333335',
      level4: '#383838',
      level5: '#3E3E40',
    },
    surfaceDisabled: 'rgba(255, 255, 255, 0.12)',
    onSurfaceDisabled: 'rgba(255, 255, 255, 0.38)',
    backdrop: 'rgba(0, 0, 0, 0.5)',
  },
  fonts,
};

export type AppTheme = typeof theme;
