import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useKeepAwake } from 'expo-keep-awake';
import { colors, spacing } from '../../theme';

interface RestTimerProps {
  durationSeconds: number;
  onDismiss: () => void;
  onComplete: () => void;
  isWarmup?: boolean;
  warmupRestSeconds?: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Play a short programmatic beep via expo-av */
async function playCompletionBeep(): Promise<void> {
  try {
    // Use a simple Audio API beep via a generated silent sound + notification haptic
    // expo-av doesn't support tone generation directly, so we use haptics as primary
    // and attempt a system notification sound
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  } catch {
    // Audio/haptics may not be available on all platforms
  }
}

/** Schedule a local notification for when the timer ends */
async function scheduleTimerNotification(seconds: number): Promise<string | null> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') return null;
    }
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Rest Complete',
        body: 'Time to start your next set!',
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false },
    });
    return id;
  } catch {
    return null;
  }
}

async function cancelNotification(id: string | null): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already fired or cancelled
  }
}

export function RestTimer({
  durationSeconds,
  onDismiss,
  onComplete,
  isWarmup,
  warmupRestSeconds,
}: RestTimerProps) {
  const effectiveDuration = isWarmup && warmupRestSeconds ? warmupRestSeconds : durationSeconds;
  const [totalDuration, setTotalDuration] = useState(effectiveDuration);
  const [remaining, setRemaining] = useState(effectiveDuration);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const notifIdRef = useRef<string | null>(null);
  const hasCompletedRef = useRef(false);

  // Keep screen awake while timer is active
  useKeepAwake();

  // Schedule background notification on mount
  useEffect(() => {
    scheduleTimerNotification(effectiveDuration).then((id) => {
      notifIdRef.current = id;
    });
    return () => {
      cancelNotification(notifIdRef.current);
    };
  }, [effectiveDuration]);

  // Core countdown
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true;
            playCompletionBeep();
            onComplete();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current !== undefined) clearInterval(intervalRef.current);
    };
  }, [onComplete]);

  const handleDismiss = useCallback(() => {
    cancelNotification(notifIdRef.current);
    onDismiss();
  }, [onDismiss]);

  const adjustTime = useCallback(
    (delta: number) => {
      setRemaining((prev) => {
        const next = Math.max(0, prev + delta);
        return next;
      });
      setTotalDuration((prev) => Math.max(1, prev + delta));

      // Reschedule notification with new remaining time
      cancelNotification(notifIdRef.current);
      setRemaining((prev) => {
        if (prev > 0) {
          scheduleTimerNotification(prev).then((id) => {
            notifIdRef.current = id;
          });
        }
        return prev;
      });
    },
    [],
  );

  const progress = totalDuration > 0 ? remaining / totalDuration : 0;

  return (
    <View style={[styles.container, isWarmup && styles.warmupContainer]}>
      <View style={styles.progressBackground}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress * 100}%` },
            isWarmup && styles.warmupFill,
          ]}
        />
      </View>
      <View style={styles.contentRow}>
        <TouchableOpacity
          style={styles.adjustButton}
          onPress={() => adjustTime(-15)}
          hitSlop={8}
        >
          <Text variant="labelSmall" style={styles.adjustText}>-15s</Text>
        </TouchableOpacity>

        <View style={styles.centerContent}>
          <Text variant="titleMedium" style={[styles.timerText, isWarmup && styles.warmupTimerText]}>
            {formatTime(remaining)}
          </Text>
          {isWarmup && (
            <Text variant="labelSmall" style={styles.warmupLabel}>
              Warm-up Rest
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.adjustButton}
          onPress={() => adjustTime(15)}
          hitSlop={8}
        >
          <Text variant="labelSmall" style={styles.adjustText}>+15s</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleDismiss} hitSlop={8}>
          <Text variant="labelSmall" style={styles.dismissText}>
            Skip
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
  },
  warmupContainer: {
    borderWidth: 1,
    borderColor: colors.accentSecondaryMuted,
  },
  progressBackground: {
    height: 4,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  warmupFill: {
    backgroundColor: colors.accentSecondary,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
  },
  timerText: {
    color: colors.accent,
    fontVariant: ['tabular-nums'],
  },
  warmupTimerText: {
    color: colors.accentSecondary,
  },
  warmupLabel: {
    color: colors.accentSecondary,
    marginTop: 2,
  },
  adjustButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  adjustText: {
    color: colors.textPrimary,
  },
  dismissText: {
    color: colors.textMuted,
  },
});
