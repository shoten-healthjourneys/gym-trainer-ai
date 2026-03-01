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
import type { ExerciseInSession, TimerConfig } from '../../types';

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
  const [restActive, setRestActive] = useState(false);
  const logs = useWorkoutStore((s) => s.exerciseLogs[exercise.name] ?? []);
  const prevLogsLength = useRef(logs.length);
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
    if (logs.length > prevLogsLength.current) {
      if (!suppressRest) setRestActive(true);
      onSetLogged?.();
    }
    prevLogsLength.current = logs.length;
  }, [logs.length, suppressRest, onSetLogged]);

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
          {restActive && (
            <RestTimer
              durationSeconds={restSeconds}
              onDismiss={() => setRestActive(false)}
              onComplete={() => setRestActive(false)}
            />
          )}
          <View style={styles.inputRow}>
            {micAllowed && (
              <VoiceButton
                exerciseName={exercise.name}
                sessionId={sessionId}
                onClarification={setSnackMessage}
              />
            )}
            <Button
              variant="secondary"
              size="small"
              icon="plus"
              onPress={() => setAddDialogVisible(true)}
            >
              Add Set
            </Button>
          </View>
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
