import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useKeepAwake } from 'expo-keep-awake';
import { Button, TextInput } from '../../ui';
import { colors, spacing, radii } from '../../../theme';
import { useWorkoutStore } from '../../../stores/workoutStore';
import type { ExerciseGroup } from '../../../types';
import { formatTime, hapticTick, hapticWarning, hapticSuccess } from './focusUtils';

interface FocusModeCircuitProps {
  group: ExerciseGroup;
  sessionId: string;
  onComplete: () => void;
}

interface CircuitLog {
  roundNumber: number;
  exerciseIndex: number;
  exerciseName: string;
  weightKg?: number;
  reps?: number;
  logged: boolean;
}

type Phase = 'prep' | 'work' | 'circuitRest' | 'roundRest' | 'complete';

export function FocusModeCircuit({ group, sessionId, onComplete }: FocusModeCircuitProps) {
  const { timerConfig, exercises } = group;
  const workSeconds = timerConfig.workSeconds ?? 40;
  const circuitRestSeconds = timerConfig.circuitRestSeconds ?? 15;
  const roundRestSeconds = timerConfig.roundRestSeconds ?? 60;
  const totalRounds = timerConfig.rounds ?? 3;
  const prepSeconds = timerConfig.prepCountdownSeconds ?? 5;
  const exerciseNames = exercises.map((e) => e.name);
  const totalExercises = exercises.length;

  const [phase, setPhase] = useState<Phase>('prep');
  const [prepRemaining, setPrepRemaining] = useState(prepSeconds);
  const [timeRemaining, setTimeRemaining] = useState(workSeconds);
  const [isPaused, setIsPaused] = useState(false);

  // Current position
  const [currentRound, setCurrentRound] = useState(1);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);

  // Log tracking
  const [logs, setLogs] = useState<CircuitLog[]>([]);

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
          setTimeRemaining(workSeconds);
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
  }, [phase, isPaused, workSeconds]);

  // Advance logic after a timer expires
  const advanceFromWork = useCallback(() => {
    const isLastExercise = currentExerciseIndex >= totalExercises - 1;
    const isLastRound = currentRound >= totalRounds;

    if (isLastExercise && isLastRound) {
      // All done
      setPhase('complete');
      hapticSuccess();
    } else if (isLastExercise) {
      // Last exercise in round -> round rest
      setPhase('roundRest');
      setTimeRemaining(roundRestSeconds);
      hapticWarning();
    } else {
      // More exercises in this round -> circuit rest
      setPhase('circuitRest');
      setTimeRemaining(circuitRestSeconds);
      hapticWarning();
    }
  }, [currentExerciseIndex, currentRound, totalExercises, totalRounds, circuitRestSeconds, roundRestSeconds]);

  const advanceFromCircuitRest = useCallback(() => {
    // Move to next exercise in same round
    setCurrentExerciseIndex((prev) => prev + 1);
    setPhase('work');
    setTimeRemaining(workSeconds);
    hapticWarning();
  }, [workSeconds]);

  const advanceFromRoundRest = useCallback(() => {
    // Move to next round, first exercise
    setCurrentRound((prev) => prev + 1);
    setCurrentExerciseIndex(0);
    setPhase('work');
    setTimeRemaining(workSeconds);
    hapticWarning();
  }, [workSeconds]);

  // Work timer
  useEffect(() => {
    if (phase !== 'work' || isPaused) return;
    tickRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(tickRef.current);
          advanceFromWork();
          return 0;
        }
        if (prev <= 4) hapticTick();
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [phase, isPaused, advanceFromWork]);

  // Circuit rest timer
  useEffect(() => {
    if (phase !== 'circuitRest' || isPaused) return;
    tickRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(tickRef.current);
          advanceFromCircuitRest();
          return 0;
        }
        if (prev <= 4) hapticTick();
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [phase, isPaused, advanceFromCircuitRest]);

  // Round rest timer
  useEffect(() => {
    if (phase !== 'roundRest' || isPaused) return;
    tickRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(tickRef.current);
          advanceFromRoundRest();
          return 0;
        }
        if (prev <= 4) hapticTick();
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [phase, isPaused, advanceFromRoundRest]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const handleQuickLog = useCallback(() => {
    const w = parseFloat(weightInput);
    const r = parseInt(repsInput, 10);
    if (isNaN(r)) return;

    const newLog: CircuitLog = {
      roundNumber: currentRound,
      exerciseIndex: currentExerciseIndex,
      exerciseName: exerciseNames[currentExerciseIndex] ?? 'Exercise',
      weightKg: isNaN(w) ? undefined : w,
      reps: r,
      logged: true,
    };

    setLogs((prev) => [...prev, newLog]);
    setWeightInput('');
    setRepsInput('');
  }, [weightInput, repsInput, currentRound, currentExerciseIndex, exerciseNames]);

  const handleEndEarly = useCallback(() => {
    const doEnd = () => {
      if (tickRef.current) clearInterval(tickRef.current);
      setPhase('complete');
    };
    if (Platform.OS === 'web') {
      if (window.confirm('End circuit early?')) doEnd();
    } else {
      Alert.alert('End Early', 'End circuit early?', [
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

  // Check if current exercise in current round is already logged
  const isCurrentLogged = logs.some(
    (l) =>
      l.roundNumber === currentRound &&
      l.exerciseIndex === currentExerciseIndex &&
      l.logged,
  );

  // Summary stats for complete screen
  const loggedCount = logs.filter((l) => l.logged).length;
  const roundsCompleted =
    phase === 'complete' && currentExerciseIndex >= totalExercises - 1 && currentRound >= totalRounds
      ? totalRounds
      : currentRound - (currentExerciseIndex === 0 && phase === 'complete' ? 1 : 0);

  // Next exercise name (for rest phases)
  const nextExerciseIndex = currentExerciseIndex + 1;
  const nextExerciseName =
    nextExerciseIndex < totalExercises
      ? exerciseNames[nextExerciseIndex]
      : exerciseNames[0];

  // Complete screen
  if (phase === 'complete') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="titleLarge" style={styles.completeTitle}>
          Circuit Complete
        </Text>
        <Text variant="bodyMedium" style={styles.summaryText}>
          {roundsCompleted} of {totalRounds} rounds completed
        </Text>
        <Text variant="bodySmall" style={styles.summaryText}>
          {loggedCount} exercises logged
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
            <Text key={i} variant="bodyMedium" style={styles.exerciseLabelMuted}>
              {name}
            </Text>
          ))}
        </View>
        <Text variant="labelSmall" style={styles.configLabel}>
          {totalRounds} rounds {'\u2022'} {workSeconds}s work {'\u2022'} {circuitRestSeconds}s rest
        </Text>
      </View>
    );
  }

  // Circuit rest screen
  if (phase === 'circuitRest') {
    return (
      <View style={styles.container}>
        <Text variant="bodyMedium" style={styles.restLabel}>
          REST
        </Text>
        <Text variant="headlineLarge" style={styles.countdown}>
          {formatTime(timeRemaining)}
        </Text>
        <Text variant="bodyMedium" style={styles.nextExerciseLabel}>
          Next: {nextExerciseName}
        </Text>

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

  // Round rest screen
  if (phase === 'roundRest') {
    return (
      <View style={styles.container}>
        <Text variant="bodyMedium" style={styles.roundRestLabel}>
          ROUND REST
        </Text>
        <Text variant="headlineLarge" style={styles.countdown}>
          {formatTime(timeRemaining)}
        </Text>
        <Text variant="bodyMedium" style={styles.summaryText}>
          Round {currentRound} complete
        </Text>

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

  // Work phase
  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressBackground}>
        <View
          style={[
            styles.progressFill,
            { width: `${((workSeconds - timeRemaining) / workSeconds) * 100}%` },
          ]}
        />
      </View>

      {/* Exercise position */}
      <Text variant="labelSmall" style={styles.positionLabel}>
        Exercise {currentExerciseIndex + 1} of {totalExercises} {'\u2022'} Round {currentRound} of{' '}
        {totalRounds}
      </Text>

      {/* Large countdown */}
      <Text variant="headlineLarge" style={styles.countdown}>
        {formatTime(timeRemaining)}
      </Text>

      {/* Current exercise name */}
      <Text variant="titleMedium" style={styles.currentExercise}>
        {exerciseNames[currentExerciseIndex]}
      </Text>

      {/* Quick-log area */}
      <View style={styles.quickLogArea}>
        {isCurrentLogged ? (
          <Text variant="bodySmall" style={styles.loggedText}>
            Logged: {logs.find(
              (l) =>
                l.roundNumber === currentRound &&
                l.exerciseIndex === currentExerciseIndex &&
                l.logged,
            )?.weightKg ?? '-'}kg x{' '}
            {logs.find(
              (l) =>
                l.roundNumber === currentRound &&
                l.exerciseIndex === currentExerciseIndex &&
                l.logged,
            )?.reps ?? '-'}
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
  restLabel: {
    color: colors.accentSecondary,
    fontWeight: '700',
    letterSpacing: 2,
    fontSize: 18,
  },
  roundRestLabel: {
    color: colors.accentSecondary,
    fontWeight: '700',
    letterSpacing: 2,
    fontSize: 18,
  },
  positionLabel: {
    color: colors.accent,
  },
  countdown: {
    color: colors.textPrimary,
    fontSize: 64,
    fontVariant: ['tabular-nums'],
    lineHeight: 72,
  },
  currentExercise: {
    color: colors.accent,
    fontWeight: '700',
  },
  exerciseList: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.xs,
  },
  exerciseLabelMuted: {
    color: colors.textMuted,
  },
  nextExerciseLabel: {
    color: colors.textSecondary,
  },
  configLabel: {
    color: colors.textMuted,
    marginTop: spacing.sm,
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
