import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, radii, spacing } from '../../theme';

type BadgeVariant = 'accent' | 'muted' | 'success' | 'destructive';

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
};

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  accent: { bg: colors.accentMuted, text: colors.accent },
  muted: { bg: colors.surfaceElevated, text: colors.textSecondary },
  success: { bg: 'rgba(52, 199, 89, 0.15)', text: colors.success },
  destructive: { bg: 'rgba(255, 59, 48, 0.15)', text: colors.destructive },
};

export function Badge({ label, variant = 'accent' }: BadgeProps) {
  const { bg, text } = variantStyles[variant];

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text variant="labelSmall" style={{ color: text }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
});
