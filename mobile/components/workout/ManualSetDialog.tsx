import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Modal, Portal, Text } from 'react-native-paper';
import { Button, TextInput } from '../ui';
import { colors, spacing, radii } from '../../theme';
import type { ExerciseLog } from '../../types';

interface ManualSetDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (data: { weightKg: number; reps: number; rpe?: number }) => void;
  existingLog?: ExerciseLog;
}

export function ManualSetDialog({ visible, onDismiss, onSubmit, existingLog }: ManualSetDialogProps) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState('');

  useEffect(() => {
    if (existingLog) {
      setWeight(existingLog.weightKg?.toString() ?? '');
      setReps(existingLog.reps?.toString() ?? '');
      setRpe(existingLog.rpe?.toString() ?? '');
    } else {
      setWeight('');
      setReps('');
      setRpe('');
    }
  }, [existingLog, visible]);

  const handleSubmit = () => {
    const w = parseFloat(weight);
    const r = parseInt(reps, 10);
    if (isNaN(w) || isNaN(r)) return;

    const rpeVal = parseFloat(rpe);
    onSubmit({
      weightKg: w,
      reps: r,
      rpe: isNaN(rpeVal) ? undefined : rpeVal,
    });
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <Text variant="titleMedium" style={styles.title}>
          {existingLog ? 'Edit Set' : 'Add Set'}
        </Text>
        <View style={styles.fields}>
          <TextInput
            label="Weight (kg)"
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <TextInput
            label="Reps"
            value={reps}
            onChangeText={setReps}
            keyboardType="number-pad"
            style={styles.input}
          />
          <TextInput
            label="RPE (optional)"
            value={rpe}
            onChangeText={setRpe}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </View>
        <View style={styles.actions}>
          <Button variant="ghost" onPress={onDismiss}>Cancel</Button>
          <Button onPress={handleSubmit}>
            {existingLog ? 'Update' : 'Add'}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
  },
  title: {
    color: colors.textPrimary,
    marginBottom: spacing.base,
  },
  fields: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.surface,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
