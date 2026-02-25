import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';
import type { ToolCallInfo } from '../../types';

const TOOL_LABELS: Record<string, string> = {
  get_user_profile: 'Checking your profile',
  get_exercise_history: 'Reviewing exercise history',
  get_planned_workouts: 'Checking your schedule',
  search_youtube: 'Finding exercise videos',
  save_workout_plan: 'Saving your plan',
  add_session_to_week: 'Updating your schedule',
  update_session: 'Modifying session',
  search_exercises: 'Looking up exercises',
};

function getToolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name;
}

type ToolIndicatorProps = {
  toolCall: ToolCallInfo;
};

export function ToolIndicator({ toolCall }: ToolIndicatorProps) {
  const isLoading = toolCall.status === 'loading';
  const label = getToolLabel(toolCall.name);

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size={14} color={colors.accent} />
      ) : (
        <MaterialCommunityIcons
          name="check-circle"
          size={14}
          color={colors.success}
        />
      )}
      <Text variant="labelSmall" style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  label: {
    color: colors.textSecondary,
  },
});
