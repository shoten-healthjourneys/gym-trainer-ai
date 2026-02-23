import React from 'react';
import { StyleSheet } from 'react-native';
import { SegmentedButtons as PaperSegmentedButtons } from 'react-native-paper';
import { colors } from '../../theme';

type SegmentedButtonsProps = React.ComponentProps<typeof PaperSegmentedButtons>;

export function SegmentedButtons({ style, ...props }: SegmentedButtonsProps) {
  return (
    <PaperSegmentedButtons
      style={[styles.base, style]}
      theme={{
        colors: {
          secondaryContainer: colors.accentMuted,
          onSecondaryContainer: colors.accent,
          onSurface: colors.textSecondary,
          outline: colors.border,
        },
      }}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    // Default styling handled by theme override
  },
});
