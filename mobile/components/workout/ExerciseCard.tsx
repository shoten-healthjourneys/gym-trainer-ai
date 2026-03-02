import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Snackbar, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, CardContent, Button } from '../ui';
import { colors, spacing } from '../../theme';
import { useWorkoutStore } from '../../stores/workoutStore';
import { requestMicPermission } from '../../services/voice';
import { SetLogger } from './SetLogger';
import { RestTimer } from './RestTimer';
import { VoiceButton } from './VoiceButton';
import { ManualSetDialog } from './ManualSetDialog';
import { SetStopwatch } from './focus/SetStopwatch';
import { hapticTick } from './focus/focusUtils';
import type { ExerciseInSession, TimerConfig } from '../../types';

type CardPhase = 'idle' | 'setActive' | 'resting';

interface ExerciseCardProps {
  exercise: ExerciseInSession;
  sessionId: string;
  timerConfig?: TimerConfig;
  /** If provided, controls expansion from parent (superset flow) */
  expanded?: boolean;
  onToggleExpand?: () => void;
  /** Suppress rest timer — parent manages it (superset groups) */
  suppressRest?: boolean;
  /** Callback when a set is logged (for superset flow) */
  onSetLogged?: () => void;
}

export function ExerciseCard({
  exercise,
  sessionId,
  timerConfig,
  expanded: controlledExpanded,
  onToggleExpand,
  suppressRest,
  onSetLogged,
}: ExerciseCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(true);
  const expanded = controlledExpanded ?? internalExpanded;
  const toggleExpand = onToggleExpand ?? (() => setInternalExpanded((prev) => !prev));

  const [addDialogVisible, setAddDialogVisible] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const [micAllowed, setMicAllowed] = useState(false);
  const [phase, setPhase] = useState<CardPhase>('idle');
  const [stopwatchStartedAt, setStopwatchStartedAt] = useState<number | null>(null);
  const logs = useWorkoutStore((s) => s.exerciseLogs[exercise.name] ?? []);
  const prevLogsLength = useRef(logs.length);
  const initialLoadDone = useRef(false);
  const logSet = useWorkoutStore((s) => s.logSet);
  const fetchExerciseLogs = useWorkoutStore((s) => s.fetchExerciseLogs);

  const restSeconds = timerConfig?.restSeconds ?? 90;

  useEffect(() => {
    fetchExerciseLogs(sessionId, exercise.name);
  }, [sessionId, exercise.name, fetchExerciseLogs]);

  useEffect(() => {
    requestMicPermission().then(setMicAllowed);
  }, []);

  useEffect(() => {
    if (!initialLoadDone.current) {
      // First update after fetch — sync ref, don't trigger rest timer
      initialLoadDone.current = true;
      prevLogsLength.current = logs.length;
      return;
    }
    if (logs.length > prevLogsLength.current) {
      if (!suppressRest) {
        setStopwatchStartedAt(null);
        setPhase('resting');
      } else {
        setStopwatchStartedAt(null);
        setPhase('idle');
      }
      onSetLogged?.();
    }
    prevLogsLength.current = logs.length;
  }, [logs.length, suppressRest, onSetLogged]);

  const handleStartSet = useCallback(() => {
    hapticTick();
    setStopwatchStartedAt(Date.now());
    setPhase('setActive');
  }, []);

  const handleStartRest = useCallback(() => {
    setPhase('resting');
  }, []);

  const handleRestDone = useCallback(() => {
    setPhase('idle');
  }, []);

  const handleManualAdd = useCallback(
    (data: { weightKg?: number; reps?: number; distanceM?: number; durationSeconds?: number; rpe?: number }) => {
      logSet(sessionId, exercise.name, data);
    },
    [sessionId, exercise.name, logSet],
  );

  return (
    <Card style={styles.card}>
      <TouchableOpacity
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text variant="titleSmall" style={styles.name}>
              {exercise.name}
            </Text>
            {exercise.youtubeUrl && (
              <TouchableOpacity
                onPress={() => Linking.openURL(exercise.youtubeUrl!)}
                hitSlop={8}
              >
                <MaterialCommunityIcons name="youtube" size={20} color={colors.destructive} />
              </TouchableOpacity>
            )}
          </View>
          <Text variant="labelSmall" style={styles.target}>
            {exercise.sets} x {exercise.reps}
          </Text>
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textMuted}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <CardContent>
          <SetLogger
            exerciseName={exercise.name}
            sessionId={sessionId}
            logs={logs}
            exerciseType={exercise.exerciseType}
          />

          {/* Stopwatch when set is active */}
          {phase === 'setActive' && (
            <SetStopwatch
              isRunning
              startedAt={stopwatchStartedAt}
              size="compact"
            />
          )}

          {/* Rest timer */}
          {phase === 'resting' && (
            <RestTimer
              durationSeconds={restSeconds}
              onDismiss={handleRestDone}
              onComplete={handleRestDone}
            />
          )}

          {/* Buttons — hidden during resting phase */}
          {phase !== 'resting' && (
            <View style={styles.inputRow}>
              {micAllowed && (
                <VoiceButton
                  exerciseName={exercise.name}
                  sessionId={sessionId}
                  onClarification={setSnackMessage}
                />
              )}
              {phase === 'idle' && (
                <Button
                  variant="secondary"
                  size="small"
                  icon="play"
                  onPress={handleStartSet}
                >
                  Start Set
                </Button>
              )}
              <Button
                variant="secondary"
                size="small"
                icon="plus"
                onPress={() => setAddDialogVisible(true)}
              >
                Add Set
              </Button>
              {phase === 'idle' && !suppressRest && (
                <Button
                  variant="ghost"
                  size="small"
                  icon="timer-outline"
                  onPress={handleStartRest}
                >
                  Rest
                </Button>
              )}
            </View>
          )}

          <ManualSetDialog
            visible={addDialogVisible}
            onDismiss={() => setAddDialogVisible(false)}
            onSubmit={handleManualAdd}
            exerciseType={exercise.exerciseType}
          />
        </CardContent>
      )}

      <Snackbar
        visible={!!snackMessage}
        onDismiss={() => setSnackMessage('')}
        duration={6000}
        style={styles.snackbar}
      >
        <Text style={styles.snackbarText}>{snackMessage}</Text>
      </Snackbar>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  header: {
    padding: spacing.base,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    color: colors.textPrimary,
    flex: 1,
  },
  target: {
    color: colors.textMuted,
  },
  inputRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: spacing.base,
    gap: spacing.base,
  },
  snackbar: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  snackbarText: {
    color: colors.textPrimary,
    fontSize: 14,
  },
});
