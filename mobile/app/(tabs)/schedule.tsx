import React, { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { ScreenContainer, Card, CardHeader, CardContent, Badge, Button } from '../../components/ui';
import { useWorkoutStore } from '../../stores/workoutStore';
import { colors, spacing, radii } from '../../theme';
import type { WorkoutSession, ExerciseInSession, ExerciseGroup, SessionStatus } from '../../types';

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

function getAllExercises(session: WorkoutSession): ExerciseInSession[] {
  return session.exerciseGroups.flatMap((g) => g.exercises);
}

const TIMER_MODE_LABEL: Record<string, string> = {
  emom: 'EMOM',
  amrap: 'AMRAP',
  circuit: 'Circuit',
};

function getSessionTimerBadges(session: WorkoutSession): string[] {
  const badges: string[] = [];
  const hasSupersets = session.exerciseGroups.some((g) => g.groupType === 'superset');
  if (hasSupersets) badges.push('Supersets');

  const timedModes = new Set<string>();
  for (const g of session.exerciseGroups) {
    if (g.timerConfig.mode !== 'standard') {
      timedModes.add(TIMER_MODE_LABEL[g.timerConfig.mode] ?? g.timerConfig.mode.toUpperCase());
    }
  }
  for (const mode of timedModes) badges.push(mode);
  return badges;
}

function SessionCard({ session }: { session: WorkoutSession }) {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const reopenSession = useWorkoutStore((s) => s.reopenSession);
  const dayLabel = format(parseISO(session.scheduledDate), 'eee MMM d');
  const isScheduled = session.status === 'scheduled';
  const isInProgress = session.status === 'in_progress';
  const isCompleted = session.status === 'completed';
  const allExercises = getAllExercises(session);
  const timerBadges = getSessionTimerBadges(session);

  return (
    <Card style={styles.sessionCard}>
      <TouchableOpacity
        onPress={() => setExpanded((prev) => !prev)}
        activeOpacity={0.7}
      >
        <View style={styles.sessionHeader}>
          <View style={styles.sessionHeaderTop}>
            <View style={styles.sessionInfo}>
              <Text variant="titleSmall" style={styles.dayLabel}>
                {dayLabel}
              </Text>
              <Text variant="bodyMedium" style={styles.sessionTitle}>
                {session.title}
              </Text>
            </View>
            <MaterialCommunityIcons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textMuted}
            />
          </View>
          <View style={styles.badges}>
            {timerBadges.map((label) => (
              <Badge key={label} label={label} variant="muted" />
            ))}
            <Badge
              label={`${allExercises.length} exercises`}
              variant="accent"
            />
            <Badge
              label={STATUS_LABEL[session.status]}
              variant={STATUS_VARIANT[session.status]}
            />
          </View>
        </View>
      </TouchableOpacity>
      {expanded && (
        <CardContent>
          {session.exerciseGroups.map((group, gi) => (
            <View key={group.groupId}>
              {group.groupType !== 'single' && (
                <View style={styles.groupLabel}>
                  <MaterialCommunityIcons
                    name={group.groupType === 'superset' ? 'swap-vertical' : 'timer-outline'}
                    size={14}
                    color={colors.accent}
                  />
                  <Text variant="labelSmall" style={styles.groupLabelText}>
                    {group.groupType === 'superset'
                      ? 'Superset'
                      : TIMER_MODE_LABEL[group.timerConfig.mode] ?? group.timerConfig.mode.toUpperCase()}
                  </Text>
                </View>
              )}
              {group.exercises.map((ex, i) => (
                <View key={`${gi}-${i}`} style={styles.exerciseRow}>
                  <View style={styles.exerciseInfo}>
                    <Text variant="bodySmall" style={styles.exerciseName}>
                      {group.groupType !== 'single' ? `  ${ex.name}` : ex.name}
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
          {isCompleted && (
            <View style={styles.startButtonRow}>
              <Button
                variant="ghost"
                size="small"
                onPress={async () => {
                  await reopenSession(session.id);
                  router.push(`/workout/${session.id}`);
                }}
              >
                Reopen Workout
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
    padding: spacing.base,
    gap: spacing.sm,
  },
  sessionHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexWrap: 'wrap',
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
  groupLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  groupLabelText: {
    color: colors.accent,
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
