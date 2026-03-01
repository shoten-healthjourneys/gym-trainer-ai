import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useKeepAwake } from 'expo-keep-awake';
import { Button, TextInput } from '../../ui';
import { colors, spacing, radii } from '../../../theme';
import { useWorkoutStore } from '../../../stores/workoutStore';
import type { ExerciseGroup } from '../../../types';
import { formatTime, hapticTick, hapticWarning, hapticSuccess } from './focusUtils';

interface FocusModeEmomProps {
  group: ExerciseGroup;
  sessionId: string;
  onComplete: () => void;
}

interface RoundLog {
  roundNumber: number;
  weightKg?: number;
  reps?: number;
  logged: boolean;
}

type Phase = 'prep' | 'work' | 'complete';

export function FocusModeEmom({ group, sessionId, onComplete }: FocusModeEmomProps) {
  const { timerConfig } = group;
  const intervalSeconds = timerConfig.intervalSeconds ?? 60;
  const totalRounds = timerConfig.totalRounds ?? 10;
  const prepSeconds = timerConfig.prepCountdownSeconds ?? 5;
  const exerciseName = group.exercises[0]?.name ?? 'Exercise';

  const [phase, setPhase] = useState<Phase>('prep');
  const [prepRemaining, setPrepRemaining] = useState(prepSeconds);
  const [currentRound, setCurrentRound] = useState(1);
  const [intervalRemaining, setIntervalRemaining] = useState(intervalSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [roundLogs, setRoundLogs] = useState<RoundLog[]>(
    Array.from({ length: totalRounds }, (_, i) => ({
      roundNumber: i + 1,
      logged: false,
    })),
  );

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

  // Work countdown (interval timer)
  useEffect(() => {
    if (phase !== 'work' || isPaused) return;
    tickRef.current = setInterval(() => {
      setIntervalRemaining((prev) => {
        if (prev <= 1) {
          // End of this interval
          setCurrentRound((r) => {
            const next = r + 1;
            if (next > totalRounds) {
              clearInterval(tickRef.current);
              setPhase('complete');
              hapticSuccess();
              return r;
            }
            hapticWarning();
            return next;
          });
          return intervalSeconds;
        }
        if (prev <= 4) hapticTick();
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [phase, isPaused, intervalSeconds, totalRounds]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const handleQuickLog = useCallback(() => {
    const w = parseFloat(weightInput);
    const r = parseInt(repsInput, 10);
    if (isNaN(r)) return;

    const roundIndex = currentRound - 1;
    setRoundLogs((prev) => {
      const next = [...prev];
      next[roundIndex] = {
        ...next[roundIndex]!,
        weightKg: isNaN(w) ? undefined : w,
        reps: r,
        logged: true,
      };
      return next;
    });
  }, [weightInput, repsInput, currentRound]);

  const handleEndEarly = useCallback(() => {
    const doEnd = () => {
      if (tickRef.current) clearInterval(tickRef.current);
      setPhase('complete');
    };
    if (Platform.OS === 'web') {
      if (window.confirm('End EMOM early?')) doEnd();
    } else {
      Alert.alert('End Early', 'End EMOM early?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End', style: 'destructive', onPress: doEnd },
      ]);
    }
  }, []);

  const handleFinish = useCallback(async () => {
    for (const round of roundLogs) {
      if (round.logged && round.reps != null) {
        await logSet(sessionId, exerciseName, {
          weightKg: round.weightKg,
          reps: round.reps,
          roundNumber: round.roundNumber,
        });
      }
    }
    onComplete();
  }, [roundLogs, logSet, sessionId, exerciseName, onComplete]);

  const currentLog = roundLogs[currentRound - 1];
  const totalElapsed =
    phase === 'prep'
      ? 0
      : (currentRound - 1) * intervalSeconds + (intervalSeconds - intervalRemaining);
  const totalDuration = totalRounds * intervalSeconds;
  const progress = totalDuration > 0 ? totalElapsed / totalDuration : 0;

  // Complete screen
  if (phase === 'complete') {
    const loggedRounds = roundLogs.filter((r) => r.logged);
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="titleLarge" style={styles.completeTitle}>
          EMOM Complete
        </Text>
        <Text variant="bodyMedium" style={styles.summaryText}>
          {loggedRounds.length} of {totalRounds} rounds logged
        </Text>
        <View style={styles.roundSummary}>
          {loggedRounds.map((r) => (
            <Text key={r.roundNumber} variant="bodySmall" style={styles.roundLine}>
              Round {r.roundNumber}: {r.weightKg ?? '-'}kg x {r.reps ?? '-'}
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
        <Text variant="bodyMedium" style={styles.exerciseLabel}>
          {exerciseName}
        </Text>
        <Text variant="labelSmall" style={styles.configLabel}>
          {totalRounds} rounds x {formatTime(intervalSeconds)}
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

      {/* Round indicator */}
      <Text variant="titleSmall" style={styles.roundLabel}>
        Round {currentRound} / {totalRounds}
      </Text>

      {/* Large countdown */}
      <Text variant="headlineLarge" style={styles.countdown}>
        {formatTime(intervalRemaining)}
      </Text>

      {/* Exercise name */}
      <Text variant="bodyMedium" style={styles.exerciseLabel}>
        {exerciseName}
      </Text>

      {/* Total elapsed */}
      <Text variant="labelSmall" style={styles.elapsedLabel}>
        Elapsed: {formatTime(totalElapsed)}
      </Text>

      {/* Quick-log area */}
      <View style={styles.quickLogArea}>
        {currentLog?.logged ? (
          <Text variant="bodySmall" style={styles.loggedText}>
            Logged: {currentLog.weightKg ?? '-'}kg x {currentLog.reps ?? '-'}
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
  exerciseLabel: {
    color: colors.textSecondary,
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
