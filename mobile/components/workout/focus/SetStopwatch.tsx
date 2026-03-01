import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, spacing } from '../../../theme';
import { formatTime } from './focusUtils';

interface SetStopwatchProps {
  isRunning: boolean;
  startedAt: number | null;
  onElapsed?: (seconds: number) => void;
}

export function SetStopwatch({ isRunning, startedAt, onElapsed }: SetStopwatchProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const onElapsedRef = useRef(onElapsed);

  // Keep callback ref up to date without re-running the interval effect
  useEffect(() => {
    onElapsedRef.current = onElapsed;
  }, [onElapsed]);

  useEffect(() => {
    if (isRunning && startedAt != null) {
      // Synchronise immediately
      const initialElapsed = Math.floor((Date.now() - startedAt) / 1000);
      setElapsed(initialElapsed);

      intervalRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startedAt) / 1000);
        setElapsed(secs);
        onElapsedRef.current?.(secs);
      }, 1000);
    } else {
      setElapsed(0);
    }

    return () => {
      if (intervalRef.current !== undefined) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    };
  }, [isRunning, startedAt]);

  const display = isRunning && startedAt != null ? formatTime(elapsed) : '0:00';

  return (
    <View style={styles.container}>
      <Text style={styles.time}>{display}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  time: {
    fontSize: 64,
    fontVariant: ['tabular-nums'],
    color: colors.accent,
    fontWeight: '300',
  },
});
