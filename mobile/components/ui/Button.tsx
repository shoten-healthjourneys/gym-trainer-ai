import React from 'react';
import { StyleSheet } from 'react-native';
import { Button as PaperButton } from 'react-native-paper';
import type { Props as PaperButtonProps } from 'react-native-paper/lib/typescript/components/Button/Button';
import { colors, radii } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'default' | 'small';

type ButtonProps = Omit<PaperButtonProps, 'mode' | 'buttonColor' | 'textColor'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = 'primary',
  size = 'default',
  style,
  contentStyle,
  labelStyle,
  ...props
}: ButtonProps) {
  const mode = variant === 'ghost' ? 'text' : variant === 'secondary' ? 'outlined' : 'contained';

  const buttonColor =
    variant === 'primary'
      ? colors.accent
      : variant === 'secondary'
        ? colors.surface
        : 'transparent';

  const textColor =
    variant === 'primary'
      ? colors.onAccent
      : colors.accent;

  return (
    <PaperButton
      mode={mode}
      buttonColor={buttonColor}
      textColor={textColor}
      contentStyle={[
        size === 'default' ? styles.contentDefault : styles.contentSmall,
        contentStyle,
      ]}
      style={[
        styles.base,
        variant === 'secondary' && styles.secondaryBorder,
        style,
      ]}
      labelStyle={[
        size === 'small' && styles.labelSmall,
        labelStyle,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
  },
  secondaryBorder: {
    borderColor: colors.accent,
  },
  contentDefault: {
    height: 48,
  },
  contentSmall: {
    height: 36,
  },
  labelSmall: {
    fontSize: 13,
  },
});
