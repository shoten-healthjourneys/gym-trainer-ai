import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useKeepAwake } from 'expo-keep-awake';
import { Button, TextInput } from '../../ui';
import { colors, spacing, radii } from '../../../theme';
import { useWorkoutStore } from '../../../stores/workoutStore';
import type { ExerciseGroup } from '../../../types';
import { formatTime, hapticTick, hapticWarning, hapticSuccess } from './focusUtils';

interface FocusModeAmrapProps {
  group: ExerciseGroup;
  sessionId: string;
  onComplete: () => void;
}

interface AmrapLog {
  roundNumber: number;
  exerciseIndex: number;
  exerciseName: string;
  weightKg?: number;
  reps?: number;
  logged: boolean;
}

type Phase = 'prep' | 'work' | 'complete';

export function FocusModeAmrap({ group, sessionId, onComplete }: FocusModeAmrapProps) {
  const { timerConfig, exercises } = group;
  const timeLimitSeconds = timerConfig.timeLimitSeconds ?? 600;
  const prepSeconds = timerConfig.prepCountdownSeconds ?? 5;
  const exerciseNames = exercises.map((e) => e.name);
  const totalExercises = exercises.length;

  const [phase, setPhase] = useState<Phase>('prep');
  const [prepRemaining, setPrepRemaining] = useState(prepSeconds);
  const [timeRemaining, setTimeRemaining] = useState(timeLimitSeconds);
  const [isPaused, setIsPaused] = useState(false);

  // Current position in the circuit
  const [currentRound, setCurrentRound] = useState(1);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);

  // Log tracking
  const [logs, setLogs] = useState<AmrapLog[]>([]);

  // Quick-log inputs
  const [weightInput, setWeightInput] = useState('');
  const [repsInput, setRepsInput] = useState('');

  const logSet = useWorkoutStore((s) => s.logSet);
  const tickRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useKeepAwake();

  // Prep countdown
  useEffect(() => {
    if (phase !== 'prep' || isPaused) return;
    tickRef.current = setInterval(() => {
      setPrepRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(tickRef.current);
          setPhase('work');
          hapticWarning();
          return 0;
        }
        if (prev <= 4) hapticTick();
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [phase, isPaused]);

  // Work countdown
  useEffect(() => {
    if (phase !== 'work' || isPaused) return;
    tickRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(tickRef.current);
          setPhase('complete');
          hapticSuccess();
          return 0;
        }
        if (prev <= 4) hapticTick();
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [phase, isPaused]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const handleQuickLog = useCallback(() => {
    const w = parseFloat(weightInput);
    const r = parseInt(repsInput, 10);
    if (isNaN(r)) return;

    const newLog: AmrapLog = {
      roundNumber: currentRound,
      exerciseIndex: currentExerciseIndex,
      exerciseName: exerciseNames[currentExerciseIndex] ?? 'Exercise',
      weightKg: isNaN(w) ? undefined : w,
      reps: r,
      logged: true,
    };

    setLogs((prev) => [...prev, newLog]);

    // Auto-advance to next exercise
    if (currentExerciseIndex < totalExercises - 1) {
      setCurrentExerciseIndex((prev) => prev + 1);
    } else {
      // Last exercise in round -> next round, first exercise
      setCurrentRound((prev) => prev + 1);
      setCurrentExerciseIndex(0);
      hapticWarning();
    }

    // Reset inputs
    setWeightInput('');
    setRepsInput('');
  }, [weightInput, repsInput, currentRound, currentExerciseIndex, exerciseNames, totalExercises]);

  const handleEndEarly = useCallback(() => {
    const doEnd = () => {
      if (tickRef.current) clearInterval(tickRef.current);
      setPhase('complete');
    };
    if (Platform.OS === 'web') {
      if (window.confirm('End AMRAP early?')) doEnd();
    } else {
      Alert.alert('End Early', 'End AMRAP early?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End', style: 'destructive', onPress: doEnd },
      ]);
    }
  }, []);

  const handleFinish = useCallback(async () => {
    for (const log of logs) {
      if (log.logged && log.reps != null) {
        await logSet(sessionId, log.exerciseName, {
          weightKg: log.weightKg,
          reps: log.reps,
          roundNumber: log.roundNumber,
        });
      }
    }
    onComplete();
  }, [logs, logSet, sessionId, onComplete]);

  // Compute summary stats
  const computeSummary = useCallback(() => {
    const loggedEntries = logs.filter((l) => l.logged);
    if (loggedEntries.length === 0) return { fullRounds: 0, extraReps: 0, totalVolume: 0 };

    const maxRound = Math.max(...loggedEntries.map((l) => l.roundNumber));
    // Count how many exercises were logged in the last round
    const lastRoundLogs = loggedEntries.filter((l) => l.roundNumber === maxRound);
    const lastRoundComplete = lastRoundLogs.length >= totalExercises;

    const fullRounds = lastRoundComplete ? maxRound : maxRound - 1;
    const extraReps = lastRoundComplete
      ? 0
      : lastRoundLogs.reduce((sum, l) => sum + (l.reps ?? 0), 0);

    const totalVolume = loggedEntries.reduce(
      (sum, l) => sum + (l.weightKg ?? 0) * (l.reps ?? 0),
      0,
    );

    return { fullRounds, extraReps, totalVolume };
  }, [logs, totalExercises]);

  const elapsed = timeLimitSeconds - timeRemaining;
  const progress = timeLimitSeconds > 0 ? elapsed / timeLimitSeconds : 0;

  // Check if current exercise in current round is already logged
  const isCurrentLogged = logs.some(
    (l) => l.roundNumber === currentRound && l.exerciseIndex === currentExerciseIndex && l.logged,
  );

  // Complete screen
  if (phase === 'complete') {
    const { fullRounds, extraReps, totalVolume } = computeSummary();
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="titleLarge" style={styles.completeTitle}>
          AMRAP Complete
        </Text>
        <Text variant="bodyMedium" style={styles.summaryText}>
          {fullRounds} rounds{extraReps > 0 ? ` + ${extraReps} extra reps` : ''}
        </Text>
        <Text variant="bodySmall" style={styles.volumeText}>
          Total volume: {totalVolume.toLocaleString()}kg
        </Text>
        <View style={styles.roundSummary}>
          {logs
            .filter((l) => l.logged)
            .map((l, i) => (
              <Text key={i} variant="bodySmall" style={styles.roundLine}>
                R{l.roundNumber} - {l.exerciseName}: {l.weightKg ?? '-'}kg x {l.reps ?? '-'}
              </Text>
            ))}
        </View>
        <Button onPress={handleFinish} style={styles.finishButton}>
          Save & Close
        </Button>
      </ScrollView>
    );
  }

  // Prep screen
  if (phase === 'prep') {
    return (
      <View style={styles.container}>
        <Text variant="bodyMedium" style={styles.phaseLabel}>
          GET READY
        </Text>
        <Text variant="headlineLarge" style={styles.countdown}>
          {prepRemaining}
        </Text>
        <View style={styles.exerciseList}>
          {exerciseNames.map((name, i) => (
            <Text
              key={i}
              variant="bodyMedium"
              style={[styles.exerciseLabel, i === 0 && styles.exerciseLabelActive]}
            >
              {name}
            </Text>
          ))}
        </View>
        <Text variant="labelSmall" style={styles.configLabel}>
          {formatTime(timeLimitSeconds)} time cap
        </Text>
      </View>
    );
  }

  // Work phase
  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressBackground}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Large countdown */}
      <Text variant="headlineLarge" style={styles.countdown}>
        {formatTime(timeRemaining)}
      </Text>

      {/* Exercise list with current highlighted */}
      <View style={styles.exerciseList}>
        {exerciseNames.map((name, i) => (
          <Text
            key={i}
            variant="bodyMedium"
            style={[
              styles.exerciseLabel,
              i === currentExerciseIndex && styles.exerciseLabelActive,
            ]}
          >
            {name}
          </Text>
        ))}
      </View>

      {/* Round and rep counter */}
      <Text variant="titleSmall" style={styles.roundLabel}>
        Round {currentRound} {'\u2022'} Exercise {currentExerciseIndex + 1} of {totalExercises}
      </Text>

      {/* Elapsed time */}
      <Text variant="labelSmall" style={styles.elapsedLabel}>
        Elapsed: {formatTime(elapsed)}
      </Text>

      {/* Quick-log area */}
      <View style={styles.quickLogArea}>
        {isCurrentLogged ? (
          <Text variant="bodySmall" style={styles.loggedText}>
            Logged {exerciseNames[currentExerciseIndex]}
          </Text>
        ) : (
          <View style={styles.quickLogInputs}>
            <TextInput
              label="kg"
              value={weightInput}
              onChangeText={setWeightInput}
              keyboardType="decimal-pad"
              style={styles.quickInput}
            />
            <TextInput
              label="reps"
              value={repsInput}
              onChangeText={setRepsInput}
              keyboardType="number-pad"
              style={styles.quickInput}
            />
            <Button size="small" onPress={handleQuickLog}>
              Log
            </Button>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Button
          variant="secondary"
          onPress={togglePause}
          icon={isPaused ? 'play' : 'pause'}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </Button>
        <Button variant="ghost" onPress={handleEndEarly}>
          End Early
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  progressBackground: {
    height: 4,
    width: '100%',
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  phaseLabel: {
    color: colors.accentSecondary,
    fontWeight: '700',
    letterSpacing: 2,
  },
  roundLabel: {
    color: colors.accent,
  },
  countdown: {
    color: colors.textPrimary,
    fontSize: 64,
    fontVariant: ['tabular-nums'],
    lineHeight: 72,
  },
  exerciseList: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.xs,
  },
  exerciseLabel: {
    color: colors.textMuted,
  },
  exerciseLabelActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  configLabel: {
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  elapsedLabel: {
    color: colors.textMuted,
  },
  quickLogArea: {
    width: '100%',
    paddingVertical: spacing.sm,
  },
  quickLogInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quickInput: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  loggedText: {
    color: colors.accent,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  completeTitle: {
    color: colors.accent,
    fontWeight: '700',
  },
  summaryText: {
    color: colors.textSecondary,
  },
  volumeText: {
    color: colors.textMuted,
  },
  roundSummary: {
    width: '100%',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  roundLine: {
    color: colors.textPrimary,
  },
  finishButton: {
    marginTop: spacing.md,
  },
});
