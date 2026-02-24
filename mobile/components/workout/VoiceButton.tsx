import React, { useCallback, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Modal, Portal, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../ui';
import { colors, spacing, radii } from '../../theme';
import { startRecording, stopAndUpload } from '../../services/voice';
import { useWorkoutStore } from '../../stores/workoutStore';
import type { Audio } from 'expo-av';
import type { VoiceParseResponse, VoiceParsedSet } from '../../types';

type VoiceState = 'idle' | 'recording' | 'processing';

interface VoiceButtonProps {
  exerciseName: string;
  sessionId: string;
  onClarification?: (message: string) => void;
}

export function VoiceButton({ exerciseName, sessionId, onClarification }: VoiceButtonProps) {
  const [state, setState] = useState<VoiceState>('idle');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedSet, setParsedSet] = useState<VoiceParsedSet | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const logSet = useWorkoutStore((s) => s.logSet);
  const fetchExerciseLogs = useWorkoutStore((s) => s.fetchExerciseLogs);

  const handleToggle = useCallback(async () => {
    if (state === 'recording') {
      // Stop recording
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
      if (!recordingRef.current) {
        setState('idle');
        return;
      }
      setState('processing');
      try {
        const result: VoiceParseResponse = await stopAndUpload(
          recordingRef.current,
          exerciseName,
          sessionId,
        );
        if (result.needsClarification) {
          setTranscript(result.transcript ?? '');
          onClarification?.(result.needsClarification);
        } else if (result.parsed) {
          setTranscript(result.transcript ?? '');
          setParsedSet(result.parsed);
          setConfirmVisible(true);
        }
      } catch {
        onClarification?.('Voice recording failed. Please try again.');
      } finally {
        recordingRef.current = null;
        setState('idle');
      }
    } else {
      // Start recording
      try {
        setState('recording');
        Animated.spring(scaleAnim, { toValue: 1.2, useNativeDriver: true }).start();
        recordingRef.current = await startRecording();
      } catch {
        setState('idle');
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
      }
    }
  }, [state, exerciseName, sessionId, scaleAnim, onClarification]);

  const handleConfirm = useCallback(async () => {
    if (!parsedSet) return;
    setConfirmVisible(false);
    await logSet(sessionId, exerciseName, {
      weightKg: parsedSet.weightKg,
      reps: parsedSet.reps,
      rpe: parsedSet.rpe ?? undefined,
    });
    await fetchExerciseLogs(sessionId, exerciseName);
    setParsedSet(null);
    setTranscript('');
  }, [parsedSet, sessionId, exerciseName, logSet, fetchExerciseLogs]);

  const handleDismiss = useCallback(() => {
    setConfirmVisible(false);
    setParsedSet(null);
    setTranscript('');
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          onPress={handleToggle}
          style={[
            styles.button,
            state === 'recording' && styles.recording,
          ]}
          disabled={state === 'processing'}
        >
          {state === 'processing' ? (
            <ActivityIndicator size={24} color={colors.textPrimary} />
          ) : (
            <MaterialCommunityIcons
              name={state === 'recording' ? 'stop' : 'microphone'}
              size={24}
              color={state === 'recording' ? colors.textPrimary : colors.accent}
            />
          )}
        </Pressable>
      </Animated.View>
      <Text variant="labelSmall" style={styles.hint}>
        {state === 'idle' ? 'Tap to record' : state === 'recording' ? 'Tap to stop' : 'Processing...'}
      </Text>

      <Portal>
        <Modal
          visible={confirmVisible}
          onDismiss={handleDismiss}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleMedium" style={styles.modalTitle}>
            Voice Input
          </Text>
          <View style={styles.transcriptBox}>
            <Text variant="labelSmall" style={styles.label}>You said:</Text>
            <Text variant="bodyMedium" style={styles.transcriptText}>
              &ldquo;{transcript}&rdquo;
            </Text>
          </View>
          {parsedSet && (
            <View style={styles.parsedBox}>
              <Text variant="labelSmall" style={styles.label}>Parsed as:</Text>
              <View style={styles.parsedRow}>
                <View style={styles.parsedItem}>
                  <Text variant="headlineSmall" style={styles.parsedValue}>
                    {parsedSet.weightKg}
                  </Text>
                  <Text variant="labelSmall" style={styles.parsedLabel}>kg</Text>
                </View>
                <Text variant="headlineSmall" style={styles.parsedSeparator}>×</Text>
                <View style={styles.parsedItem}>
                  <Text variant="headlineSmall" style={styles.parsedValue}>
                    {parsedSet.reps}
                  </Text>
                  <Text variant="labelSmall" style={styles.parsedLabel}>reps</Text>
                </View>
                {parsedSet.rpe != null && (
                  <>
                    <Text variant="headlineSmall" style={styles.parsedSeparator}>@</Text>
                    <View style={styles.parsedItem}>
                      <Text variant="headlineSmall" style={styles.parsedValue}>
                        {parsedSet.rpe}
                      </Text>
                      <Text variant="labelSmall" style={styles.parsedLabel}>RPE</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          )}
          <View style={styles.actions}>
            <Button variant="ghost" onPress={handleDismiss}>Redo</Button>
            <Button onPress={handleConfirm}>Log Set</Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  recording: {
    backgroundColor: colors.destructive,
    borderColor: colors.destructive,
  },
  hint: {
    color: colors.textMuted,
  },
  modal: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
  },
  modalTitle: {
    color: colors.textPrimary,
    marginBottom: spacing.base,
  },
  transcriptBox: {
    marginBottom: spacing.base,
  },
  label: {
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  transcriptText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  parsedBox: {
    backgroundColor: colors.surfaceElevated,
    padding: spacing.base,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
  },
  parsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  parsedItem: {
    alignItems: 'center',
  },
  parsedValue: {
    color: colors.accent,
  },
  parsedLabel: {
    color: colors.textMuted,
  },
  parsedSeparator: {
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
