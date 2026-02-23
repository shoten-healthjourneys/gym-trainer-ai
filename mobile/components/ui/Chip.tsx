import React from 'react';
import { StyleSheet } from 'react-native';
import { Chip as PaperChip } from 'react-native-paper';
import type { Props as PaperChipProps } from 'react-native-paper/lib/typescript/components/Chip/Chip';
import { colors, radii } from '../../theme';

type ChipProps = PaperChipProps;

export function Chip({ selected, style, textStyle, ...props }: ChipProps) {
  return (
    <PaperChip
      selected={selected}
      showSelectedCheck={false}
      style={[
        styles.base,
        selected ? styles.selected : styles.unselected,
        style,
      ]}
      textStyle={[
        selected ? styles.selectedText : styles.unselectedText,
        textStyle,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
  },
  selected: {
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  unselected: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedText: {
    color: colors.accent,
  },
  unselectedText: {
    color: colors.textSecondary,
  },
});
