import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
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

interface FocusModeSupersetStandardProps {
  group: ExerciseGroup;
  sessionId: string;
}

const EXERCISE_LABELS = ['A', 'B', 'C', 'D', 'E'];

export function FocusModeSupersetStandard({ group, sessionId }: FocusModeSupersetStandardProps) {
  useKeepAwake();

  const exercises = group.exercises;
  const restSeconds = group.timerConfig.restSeconds ?? 90;

  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [phase, setPhase] = useState<FocusPhase>('idle');
  const [stopwatchStartedAt, setStopwatchStartedAt] = useState<number | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [supersetRound, setSupersetRound] = useState(1);

  const exerciseLogs = useWorkoutStore((s) => s.exerciseLogs);
  const logSet = useWorkoutStore((s) => s.logSet);
  const fetchExerciseLogs = useWorkoutStore((s) => s.fetchExerciseLogs);

  const currentExercise = exercises[activeExerciseIndex]!;
  const currentLogs = exerciseLogs[currentExercise.name] ?? [];
  const isLastExercise = activeExerciseIndex === exercises.length - 1;

  // Refs for tracking log changes per exercise
  const initialLoadDone = useRef(false);
  const prevLogsLengthMap = useRef<Record<string, number>>({});

  // Fetch logs for ALL exercises on mount
  useEffect(() => {
    for (const ex of exercises) {
      fetchExerciseLogs(sessionId, ex.name);
    }
    requestMicPermission();
  }, [sessionId, exercises, fetchExerciseLogs]);

  // Initialise previous log lengths after initial fetch
  useEffect(() => {
    if (!initialLoadDone.current) {
      const allFetched = exercises.every(
        (ex) => exerciseLogs[ex.name] !== undefined,
      );
      if (allFetched) {
        initialLoadDone.current = true;
        const map: Record<string, number> = {};
        for (const ex of exercises) {
          map[ex.name] = (exerciseLogs[ex.name] ?? []).length;
        }
        prevLogsLengthMap.current = map;
      }
      return;
    }

    // Check if the current exercise got a new log
    const currentName = currentExercise.name;
    const currentLen = (exerciseLogs[currentName] ?? []).length;
    const prevLen = prevLogsLengthMap.current[currentName] ?? 0;

    if (currentLen > prevLen && phase === 'setActive') {
      hapticSuccess();
      setStopwatchStartedAt(null);

      if (isLastExercise) {
        // Last exercise in superset -- rest before next round
        setPhase('resting');
      } else {
        // Advance to next exercise immediately (no rest between superset exercises)
        setActiveExerciseIndex((prev) => prev + 1);
        setPhase('idle');
      }
    }

    // Update all tracked lengths
    const map: Record<string, number> = {};
    for (const ex of exercises) {
      map[ex.name] = (exerciseLogs[ex.name] ?? []).length;
    }
    prevLogsLengthMap.current = map;
  }, [exerciseLogs, exercises, currentExercise.name, phase, isLastExercise]);

  const handleTabPress = useCallback((index: number) => {
    setActiveExerciseIndex(index);
  }, []);

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
      logSet(sessionId, currentExercise.name, data);
      setDialogVisible(false);
    },
    [sessionId, currentExercise.name, logSet],
  );

  const handleDialogDismiss = useCallback(() => {
    setDialogVisible(false);
  }, []);

  const handleRestComplete = useCallback(() => {
    hapticTick();
    // After rest, cycle back to first exercise and increment round
    setActiveExerciseIndex(0);
    setSupersetRound((prev) => prev + 1);
    setPhase('idle');
  }, []);

  const handleRestDismiss = useCallback(() => {
    setActiveExerciseIndex(0);
    setSupersetRound((prev) => prev + 1);
    setPhase('idle');
  }, []);

  // Determine total target sets (use the max sets across exercises)
  const targetSets = Math.max(...exercises.map((ex) => ex.sets));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Exercise tabs */}
      <View style={styles.tabs}>
        {exercises.map((ex, index) => {
          const isActive = index === activeExerciseIndex;
          return (
            <TouchableOpacity
              key={ex.name}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => handleTabPress(index)}
            >
              <Text
                variant="labelLarge"
                style={[styles.tabLabel, isActive && styles.tabLabelActive]}
              >
                {EXERCISE_LABELS[index] ?? `${index + 1}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Round indicator */}
      <View style={styles.roundRow}>
        <Text variant="labelMedium" style={styles.roundText}>
          Set {supersetRound} of {targetSets}
        </Text>
      </View>

      {/* Current exercise info */}
      <View style={styles.exerciseInfo}>
        <Text variant="titleLarge" style={styles.exerciseName}>
          {currentExercise.name}
        </Text>
        <Text variant="bodyMedium" style={styles.target}>
          {currentExercise.sets} x {currentExercise.reps}
          {restSeconds > 0 ? ` \u2022 Rest: ${formatTime(restSeconds)}` : ''}
          {currentExercise.targetRpe ? ` \u2022 RPE ${currentExercise.targetRpe}` : ''}
        </Text>
        {currentExercise.notes ? (
          <Text variant="bodySmall" style={styles.notes}>
            {currentExercise.notes}
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
              exerciseName={currentExercise.name}
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
          />
        </View>
      )}

      {/* Logged sets for current exercise */}
      <View style={styles.logsSection}>
        <Text variant="titleSmall" style={styles.logsTitle}>
          {currentExercise.name} — Sets Logged ({currentLogs.length}/{currentExercise.sets})
        </Text>
        <SetLogger
          exerciseName={currentExercise.name}
          sessionId={sessionId}
          logs={currentLogs}
          exerciseType={currentExercise.exerciseType}
        />
      </View>

      <ManualSetDialog
        visible={dialogVisible}
        onDismiss={handleDialogDismiss}
        onSubmit={handleDialogSubmit}
        exerciseType={currentExercise.exerciseType}
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
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.accent,
  },
  tabLabel: {
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.accent,
  },
  roundRow: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  roundText: {
    color: colors.textSecondary,
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
