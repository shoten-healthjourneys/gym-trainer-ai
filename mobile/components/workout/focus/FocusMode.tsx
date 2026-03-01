import React, { useCallback, useState } from 'react';
import { Alert, Modal, Platform, StyleSheet, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { colors } from '../../../theme';
import { FocusModeHeader } from './FocusModeHeader';
import { FocusModeStandard } from './FocusModeStandard';
import { FocusModeSupersetStandard } from './FocusModeSupersetStandard';
import { FocusModeEmom } from './FocusModeEmom';
import { FocusModeAmrap } from './FocusModeAmrap';
import { FocusModeCircuit } from './FocusModeCircuit';
import { FocusModeComplete } from './FocusModeComplete';
import type { ExerciseGroup } from '../../../types';

interface FocusModeProps {
  visible: boolean;
  sessionId: string;
  exerciseGroups: ExerciseGroup[];
  initialGroupIndex: number;
  onClose: () => void;
}

export function FocusMode({
  visible,
  sessionId,
  exerciseGroups,
  initialGroupIndex,
  onClose,
}: FocusModeProps) {
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialGroupIndex);
  const [showComplete, setShowComplete] = useState(false);

  useKeepAwake();

  // Reset state when modal opens with a new group
  React.useEffect(() => {
    if (visible) {
      setCurrentGroupIndex(initialGroupIndex);
      setShowComplete(false);
    }
  }, [visible, initialGroupIndex]);

  const group = exerciseGroups[currentGroupIndex];
  const totalGroups = exerciseGroups.length;

  const exerciseName = group
    ? group.exercises.map((e) => e.name).join(' / ')
    : '';

  const handleClose = useCallback(() => {
    if (Platform.OS === 'web') {
      onClose();
    } else {
      Alert.alert(
        'Close Focus Mode',
        'Your logged sets are saved. Close focus mode?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Close', onPress: onClose },
        ],
      );
    }
  }, [onClose]);

  const handlePrev = useCallback(() => {
    setShowComplete(false);
    setCurrentGroupIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleNext = useCallback(() => {
    setShowComplete(false);
    setCurrentGroupIndex((i) => Math.min(totalGroups - 1, i + 1));
  }, [totalGroups]);

  const handleTimedComplete = useCallback(() => {
    setShowComplete(true);
  }, []);

  const handleContinue = useCallback(() => {
    setShowComplete(false);
    if (currentGroupIndex < totalGroups - 1) {
      setCurrentGroupIndex((i) => i + 1);
    } else {
      onClose();
    }
  }, [currentGroupIndex, totalGroups, onClose]);

  if (!group) return null;

  const renderContent = () => {
    if (showComplete) {
      return (
        <FocusModeComplete
          group={group}
          sessionId={sessionId}
          onContinue={handleContinue}
          onClose={onClose}
          isLastGroup={currentGroupIndex >= totalGroups - 1}
        />
      );
    }

    const { timerConfig, groupType } = group;

    if (timerConfig.mode === 'emom') {
      return (
        <FocusModeEmom
          group={group}
          sessionId={sessionId}
          onComplete={handleTimedComplete}
        />
      );
    }

    if (timerConfig.mode === 'amrap') {
      return (
        <FocusModeAmrap
          group={group}
          sessionId={sessionId}
          onComplete={handleTimedComplete}
        />
      );
    }

    if (timerConfig.mode === 'circuit') {
      return (
        <FocusModeCircuit
          group={group}
          sessionId={sessionId}
          onComplete={handleTimedComplete}
        />
      );
    }

    // Standard mode
    if (groupType === 'superset') {
      return (
        <FocusModeSupersetStandard
          group={group}
          sessionId={sessionId}
        />
      );
    }

    return (
      <FocusModeStandard
        group={group}
        sessionId={sessionId}
      />
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <FocusModeHeader
          exerciseName={exerciseName}
          currentIndex={currentGroupIndex}
          totalGroups={totalGroups}
          onClose={handleClose}
          onPrev={handlePrev}
          onNext={handleNext}
        />
        <View style={styles.content}>
          {renderContent()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
});
