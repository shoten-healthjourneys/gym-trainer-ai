import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Menu, SegmentedButtons, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ui';
import { WeightChart, HistoryTable } from '../../components/progress';
import { get } from '../../services/api';
import { colors, spacing } from '../../theme';
import type {
  ExerciseProgressResponse,
  HistoryDayDetail,
} from '../../types';

const TIME_RANGES = [
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
  { value: '180', label: '180d' },
  { value: '9999', label: 'All' },
];

export default function ProgressScreen() {
  const [exerciseNames, setExerciseNames] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [days, setDays] = useState('90');
  const [menuVisible, setMenuVisible] = useState(false);
  const [progress, setProgress] = useState<ExerciseProgressResponse | null>(null);
  const [detail, setDetail] = useState<HistoryDayDetail[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch exercise names on mount
  useEffect(() => {
    get<string[]>('/api/exercises/names')
      .then((names) => {
        setExerciseNames(names);
        if (names.length > 0 && !selectedExercise) {
          setSelectedExercise(names[0]);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch progress data when exercise or days change
  useEffect(() => {
    if (!selectedExercise) return;
    setLoading(true);

    const params = `exercise_name=${encodeURIComponent(selectedExercise)}&days=${days}`;

    Promise.all([
      get<ExerciseProgressResponse>(`/api/exercises/history?${params}`),
      get<HistoryDayDetail[]>(`/api/exercises/history/detail?${params}`),
    ])
      .then(([historyData, detailData]) => {
        setProgress(historyData);
        setDetail(detailData);
      })
      .catch(() => {
        setProgress(null);
        setDetail([]);
      })
      .finally(() => setLoading(false));
  }, [selectedExercise, days]);

  const handleSelectExercise = useCallback((name: string) => {
    setSelectedExercise(name);
    setMenuVisible(false);
  }, []);

  // Empty state: no exercises logged yet
  if (exerciseNames.length === 0 && !loading) {
    return (
      <ScreenContainer>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="dumbbell"
            size={64}
            color={colors.textMuted}
          />
          <Text variant="titleMedium" style={styles.emptyTitle}>
            No progress yet
          </Text>
          <Text variant="bodySmall" style={styles.emptyHint}>
            Complete your first workout to start tracking progress
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="headlineMedium" style={styles.heading}>
          Progress
        </Text>

        {/* Exercise picker */}
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setMenuVisible(true)}
              textColor={colors.textPrimary}
              style={styles.pickerButton}
              icon="chevron-down"
              contentStyle={styles.pickerContent}
            >
              {selectedExercise ?? 'Select exercise'}
            </Button>
          }
          contentStyle={styles.menuContent}
        >
          {exerciseNames.map((name) => (
            <Menu.Item
              key={name}
              onPress={() => handleSelectExercise(name)}
              title={name}
              titleStyle={
                name === selectedExercise ? styles.menuItemSelected : styles.menuItem
              }
            />
          ))}
        </Menu>

        {/* Time range selector */}
        <SegmentedButtons
          value={days}
          onValueChange={setDays}
          buttons={TIME_RANGES}
          style={styles.segmented}
        />

        {/* Chart */}
        {progress && <WeightChart dataPoints={progress.dataPoints} />}

        {/* History detail table */}
        <HistoryTable data={detail} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  heading: {
    color: colors.textPrimary,
    marginBottom: spacing.base,
  },
  pickerButton: {
    borderColor: colors.border,
    marginBottom: spacing.base,
  },
  pickerContent: {
    flexDirection: 'row-reverse',
  },
  menuContent: {
    backgroundColor: colors.surfaceElevated,
  },
  menuItem: {
    color: colors.textPrimary,
  },
  menuItemSelected: {
    color: colors.accent,
  },
  segmented: {
    marginBottom: spacing.base,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.textSecondary,
    marginTop: spacing.base,
  },
  emptyHint: {
    color: colors.textMuted,
    textAlign: 'center',
  },
});
