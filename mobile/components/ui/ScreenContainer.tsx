import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';

type ScreenContainerProps = {
  children: React.ReactNode;
  scroll?: boolean;
  title?: string;
  padded?: boolean;
};

export function ScreenContainer({
  children,
  scroll = false,
  title,
  padded = true,
}: ScreenContainerProps) {
  const content = (
    <>
      {title && (
        <Text variant="headlineMedium" style={styles.title}>
          {title}
        </Text>
      )}
      {children}
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            padded && styles.padded,
            styles.scrollContent,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      ) : (
        <View style={[styles.inner, padded && styles.padded]}>
          {content}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  inner: {
    flex: 1,
  },
  padded: {
    padding: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
});
