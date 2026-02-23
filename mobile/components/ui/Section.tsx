import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, spacing } from '../../theme';

type SectionProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function Section({ title, subtitle, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      {subtitle && (
        <Text variant="bodySmall" style={styles.subtitle}>
          {subtitle}
        </Text>
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  content: {
    marginTop: spacing.md,
  },
});
