import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Modal, Portal, Text } from 'react-native-paper';
import { Button, TextInput } from '../ui';
import { colors, spacing, radii } from '../../theme';
import type { ExerciseLog, ExerciseType } from '../../types';

interface ManualSetSubmitData {
  weightKg?: number;
  reps?: number;
  distanceM?: number;
  durationSeconds?: number;
  rpe?: number;
}

interface ManualSetDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (data: ManualSetSubmitData) => void;
  existingLog?: ExerciseLog;
  exerciseType?: ExerciseType;
}

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function parseDuration(input: string): number | null {
  const parts = input.split(':');
  if (parts.length === 2) {
    const mins = parseInt(parts[0]!, 10);
    const secs = parseInt(parts[1]!, 10);
    if (!isNaN(mins) && !isNaN(secs) && secs < 60) return mins * 60 + secs;
    return null;
  }
  const totalSecs = parseInt(input, 10);
  return isNaN(totalSecs) ? null : totalSecs;
}

export function ManualSetDialog({ visible, onDismiss, onSubmit, existingLog, exerciseType }: ManualSetDialogProps) {
  const isCardio = exerciseType === 'cardio';

  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [rpe, setRpe] = useState('');

  useEffect(() => {
    if (existingLog) {
      setWeight(existingLog.weightKg?.toString() ?? '');
      setReps(existingLog.reps?.toString() ?? '');
      setDistance(existingLog.distanceM?.toString() ?? '');
      setDuration(existingLog.durationSeconds != null ? formatDuration(existingLog.durationSeconds) : '');
      setRpe(existingLog.rpe?.toString() ?? '');
    } else {
      setWeight('');
      setReps('');
      setDistance('');
      setDuration('');
      setRpe('');
    }
  }, [existingLog, visible]);

  const handleSubmit = () => {
    const rpeVal = parseFloat(rpe);
    const rpeOut = isNaN(rpeVal) ? undefined : rpeVal;

    if (isCardio) {
      const d = parseFloat(distance);
      const dur = parseDuration(duration);
      if (isNaN(d) && dur === null) return;
      onSubmit({
        distanceM: isNaN(d) ? undefined : d,
        durationSeconds: dur ?? undefined,
        rpe: rpeOut,
      });
    } else {
      const w = parseFloat(weight);
      const r = parseInt(reps, 10);
      if (isNaN(w) || isNaN(r)) return;
      onSubmit({
        weightKg: w,
        reps: r,
        rpe: rpeOut,
      });
    }
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
          {isCardio ? (
            <>
              <TextInput
                label="Distance (m)"
                value={distance}
                onChangeText={setDistance}
                keyboardType="decimal-pad"
                style={styles.input}
              />
              <TextInput
                label="Duration (mm:ss)"
                value={duration}
                onChangeText={setDuration}
                keyboardType="default"
                placeholder="e.g. 2:30"
                style={styles.input}
              />
            </>
          ) : (
            <>
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
            </>
          )}
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
