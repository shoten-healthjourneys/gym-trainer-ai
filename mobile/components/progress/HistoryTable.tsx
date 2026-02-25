import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';
import type { HistoryDayDetail } from '../../types';

interface HistoryTableProps {
  data: HistoryDayDetail[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function DayRow({ day }: { day: HistoryDayDetail }) {
  const [expanded, setExpanded] = useState(false);
  const maxWeight = Math.max(...day.sets.map((s) => s.weightKg));

  return (
    <View style={styles.dayContainer}>
      <TouchableOpacity
        style={styles.dayHeader}
        onPress={() => setExpanded((prev) => !prev)}
        activeOpacity={0.7}
      >
        <Text variant="bodyMedium" style={styles.dateText}>
          {formatDate(day.date)}
        </Text>
        <Text variant="bodySmall" style={styles.summaryText}>
          {day.sets.length} sets · Max: {maxWeight}kg
        </Text>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textMuted}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.setsContainer}>
          {day.sets.map((set) => (
            <View key={set.setNumber} style={styles.setRow}>
              <Text variant="bodySmall" style={styles.setText}>
                Set {set.setNumber}: {set.weightKg}kg × {set.reps}
                {set.rpe != null ? ` @ RPE ${set.rpe}` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function HistoryTable({ data }: HistoryTableProps) {
  if (data.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text variant="labelMedium" style={styles.title}>
        Session History
      </Text>
      {data.map((day) => (
        <DayRow key={day.date} day={day} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.base,
  },
  title: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  dayContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  dateText: {
    color: colors.textPrimary,
    width: 60,
  },
  summaryText: {
    color: colors.textSecondary,
    flex: 1,
    marginLeft: spacing.sm,
  },
  setsContainer: {
    paddingLeft: spacing.lg,
    paddingBottom: spacing.sm,
  },
  setRow: {
    paddingVertical: spacing.xs,
  },
  setText: {
    color: colors.textPrimary,
  },
});
