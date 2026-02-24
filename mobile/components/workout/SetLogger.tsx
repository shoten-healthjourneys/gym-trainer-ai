import React, { useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';
import { useWorkoutStore } from '../../stores/workoutStore';
import { ManualSetDialog } from './ManualSetDialog';
import type { ExerciseLog } from '../../types';

interface SetLoggerProps {
  exerciseName: string;
  sessionId: string;
  logs: ExerciseLog[];
}

export function SetLogger({ exerciseName, sessionId, logs }: SetLoggerProps) {
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

  const handleEditSubmit = (data: { weightKg: number; reps: number; rpe?: number }) => {
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
            Set {log.setNumber}: {log.weightKg}kg x {log.reps}
            {log.rpe ? ` @ RPE ${log.rpe}` : ''}
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
