import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing } from '../../../theme';

interface FocusModeHeaderProps {
  exerciseName: string;
  currentIndex: number;
  totalGroups: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export function FocusModeHeader({
  exerciseName,
  currentIndex,
  totalGroups,
  onClose,
  onPrev,
  onNext,
}: FocusModeHeaderProps) {
  const insets = useSafeAreaInsets();
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalGroups - 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.closeButton}>
        <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
      </TouchableOpacity>

      <Text variant="labelLarge" style={styles.indicator}>
        {currentIndex + 1} of {totalGroups}
      </Text>

      <View style={styles.navButtons}>
        <TouchableOpacity
          onPress={onPrev}
          disabled={isFirst}
          hitSlop={8}
          style={styles.navButton}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={isFirst ? colors.textMuted : colors.textPrimary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onNext}
          disabled={isLast}
          hitSlop={8}
          style={styles.navButton}
        >
          <MaterialCommunityIcons
            name="chevron-right"
            size={28}
            color={isLast ? colors.textMuted : colors.textPrimary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.base,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    flex: 1,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  navButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
