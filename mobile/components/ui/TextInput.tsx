import React from 'react';
import { StyleSheet } from 'react-native';
import { TextInput as PaperTextInput } from 'react-native-paper';
import type { TextInputProps as PaperTextInputProps } from 'react-native-paper';
import { colors, radii } from '../../theme';

type TextInputProps = Omit<PaperTextInputProps, 'mode'> & {
  mode?: 'outlined' | 'flat';
};

export function TextInput({ style, mode = 'outlined', ...props }: TextInputProps) {
  return (
    <PaperTextInput
      mode={mode}
      style={[styles.input, style]}
      outlineColor={colors.border}
      activeOutlineColor={colors.accent}
      textColor={colors.textPrimary}
      placeholderTextColor={colors.textMuted}
      outlineStyle={styles.outline}
      {...props}
    />
  );
}

// Re-export TextInput.Icon for convenience
TextInput.Icon = PaperTextInput.Icon;

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
  },
  outline: {
    borderRadius: radii.lg,
  },
});
