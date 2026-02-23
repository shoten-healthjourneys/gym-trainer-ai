import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Snackbar, Text, ActivityIndicator } from 'react-native-paper';
import { colors, spacing } from '../../theme';
import {
  Button,
  Chip,
  ScreenContainer,
  Section,
  SegmentedButtons,
} from '../../components/ui';
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScreenContainer scroll>
      {isFirstSetup ? (
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.headingText}>
            Set up your training profile
          </Text>
          <Text variant="bodyMedium" style={styles.subtitleText}>
            Tell your AI trainer about your goals so it can plan the perfect workouts for
            you.
          </Text>
        </View>
      ) : (
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.headingText}>
            Your Profile
          </Text>
        </View>
      )}

      <Section title="Training Goals">
        <View style={styles.chipRow}>
          {TRAINING_GOALS.map(({ label, value }) => (
            <Chip
              key={value}
              selected={selectedGoals.includes(value)}
              onPress={() => toggleGoal(value)}
            >
              {label}
            </Chip>
          ))}
        </View>
      </Section>

      <Section title="Experience Level">
        <SegmentedButtons
          value={experienceLevel}
          onValueChange={(val) => setExperienceLevel(val as ExperienceLevel)}
          buttons={EXPERIENCE_LEVELS}
        />
      </Section>

      <Section
        title="Available Training Days"
        subtitle={`${selectedDays.filter(Boolean).length} days selected`}
      >
        <View style={styles.chipRow}>
          {DAYS.map((day, index) => (
            <Chip
              key={day}
              selected={selectedDays[index]}
              onPress={() => toggleDay(index)}
            >
              {day}
            </Chip>
          ))}
        </View>
      </Section>

      <Section title="Preferred Unit">
        <SegmentedButtons
          value={preferredUnit}
          onValueChange={(val) => setPreferredUnit(val as 'kg' | 'lbs')}
          buttons={UNIT_OPTIONS}
        />
      </Section>

      <Button
        variant="primary"
        onPress={handleSave}
        loading={saving}
        disabled={!canSave || saving}
        style={styles.saveButton}
      >
        {isFirstSetup ? 'Get Started' : 'Save Profile'}
      </Button>

      <Snackbar
        visible={successVisible}
        onDismiss={() => setSuccessVisible(false)}
        duration={3000}
      >
        Profile saved!
      </Snackbar>

      <Snackbar
        visible={!!error}
        onDismiss={clearError}
        duration={4000}
        action={{ label: 'Dismiss', onPress: clearError }}
      >
        {error ?? ''}
      </Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headingText: {
    color: colors.textPrimary,
  },
  subtitleText: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  saveButton: {
    marginTop: spacing.sm,
  },
});
