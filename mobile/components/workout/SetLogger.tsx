import React, { useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';
import { useWorkoutStore } from '../../stores/workoutStore';
import { ManualSetDialog } from './ManualSetDialog';
import type { ExerciseLog, ExerciseType } from '../../types';

function formatSetDisplay(log: ExerciseLog, exerciseType?: ExerciseType): string {
  if (exerciseType === 'cardio') {
    const parts: string[] = [];
    if (log.distanceM != null) parts.push(`${log.distanceM}m`);
    if (log.durationSeconds != null) {
      const mins = Math.floor(log.durationSeconds / 60);
      const secs = log.durationSeconds % 60;
      parts.push(`${mins}:${secs.toString().padStart(2, '0')}`);
    }
    const main = parts.length > 0 ? parts.join(' in ') : 'logged';
    const rpe = log.rpe ? ` @ RPE ${log.rpe}` : '';
    return `Set ${log.setNumber}: ${main}${rpe}`;
  }
  const rpe = log.rpe ? ` @ RPE ${log.rpe}` : '';
  return `Set ${log.setNumber}: ${log.weightKg ?? 0}kg x ${log.reps ?? 0}${rpe}`;
}

interface SetLoggerProps {
  exerciseName: string;
  sessionId: string;
  logs: ExerciseLog[];
  exerciseType?: ExerciseType;
}

export function SetLogger({ exerciseName, sessionId, logs, exerciseType }: SetLoggerProps) {
  const [editingLog, setEditingLog] = useState<ExerciseLog | undefined>();
  const [dialogVisible, setDialogVisible] = useState(false);
  const updateSet = useWorkoutStore((s) => s.updateSet);
  const deleteSet = useWorkoutStore((s) => s.deleteSet);

  const handleEdit = (log: ExerciseLog) => {
    setEditingLog(log);
    setDialogVisible(true);
  };

  const handleDelete = (log: ExerciseLog) => {
    Alert.alert(
      'Delete Set',
      `Delete Set ${log.setNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteSet(log.id, exerciseName),
        },
      ],
    );
  };

  const handleEditSubmit = (data: { weightKg?: number; reps?: number; distanceM?: number; durationSeconds?: number; rpe?: number }) => {
    if (editingLog) {
      updateSet(editingLog.id, data);
    }
  };

  if (logs.length === 0) {
    return (
      <Text variant="bodySmall" style={styles.empty}>
        No sets logged yet
      </Text>
    );
  }

  return (
    <View>
      {logs.map((log) => (
        <View key={log.id} style={styles.row}>
          <Text variant="bodySmall" style={styles.setText}>
            {formatSetDisplay(log, exerciseType)}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => handleEdit(log)} hitSlop={8}>
              <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(log)} hitSlop={8}>
              <MaterialCommunityIcons name="delete-outline" size={18} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <ManualSetDialog
        visible={dialogVisible}
        onDismiss={() => { setDialogVisible(false); setEditingLog(undefined); }}
        onSubmit={handleEditSubmit}
        existingLog={editingLog}
        exerciseType={exerciseType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  setText: {
    color: colors.textPrimary,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  empty: {
    color: colors.textMuted,
    paddingVertical: spacing.sm,
  },
});
