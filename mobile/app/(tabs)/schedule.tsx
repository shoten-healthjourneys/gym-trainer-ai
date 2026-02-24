import React, { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { ScreenContainer, Card, CardHeader, CardContent, Badge, Button } from '../../components/ui';
import { useWorkoutStore } from '../../stores/workoutStore';
import { colors, spacing, radii } from '../../theme';
import type { WorkoutSession, ExerciseInSession, SessionStatus } from '../../types';

const STATUS_VARIANT: Record<SessionStatus, 'accent' | 'muted' | 'success' | 'destructive'> = {
  scheduled: 'muted',
  in_progress: 'accent',
  completed: 'success',
  skipped: 'destructive',
};

const STATUS_LABEL: Record<SessionStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  skipped: 'Skipped',
};

function SessionCard({ session }: { session: WorkoutSession }) {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const dayLabel = format(parseISO(session.scheduledDate), 'EEEE');
  const isScheduled = session.status === 'scheduled';
  const isInProgress = session.status === 'in_progress';

  return (
    <Card style={styles.sessionCard}>
      <TouchableOpacity
        onPress={() => setExpanded((prev) => !prev)}
        activeOpacity={0.7}
      >
        <View style={styles.sessionHeader}>
          <View style={styles.sessionInfo}>
            <Text variant="titleSmall" style={styles.dayLabel}>
              {dayLabel}
            </Text>
            <Text variant="bodyMedium" style={styles.sessionTitle}>
              {session.title}
            </Text>
          </View>
          <View style={styles.badges}>
            <Badge
              label={`${session.exercises.length} exercises`}
              variant="accent"
            />
            <Badge
              label={STATUS_LABEL[session.status]}
              variant={STATUS_VARIANT[session.status]}
            />
          </View>
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textMuted}
          />
        </View>
      </TouchableOpacity>
      {expanded && (
        <CardContent>
          {session.exercises.map((ex, i) => (
            <View key={i} style={styles.exerciseRow}>
              <View style={styles.exerciseInfo}>
                <Text variant="bodySmall" style={styles.exerciseName}>
                  {ex.name}
                </Text>
                <Text variant="labelSmall" style={styles.exerciseSets}>
                  {ex.sets} x {ex.reps}
                </Text>
              </View>
              {ex.youtubeUrl && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(ex.youtubeUrl!)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons
                    name="youtube"
                    size={20}
                    color={colors.destructive}
                  />
                </TouchableOpacity>
              )}
            </View>
          ))}
          {(isScheduled || isInProgress) && (
            <View style={styles.startButtonRow}>
              <Button
                onPress={() => router.push(`/workout/${session.id}`)}
                size="small"
              >
                {isInProgress ? 'Resume Workout' : 'Start Workout'}
              </Button>
            </View>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function ScheduleScreen() {
  const sessions = useWorkoutStore((s) => s.sessions);
  const currentWeekStart = useWorkoutStore((s) => s.currentWeekStart);
  const loading = useWorkoutStore((s) => s.loading);
  const error = useWorkoutStore((s) => s.error);
  const nextWeek = useWorkoutStore((s) => s.nextWeek);
  const prevWeek = useWorkoutStore((s) => s.prevWeek);
  const fetchWeekSessions = useWorkoutStore((s) => s.fetchWeekSessions);

  useEffect(() => {
    fetchWeekSessions(currentWeekStart);
  }, [currentWeekStart, fetchWeekSessions]);

  const weekLabel = format(parseISO(currentWeekStart), "'Week of' MMM d");

  return (
    <ScreenContainer scroll title="Schedule" padded={false}>
      <View style={styles.weekNav}>
        <IconButton
          icon="chevron-left"
          iconColor={colors.textSecondary}
          size={24}
          onPress={prevWeek}
        />
        <Text variant="titleSmall" style={styles.weekLabel}>
          {weekLabel}
        </Text>
        <IconButton
          icon="chevron-right"
          iconColor={colors.textSecondary}
          size={24}
          onPress={nextWeek}
        />
      </View>

      {error ? (
        <View style={styles.center}>
          <Text variant="bodySmall" style={styles.errorText}>
            {error}
          </Text>
        </View>
      ) : null}

      <View style={styles.sessionList}>
        {sessions.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="calendar-blank-outline"
              size={48}
              color={colors.textMuted}
            />
            <Text variant="bodyMedium" style={styles.emptyText}>
              No plan yet — chat with your trainer to create one
            </Text>
          </View>
        ) : (
          sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  weekLabel: {
    color: colors.textPrimary,
    minWidth: 160,
    textAlign: 'center',
  },
  sessionList: {
    padding: spacing.base,
    gap: spacing.md,
  },
  sessionCard: {
    marginBottom: spacing.sm,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    gap: spacing.sm,
  },
  sessionInfo: {
    flex: 1,
  },
  dayLabel: {
    color: colors.accent,
  },
  sessionTitle: {
    color: colors.textPrimary,
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    color: colors.textPrimary,
  },
  exerciseSets: {
    color: colors.textMuted,
    marginTop: 2,
  },
  center: {
    alignItems: 'center',
    padding: spacing.base,
  },
  errorText: {
    color: colors.destructive,
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
  startButtonRow: {
    paddingTop: spacing.base,
    alignItems: 'center',
  },
});
