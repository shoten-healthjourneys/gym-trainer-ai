import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, spacing } from '../../theme';

interface RestTimerProps {
  durationSeconds: number;
  onDismiss: () => void;
  onComplete: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function RestTimer({ durationSeconds, onDismiss, onComplete }: RestTimerProps) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current !== undefined) clearInterval(intervalRef.current);
    };
  }, [onComplete]);

  const progress = remaining / durationSeconds;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onDismiss}
      activeOpacity={0.8}
    >
      <View style={styles.progressBackground}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.textRow}>
        <Text variant="titleMedium" style={styles.timerText}>
          {formatTime(remaining)}
        </Text>
        <Text variant="labelSmall" style={styles.dismissText}>
          Tap to dismiss
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
  },
  progressBackground: {
    height: 4,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  timerText: {
    color: colors.accent,
    fontVariant: ['tabular-nums'],
  },
  dismissText: {
    color: colors.textMuted,
  },
});
