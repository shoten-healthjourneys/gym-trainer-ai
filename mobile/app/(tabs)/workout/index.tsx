import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { isToday, parseISO } from 'date-fns';
import { ScreenContainer, Card, CardContent, Button } from '../../../components/ui';
import { useWorkoutStore } from '../../../stores/workoutStore';
import { colors, spacing } from '../../../theme';

export default function WorkoutIndexScreen() {
  const router = useRouter();
  const sessions = useWorkoutStore((s) => s.sessions);
  const activeSession = useWorkoutStore((s) => s.activeSession);
  const fetchWeekSessions = useWorkoutStore((s) => s.fetchWeekSessions);
  const currentWeekStart = useWorkoutStore((s) => s.currentWeekStart);

  useEffect(() => {
    fetchWeekSessions(currentWeekStart);
  }, [currentWeekStart, fetchWeekSessions]);

  // Find active or today's sessions
  const todaySessions = sessions.filter((s) => {
    try {
      return isToday(parseISO(s.scheduledDate));
    } catch {
      return false;
    }
  });

  if (activeSession) {
    return (
      <ScreenContainer title="Workout">
        <Card>
          <CardContent>
            <Text variant="titleSmall" style={styles.heading}>
              Workout In Progress
            </Text>
            <Text variant="bodyMedium" style={styles.sessionTitle}>
              {activeSession.title}
            </Text>
            <Button
              style={styles.resumeBtn}
              onPress={() => router.push(`/workout/${activeSession.id}`)}
            >
              Resume Workout
            </Button>
          </CardContent>
        </Card>
      </ScreenContainer>
    );
  }

  const scheduledToday = todaySessions.filter((s) => s.status === 'scheduled');

  return (
    <ScreenContainer title="Workout">
      {scheduledToday.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="arm-flex-outline"
            size={48}
            color={colors.textMuted}
          />
          <Text variant="bodyMedium" style={styles.emptyText}>
            No workouts scheduled for today
          </Text>
        </View>
      ) : (
        scheduledToday.map((session) => (
          <Card key={session.id} style={styles.card}>
            <CardContent>
              <Text variant="titleSmall" style={styles.heading}>
                {session.title}
              </Text>
              <Text variant="bodySmall" style={styles.muted}>
                {session.exerciseGroups.flatMap((g) => g.exercises).length} exercises
              </Text>
              <Button
                style={styles.resumeBtn}
                onPress={() => router.push(`/workout/${session.id}`)}
              >
                Start Workout
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.textPrimary,
  },
  sessionTitle: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  resumeBtn: {
    marginTop: spacing.base,
  },
  card: {
    marginBottom: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  muted: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
