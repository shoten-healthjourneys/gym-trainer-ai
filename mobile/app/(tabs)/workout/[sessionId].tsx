import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Platform, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenContainer, Button } from '../../../components/ui';
import { ExerciseGroupCard, FocusMode } from '../../../components/workout';
import { useWorkoutStore } from '../../../stores/workoutStore';
import { get } from '../../../services/api';
import { colors, spacing } from '../../../theme';
import type { ExerciseGroup, WorkoutSession } from '../../../types';

export default function ActiveWorkoutScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const activeSession = useWorkoutStore((s) => s.activeSession);
  const sessions = useWorkoutStore((s) => s.sessions);
  const exerciseLogs = useWorkoutStore((s) => s.exerciseLogs);
  const startSession = useWorkoutStore((s) => s.startSession);
  const completeSession = useWorkoutStore((s) => s.completeSession);
  const setActiveSession = useWorkoutStore((s) => s.setActiveSession);
  const loading = useWorkoutStore((s) => s.loading);

  const [elapsed, setElapsed] = useState('00:00');
  const [focusGroupIndex, setFocusGroupIndex] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Set active session from sessions list or fetch from API if not in store
  useEffect(() => {
    if (!activeSession && sessionId) {
      const session = sessions.find((s) => s.id === sessionId);
      if (session) {
        if (session.status === 'scheduled') startSession(sessionId);
        else if (session.status === 'in_progress') setActiveSession(session);
      } else {
        // Not in store — fetch from API
        get<WorkoutSession>(`/api/sessions/${encodeURIComponent(sessionId)}`)
          .then((fetched) => {
            if (fetched.status === 'scheduled') startSession(sessionId);
            else if (fetched.status === 'in_progress') setActiveSession(fetched);
          })
          .catch(() => {});
      }
    }
  }, [sessionId, activeSession, sessions, startSession, setActiveSession]);

  // Elapsed timer
  useEffect(() => {
    if (!activeSession?.startedAt) return;
    const startTime = new Date(activeSession.startedAt).getTime();

    const tick = () => {
      const diff = Math.floor((Date.now() - startTime) / 1000);
      const mins = Math.floor(diff / 60).toString().padStart(2, '0');
      const secs = (diff % 60).toString().padStart(2, '0');
      setElapsed(`${mins}:${secs}`);
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeSession?.startedAt]);

  const totalSetsLogged = Object.values(exerciseLogs).reduce(
    (sum, logs) => sum + logs.length,
    0,
  );

  const handleComplete = useCallback(async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to finish this workout?')) {
        if (sessionId) {
          await completeSession(sessionId);
          router.back();
        }
      }
    } else {
      Alert.alert(
        'Complete Workout',
        'Are you sure you want to finish this workout?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Complete',
            onPress: async () => {
              if (sessionId) {
                await completeSession(sessionId);
                router.back();
              }
            },
          },
        ],
      );
    }
  }, [sessionId, completeSession, router]);

  const handleStartFocus = useCallback((index: number) => {
    setFocusGroupIndex(index);
  }, []);

  const renderGroup = useCallback(
    ({ item, index }: { item: ExerciseGroup; index: number }) => (
      <ExerciseGroupCard
        group={item}
        sessionId={sessionId!}
        groupIndex={index}
        onStartFocus={handleStartFocus}
      />
    ),
    [sessionId, handleStartFocus],
  );

  if (!activeSession) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text variant="bodyMedium" style={styles.muted}>Loading workout...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false}>
      <View style={styles.topBar}>
        <View>
          <Text variant="titleMedium" style={styles.title}>
            {activeSession.title}
          </Text>
          <View style={styles.timerRow}>
            <MaterialCommunityIcons name="timer-outline" size={16} color={colors.accent} />
            <Text variant="bodySmall" style={styles.timer}>{elapsed}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={activeSession.exerciseGroups}
        keyExtractor={(item) => item.groupId}
        renderItem={renderGroup}
        contentContainerStyle={styles.list}
      />

      <View style={styles.bottomBar}>
        <Button
          onPress={handleComplete}
          disabled={totalSetsLogged === 0 || loading}
        >
          Complete Workout
        </Button>
      </View>

      <FocusMode
        visible={focusGroupIndex !== null}
        sessionId={sessionId!}
        exerciseGroups={activeSession.exerciseGroups}
        initialGroupIndex={focusGroupIndex ?? 0}
        onClose={() => setFocusGroupIndex(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    padding: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.textPrimary,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  timer: {
    color: colors.accent,
  },
  list: {
    padding: spacing.base,
  },
  bottomBar: {
    padding: spacing.base,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: {
    color: colors.textMuted,
  },
});
