import React, { useState } from 'react';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, CardHeader, CardContent, CardFooter, Button } from '../ui';
import { colors, spacing, radii } from '../../theme';
import { useChatStore } from '../../stores/chatStore';
import type { ToolCallInfo } from '../../types';

interface PlanExercise {
  name: string;
  sets: number;
  reps: number;
  youtubeUrl?: string;
  notes?: string;
}

interface PlanDay {
  day: string;
  title: string;
  exercises: PlanExercise[];
}

type PlanCardProps = {
  content: string;
  toolCalls?: ToolCallInfo[];
};

function parsePlan(content: string): PlanDay[] | null {
  const match = content.match(/```plan\s*\n([\s\S]*?)```/);
  if (!match?.[1]) return null;

  try {
    const parsed = JSON.parse(match[1]) as unknown;
    // Handle {"sessions": [...]} format from agent
    if (parsed && typeof parsed === 'object' && 'sessions' in parsed) {
      const sessions = (parsed as { sessions: unknown }).sessions;
      if (Array.isArray(sessions)) return sessions as PlanDay[];
    }
    // Handle bare array format
    if (Array.isArray(parsed)) return parsed as PlanDay[];
    return null;
  } catch {
    return null;
  }
}

function getTextWithoutPlan(content: string): string {
  return content.replace(/```plan\s*\n[\s\S]*?```/, '').trim();
}

function DayCard({ day }: { day: PlanDay }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card style={styles.dayCard}>
      <TouchableOpacity
        onPress={() => setExpanded((prev) => !prev)}
        activeOpacity={0.7}
      >
        <View style={styles.dayHeader}>
          <View style={styles.dayInfo}>
            <Text variant="titleSmall" style={styles.dayName}>
              {day.day}
            </Text>
            <Text variant="bodySmall" style={styles.dayTitle}>
              {day.title} ({day.exercises.length} exercises)
            </Text>
          </View>
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textMuted}
          />
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.exerciseList}>
          {day.exercises.map((ex, i) => (
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
        </View>
      )}
    </Card>
  );
}

export function PlanCard({ content, toolCalls }: PlanCardProps) {
  const plan = parsePlan(content);
  const textContent = getTextWithoutPlan(content);
  const sendMessage = useChatStore((s) => s.sendMessage);

  if (!plan) return null;

  const isSaved = toolCalls?.some(
    (tc) => tc.name === 'save_workout_plan' && tc.status === 'complete'
  ) ?? false;

  return (
    <View style={styles.container}>
      {textContent ? (
        <Text variant="bodyMedium" style={styles.preText}>
          {textContent}
        </Text>
      ) : null}
      <Card style={styles.planCard}>
        <CardHeader title="Your Workout Plan" />
        <CardContent>
          {plan.map((day, i) => (
            <DayCard key={i} day={day} />
          ))}
        </CardContent>
        <CardFooter>
          {isSaved ? (
            <Text variant="labelMedium" style={styles.savedLabel}>
              Plan saved — view on Schedule
            </Text>
          ) : (
            <>
              <Button
                variant="ghost"
                size="small"
                onPress={() => sendMessage('Request changes to the plan')}
              >
                Request Changes
              </Button>
              <Button
                variant="primary"
                size="small"
                onPress={() => sendMessage('Approve the plan and save it')}
              >
                Approve Plan
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  preText: {
    color: colors.textPrimary,
    lineHeight: 22,
  },
  planCard: {
    backgroundColor: colors.surface,
  },
  dayCard: {
    backgroundColor: colors.surfaceElevated,
    marginBottom: spacing.sm,
    borderColor: colors.borderSubtle,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  dayInfo: {
    flex: 1,
  },
  dayName: {
    color: colors.accent,
  },
  dayTitle: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  exerciseList: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
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
  savedLabel: {
    color: colors.success,
  },
});
