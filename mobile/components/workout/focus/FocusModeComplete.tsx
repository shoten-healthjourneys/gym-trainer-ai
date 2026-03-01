import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../../../theme';
import { Button } from '../../ui';
import { useWorkoutStore } from '../../../stores/workoutStore';
import type { ExerciseGroup } from '../../../types';

interface FocusModeCompleteProps {
  group: ExerciseGroup;
  sessionId: string;
  onContinue: () => void;
  onClose: () => void;
  isLastGroup: boolean;
}

export function FocusModeComplete({
  group,
  sessionId,
  onContinue,
  onClose,
  isLastGroup,
}: FocusModeCompleteProps) {
  const exerciseLogs = useWorkoutStore((s) => s.exerciseLogs);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Success header */}
      <View style={styles.header}>
        <View style={styles.checkCircle}>
          <MaterialCommunityIcons
            name="check"
            size={40}
            color={colors.onAccent}
          />
        </View>
        <Text variant="headlineSmall" style={styles.title}>
          Exercise Complete
        </Text>
      </View>

      {/* Exercise summaries */}
      <View style={styles.summaryList}>
        {group.exercises.map((exercise) => {
          const logs = exerciseLogs[exercise.name] ?? [];
          const totalSets = logs.length;
          const totalVolume = logs.reduce((sum, log) => {
            const weight = log.weightKg ?? 0;
            const reps = log.reps ?? 0;
            return sum + weight * reps;
          }, 0);

          return (
            <View key={exercise.name} style={styles.summaryCard}>
              <Text variant="titleSmall" style={styles.exerciseName}>
                {exercise.name}
              </Text>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text variant="headlineSmall" style={styles.statValue}>
                    {totalSets}
                  </Text>
                  <Text variant="labelSmall" style={styles.statLabel}>
                    sets
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text variant="headlineSmall" style={styles.statValue}>
                    {totalVolume > 0 ? totalVolume.toLocaleString() : '--'}
                  </Text>
                  <Text variant="labelSmall" style={styles.statLabel}>
                    kg volume
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {!isLastGroup && (
          <Button onPress={onContinue} style={styles.continueButton}>
            Continue to Next Group
          </Button>
        )}
        <Button variant="ghost" onPress={onClose}>
          Close Focus Mode
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.base,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.textPrimary,
  },
  summaryList: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.base,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.base,
  },
  exerciseName: {
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: colors.accent,
  },
  statLabel: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  actions: {
    width: '100%',
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  continueButton: {
    width: '100%',
  },
});
