import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useKeepAwake } from 'expo-keep-awake';
import { colors, spacing, radii } from '../../../theme';
import { Button } from '../../ui';
import { SetLogger } from '../SetLogger';
import { ManualSetDialog } from '../ManualSetDialog';
import { VoiceButton } from '../VoiceButton';
import { RestTimer } from '../RestTimer';
import { SetStopwatch } from './SetStopwatch';
import { hapticTick, hapticSuccess, formatTime } from './focusUtils';
import { useWorkoutStore } from '../../../stores/workoutStore';
import { requestMicPermission } from '../../../services/voice';
import type { ExerciseGroup, FocusPhase } from '../../../types';

interface FocusModeStandardProps {
  group: ExerciseGroup;
  sessionId: string;
}

export function FocusModeStandard({ group, sessionId }: FocusModeStandardProps) {
  useKeepAwake();

  const exercise = group.exercises[0]!;
  const restSeconds = group.timerConfig.restSeconds ?? 90;
  const warmupRestSeconds = group.timerConfig.warmupRestSeconds;

  const [phase, setPhase] = useState<FocusPhase>('idle');
  const [stopwatchStartedAt, setStopwatchStartedAt] = useState<number | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);

  const logs = useWorkoutStore((s) => s.exerciseLogs[exercise.name] ?? []);
  const logSet = useWorkoutStore((s) => s.logSet);
  const fetchExerciseLogs = useWorkoutStore((s) => s.fetchExerciseLogs);

  const initialLoadDone = useRef(false);
  const prevLogsLength = useRef(logs.length);

  // Fetch logs on mount
  useEffect(() => {
    fetchExerciseLogs(sessionId, exercise.name);
    requestMicPermission();
  }, [sessionId, exercise.name, fetchExerciseLogs]);

  // Watch logs length changes to detect new set logged
  useEffect(() => {
    if (!initialLoadDone.current) {
      // Mark initial load as done once logs have been fetched
      initialLoadDone.current = true;
      prevLogsLength.current = logs.length;
      return;
    }

    if (logs.length > prevLogsLength.current && phase === 'setActive') {
      hapticSuccess();
      setStopwatchStartedAt(null);
      setPhase('resting');
    }

    prevLogsLength.current = logs.length;
  }, [logs.length, phase]);

  const handleStartSet = useCallback(() => {
    hapticTick();
    setStopwatchStartedAt(Date.now());
    setPhase('setActive');
  }, []);

  const handleLogSetPress = useCallback(() => {
    setDialogVisible(true);
  }, []);

  const handleDialogSubmit = useCallback(
    (data: { weightKg?: number; reps?: number; distanceM?: number; durationSeconds?: number; rpe?: number }) => {
      logSet(sessionId, exercise.name, data);
      setDialogVisible(false);
    },
    [sessionId, exercise.name, logSet],
  );

  const handleDialogDismiss = useCallback(() => {
    setDialogVisible(false);
  }, []);

  const handleRestComplete = useCallback(() => {
    hapticTick();
    setPhase('idle');
  }, []);

  const handleRestDismiss = useCallback(() => {
    setPhase('idle');
  }, []);

  // Build target description
  const targetParts: string[] = [];
  targetParts.push(`${exercise.sets} x ${exercise.reps}`);
  if (restSeconds > 0) {
    targetParts.push(`Rest: ${formatTime(restSeconds)}`);
  }
  if (exercise.targetRpe) {
    targetParts.push(`RPE ${exercise.targetRpe}`);
  }
  const targetText = targetParts.join(' \u2022 ');

  // Determine if current set is a warmup (first set)
  const isWarmupSet = logs.length === 0 && warmupRestSeconds != null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Exercise info */}
      <View style={styles.exerciseInfo}>
        <Text variant="titleLarge" style={styles.exerciseName}>
          {exercise.name}
        </Text>
        <Text variant="bodyMedium" style={styles.target}>
          {targetText}
        </Text>
        {exercise.notes ? (
          <Text variant="bodySmall" style={styles.notes}>
            {exercise.notes}
          </Text>
        ) : null}
      </View>

      {/* Phase-specific content */}
      {phase === 'idle' && (
        <View style={styles.actionArea}>
          <Button onPress={handleStartSet} style={styles.fullWidthButton}>
            Start Set
          </Button>
        </View>
      )}

      {phase === 'setActive' && (
        <View style={styles.actionArea}>
          <SetStopwatch isRunning startedAt={stopwatchStartedAt} />
          <View style={styles.logActions}>
            <Button onPress={handleLogSetPress} style={styles.logButton}>
              Log Set
            </Button>
            <VoiceButton
              exerciseName={exercise.name}
              sessionId={sessionId}
            />
          </View>
        </View>
      )}

      {phase === 'resting' && (
        <View style={styles.actionArea}>
          <RestTimer
            durationSeconds={restSeconds}
            onComplete={handleRestComplete}
            onDismiss={handleRestDismiss}
            isWarmup={isWarmupSet}
            warmupRestSeconds={warmupRestSeconds}
          />
        </View>
      )}

      {/* Logged sets history */}
      <View style={styles.logsSection}>
        <Text variant="titleSmall" style={styles.logsTitle}>
          Sets Logged ({logs.length}/{exercise.sets})
        </Text>
        <SetLogger
          exerciseName={exercise.name}
          sessionId={sessionId}
          logs={logs}
          exerciseType={exercise.exerciseType}
        />
      </View>

      <ManualSetDialog
        visible={dialogVisible}
        onDismiss={handleDialogDismiss}
        onSubmit={handleDialogSubmit}
        exerciseType={exercise.exerciseType}
      />
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
  },
  exerciseInfo: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  exerciseName: {
    color: colors.textPrimary,
    textAlign: 'center',
  },
  target: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  notes: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  actionArea: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  fullWidthButton: {
    width: '100%',
  },
  logActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    marginTop: spacing.base,
  },
  logButton: {
    flex: 1,
  },
  logsSection: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.base,
  },
  logsTitle: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
});
