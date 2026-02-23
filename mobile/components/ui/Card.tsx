import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card as PaperCard, Text } from 'react-native-paper';
import type { ViewProps } from 'react-native';
import { colors, radii, spacing } from '../../theme';

type CardProps = ViewProps & {
  children: React.ReactNode;
};

export function Card({ style, children, ...props }: CardProps) {
  return (
    <PaperCard
      style={[styles.card, style]}
      mode="contained"
      {...props}
    >
      {children}
    </PaperCard>
  );
}

type CardHeaderProps = ViewProps & {
  title: string;
  subtitle?: string;
};

export function CardHeader({ title, subtitle, style, ...props }: CardHeaderProps) {
  return (
    <View style={[styles.header, style]} {...props}>
      <Text variant="titleMedium" style={styles.headerTitle}>
        {title}
      </Text>
      {subtitle && (
        <Text variant="bodySmall" style={styles.headerSubtitle}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

type CardContentProps = ViewProps & {
  children: React.ReactNode;
};

export function CardContent({ style, children, ...props }: CardContentProps) {
  return (
    <View style={[styles.content, style]} {...props}>
      {children}
    </View>
  );
}

type CardFooterProps = ViewProps & {
  children: React.ReactNode;
};

export function CardFooter({ style, children, ...props }: CardFooterProps) {
  return (
    <View style={[styles.footer, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 0,
  },
  header: {
    padding: spacing.base,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    color: colors.textPrimary,
  },
  headerSubtitle: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  content: {
    padding: spacing.base,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: spacing.base,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
});
