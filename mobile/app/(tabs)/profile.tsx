import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Chip,
  Snackbar,
  SegmentedButtons,
  Text,
  useTheme,
  ActivityIndicator,
} from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';
import { useProfileStore } from '../../stores/profileStore';
import type { ExperienceLevel, TrainingGoal } from '../../types';

const TRAINING_GOALS: { label: string; value: TrainingGoal }[] = [
  { label: 'Hypertrophy', value: 'hypertrophy' },
  { label: 'Strength', value: 'strength' },
  { label: 'Endurance', value: 'endurance' },
  { label: 'Weight Loss', value: 'weight_loss' },
  { label: 'General Fitness', value: 'general_fitness' },
];

const EXPERIENCE_LEVELS: { label: string; value: ExperienceLevel }[] = [
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const UNIT_OPTIONS: { label: string; value: 'kg' | 'lbs' }[] = [
  { label: 'kg', value: 'kg' },
  { label: 'lbs', value: 'lbs' },
];

export default function ProfileScreen() {
  const theme = useTheme<MD3Theme>();
  const {
    profile,
    loading,
    error,
    isFirstSetup,
    fetchProfile,
    updateProfile,
    clearError,
  } = useProfileStore();

  const [selectedGoals, setSelectedGoals] = useState<TrainingGoal[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | ''>('');
  const [selectedDays, setSelectedDays] = useState<boolean[]>(new Array(7).fill(false));
  const [preferredUnit, setPreferredUnit] = useState<'kg' | 'lbs'>('kg');
  const [saving, setSaving] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (profile) {
      setSelectedGoals(profile.trainingGoals ?? []);
      setExperienceLevel(profile.experienceLevel ?? '');
      setPreferredUnit(profile.preferredUnit ?? 'kg');

      if (profile.availableDays != null) {
        const days = new Array<boolean>(7).fill(false);
        for (let i = 0; i < Math.min(profile.availableDays, 7); i++) {
          days[i] = true;
        }
        setSelectedDays(days);
      }
    }
  }, [profile]);

  const toggleGoal = useCallback((goal: TrainingGoal) => {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
    );
  }, []);

  const toggleDay = useCallback((index: number) => {
    setSelectedDays((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }, []);

  const canSave = selectedGoals.length > 0 && experienceLevel !== '';

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await updateProfile({
        trainingGoals: selectedGoals,
        experienceLevel: experienceLevel as ExperienceLevel,
        availableDays: selectedDays.filter(Boolean).length,
        preferredUnit,
      });
      setSuccessVisible(true);
    } finally {
      setSaving(false);
    }
  }, [canSave, selectedGoals, experienceLevel, selectedDays, preferredUnit, updateProfile]);

  if (loading && !profile && !saving) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {isFirstSetup ? (
          <View style={styles.header}>
            <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>
              Set up your training profile
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
            >
              Tell your AI trainer about your goals so it can plan the perfect workouts for
              you.
            </Text>
          </View>
        ) : (
          <View style={styles.header}>
            <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>
              Your Profile
            </Text>
          </View>
        )}

        {/* Training Goals */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={{ color: theme.colors.onBackground }}>
            Training Goals
          </Text>
          <View style={styles.chipRow}>
            {TRAINING_GOALS.map(({ label, value }) => {
              const selected = selectedGoals.includes(value);
              return (
                <Chip
                  key={value}
                  selected={selected}
                  onPress={() => toggleGoal(value)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected
                        ? theme.colors.secondaryContainer
                        : theme.colors.surface,
                    },
                  ]}
                  textStyle={{
                    color: selected
                      ? theme.colors.onSecondaryContainer
                      : theme.colors.onSurface,
                  }}
                  showSelectedCheck={false}
                >
                  {label}
                </Chip>
              );
            })}
          </View>
        </View>

        {/* Experience Level */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={{ color: theme.colors.onBackground }}>
            Experience Level
          </Text>
          <SegmentedButtons
            value={experienceLevel}
            onValueChange={(val) => setExperienceLevel(val as ExperienceLevel)}
            buttons={EXPERIENCE_LEVELS}
            style={styles.segmented}
          />
        </View>

        {/* Available Training Days */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={{ color: theme.colors.onBackground }}>
            Available Training Days
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}
          >
            {selectedDays.filter(Boolean).length} days selected
          </Text>
          <View style={styles.chipRow}>
            {DAYS.map((day, index) => {
              const selected = selectedDays[index];
              return (
                <Chip
                  key={day}
                  selected={selected}
                  onPress={() => toggleDay(index)}
                  style={[
                    styles.dayChip,
                    {
                      backgroundColor: selected
                        ? theme.colors.secondaryContainer
                        : theme.colors.surface,
                    },
                  ]}
                  textStyle={{
                    color: selected
                      ? theme.colors.onSecondaryContainer
                      : theme.colors.onSurface,
                  }}
                  showSelectedCheck={false}
                >
                  {day}
                </Chip>
              );
            })}
          </View>
        </View>

        {/* Preferred Unit */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={{ color: theme.colors.onBackground }}>
            Preferred Unit
          </Text>
          <SegmentedButtons
            value={preferredUnit}
            onValueChange={(val) => setPreferredUnit(val as 'kg' | 'lbs')}
            buttons={UNIT_OPTIONS}
            style={styles.segmented}
          />
        </View>

        {/* Save Button */}
        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={!canSave || saving}
          style={styles.saveButton}
          buttonColor={theme.colors.secondary}
          textColor={theme.colors.onSecondary}
        >
          {isFirstSetup ? 'Get Started' : 'Save Profile'}
        </Button>
      </ScrollView>

      {/* Success Snackbar */}
      <Snackbar
        visible={successVisible}
        onDismiss={() => setSuccessVisible(false)}
        duration={3000}
      >
        Profile saved!
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar
        visible={!!error}
        onDismiss={clearError}
        duration={4000}
        action={{ label: 'Dismiss', onPress: clearError }}
      >
        {error ?? ''}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 24,
  },
  subtitle: {
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    marginBottom: 4,
  },
  dayChip: {
    marginBottom: 4,
  },
  segmented: {
    marginTop: 12,
  },
  saveButton: {
    marginTop: 8,
  },
});
