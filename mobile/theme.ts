import { MD3DarkTheme, MD3LightTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

const fontConfig = configureFonts({ config: { fontFamily: 'System' } });

const darkColors = {
  primary: '#1a1a2e',
  onPrimary: '#ffffff',
  primaryContainer: '#1a1a2e',
  onPrimaryContainer: '#e0e0ff',
  secondary: '#4361ee',
  onSecondary: '#ffffff',
  secondaryContainer: '#2a3a8e',
  onSecondaryContainer: '#dde1ff',
  tertiary: '#06d6a0',
  onTertiary: '#003826',
  tertiaryContainer: '#005138',
  onTertiaryContainer: '#6efcc0',
  error: '#ef476f',
  onError: '#ffffff',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',
  background: '#0f0f23',
  onBackground: '#e6e1e5',
  surface: '#16213e',
  onSurface: '#e6e1e5',
  surfaceVariant: '#1e2d50',
  onSurfaceVariant: '#cac4d0',
  outline: '#938f99',
  outlineVariant: '#49454f',
  inverseSurface: '#e6e1e5',
  inverseOnSurface: '#1c1b1f',
  inversePrimary: '#4361ee',
  elevation: {
    level0: 'transparent',
    level1: '#1a1a3a',
    level2: '#1e2045',
    level3: '#222550',
    level4: '#252855',
    level5: '#282b5e',
  },
  surfaceDisabled: 'rgba(230, 225, 229, 0.12)',
  onSurfaceDisabled: 'rgba(230, 225, 229, 0.38)',
  backdrop: 'rgba(0, 0, 0, 0.5)',
};

const lightColors = {
  primary: '#1a1a2e',
  onPrimary: '#ffffff',
  primaryContainer: '#dde1ff',
  onPrimaryContainer: '#0f1033',
  secondary: '#4361ee',
  onSecondary: '#ffffff',
  secondaryContainer: '#dde1ff',
  onSecondaryContainer: '#131c5e',
  tertiary: '#06d6a0',
  onTertiary: '#ffffff',
  tertiaryContainer: '#6efcc0',
  onTertiaryContainer: '#002114',
  error: '#ef476f',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#410002',
  background: '#f8f8fc',
  onBackground: '#1c1b1f',
  surface: '#ffffff',
  onSurface: '#1c1b1f',
  surfaceVariant: '#e7e0ec',
  onSurfaceVariant: '#49454f',
  outline: '#79747e',
  outlineVariant: '#cac4d0',
  inverseSurface: '#313033',
  inverseOnSurface: '#f4eff4',
  inversePrimary: '#b8c4ff',
  elevation: {
    level0: 'transparent',
    level1: '#f5f0ff',
    level2: '#efe9fb',
    level3: '#e9e3f7',
    level4: '#e7e1f5',
    level5: '#e3ddf2',
  },
  surfaceDisabled: 'rgba(28, 27, 31, 0.12)',
  onSurfaceDisabled: 'rgba(28, 27, 31, 0.38)',
  backdrop: 'rgba(0, 0, 0, 0.3)',
};

export const theme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...darkColors,
  },
  fonts: fontConfig,
};

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...lightColors,
  },
  fonts: fontConfig,
};

export type AppTheme = typeof theme;
