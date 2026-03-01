import React, { useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Badge, Button } from '../ui';
import { ExerciseCard } from './ExerciseCard';
import { RestTimer } from './RestTimer';
import { EmomTimer } from './EmomTimer';
import { colors, spacing } from '../../theme';
import type { ExerciseGroup } from '../../types';

interface ExerciseGroupCardProps {
  group: ExerciseGroup;
  sessionId: string;
  groupIndex?: number;
  onStartFocus?: (index: number) => void;
}

const GROUP_BADGE: Record<string, { label: string; icon: string }> = {
  superset: { label: 'Superset', icon: 'swap-vertical' },
  circuit: { label: 'Circuit', icon: 'reload' },
};

const TIMER_BADGE: Record<string, string> = {
  emom: 'EMOM',
  amrap: 'AMRAP',
  circuit: 'Circuit',
};

function formatTimerSummary(group: ExerciseGroup): string | null {
  const { timerConfig } = group;
  if (timerConfig.mode === 'emom' && timerConfig.intervalSeconds && timerConfig.totalRounds) {
    const mins = Math.floor(timerConfig.intervalSeconds / 60);
    const secs = timerConfig.intervalSeconds % 60;
    const interval = secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins}:00`;
    return `${timerConfig.totalRounds} x ${interval}`;
  }
  if (timerConfig.mode === 'amrap' && timerConfig.timeLimitSeconds) {
    const mins = Math.floor(timerConfig.timeLimitSeconds / 60);
    return `${mins} min`;
  }
  if (timerConfig.mode === 'standard' && timerConfig.restSeconds) {
    const mins = Math.floor(timerConfig.restSeconds / 60);
    const secs = timerConfig.restSeconds % 60;
    return `Rest: ${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return null;
}

export function ExerciseGroupCard({ group, sessionId, groupIndex, onStartFocus }: ExerciseGroupCardProps) {
  const handleFocus = useCallback(() => {
    if (groupIndex != null && onStartFocus) onStartFocus(groupIndex);
  }, [groupIndex, onStartFocus]);

  if (group.groupType === 'single') {
    return (
      <View>
        <ExerciseCard
          exercise={group.exercises[0]}
          sessionId={sessionId}
          timerConfig={group.timerConfig}
        />
        {onStartFocus && (
          <TouchableOpacity style={styles.focusButton} onPress={handleFocus}>
            <MaterialCommunityIcons name="play-circle-outline" size={20} color={colors.accent} />
            <Text variant="labelSmall" style={styles.focusButtonText}>Focus Mode</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (group.groupType === 'superset') {
    return <SupersetGroupCard group={group} sessionId={sessionId} onStartFocus={onStartFocus ? handleFocus : undefined} />;
  }

  // Circuit / EMOM / AMRAP groups — show header + exercise list
  return <TimedGroupCard group={group} sessionId={sessionId} onStartFocus={onStartFocus ? handleFocus : undefined} />;
}

/**
 * Superset flow:
 * - Exercise A expanded, B collapsed
 * - Log set for A → no rest, B expands, A collapses
 * - Log set for B → rest timer fires
 * - After rest, A re-expands — cycle repeats
 */
function SupersetGroupCard({ group, sessionId, onStartFocus }: ExerciseGroupCardProps & { onStartFocus?: () => void }) {
  const exerciseCount = group.exercises.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const [supersetRound, setSupersetRound] = useState(1);

  const restSeconds = group.timerConfig.restSeconds ?? 90;
  const totalSets = group.exercises[0]?.sets ?? 0;

  const handleSetLogged = useCallback(
    (index: number) => {
      if (index < exerciseCount - 1) {
        // Not the last exercise in the superset — advance to next, no rest
        setActiveIndex(index + 1);
      } else {
        // Last exercise — fire rest timer, then cycle back
        setRestActive(true);
      }
    },
    [exerciseCount],
  );

  const handleRestComplete = useCallback(() => {
    setRestActive(false);
    setSupersetRound((r) => r + 1);
    setActiveIndex(0);
  }, []);

  const timerSummary = formatTimerSummary(group);

  return (
    <Card style={styles.groupCard}>
      <View style={styles.groupHeader}>
        <View style={styles.groupHeaderLeft}>
          <MaterialCommunityIcons
            name="swap-vertical"
            size={16}
            color={colors.accent}
          />
          <Badge label="Superset" variant="accent" />
          {timerSummary && (
            <Text variant="labelSmall" style={styles.timerSummary}>
              {timerSummary}
            </Text>
          )}
        </View>
        <View style={styles.groupHeaderRight}>
          <Text variant="labelSmall" style={styles.roundIndicator}>
            Set {supersetRound} of {totalSets}
          </Text>
          {onStartFocus && (
            <TouchableOpacity onPress={onStartFocus} hitSlop={8}>
              <MaterialCommunityIcons name="play-circle-outline" size={22} color={colors.accent} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {group.notes && (
        <Text variant="bodySmall" style={styles.groupNotes}>
          {group.notes}
        </Text>
      )}

      {group.exercises.map((ex, i) => (
        <ExerciseCard
          key={ex.name}
          exercise={ex}
          sessionId={sessionId}
          timerConfig={group.timerConfig}
          expanded={activeIndex === i}
          onToggleExpand={() => setActiveIndex(i)}
          suppressRest
          onSetLogged={() => handleSetLogged(i)}
        />
      ))}

      {restActive && (
        <View style={styles.groupRestContainer}>
          <RestTimer
            durationSeconds={restSeconds}
            onDismiss={handleRestComplete}
            onComplete={handleRestComplete}
          />
        </View>
      )}
    </Card>
  );
}

/**
 * Timed groups (EMOM, AMRAP, Circuit) — display header with badge,
 * exercise list, and start button for supported timer modes.
 */
function TimedGroupCard({ group, sessionId, onStartFocus }: ExerciseGroupCardProps & { onStartFocus?: () => void }) {
  const timerBadgeLabel = TIMER_BADGE[group.timerConfig.mode] ?? group.timerConfig.mode.toUpperCase();
  const timerSummary = formatTimerSummary(group);
  const [timerActive, setTimerActive] = useState(false);

  const isEmom = group.timerConfig.mode === 'emom';

  if (timerActive && isEmom) {
    return (
      <EmomTimer
        group={group}
        sessionId={sessionId}
        onComplete={() => setTimerActive(false)}
      />
    );
  }

  return (
    <Card style={styles.groupCard}>
      <View style={styles.groupHeader}>
        <View style={styles.groupHeaderLeft}>
          <MaterialCommunityIcons
            name="timer-outline"
            size={16}
            color={colors.accentSecondary}
          />
          <Badge label={timerBadgeLabel} variant="accent" />
          {timerSummary && (
            <Text variant="labelSmall" style={styles.timerSummary}>
              {timerSummary}
            </Text>
          )}
        </View>
        <View style={styles.groupHeaderRight}>
          {isEmom && (
            <Button size="small" onPress={() => setTimerActive(true)}>
              Start EMOM
            </Button>
          )}
          {onStartFocus && (
            <TouchableOpacity onPress={onStartFocus} hitSlop={8}>
              <MaterialCommunityIcons name="play-circle-outline" size={22} color={colors.accent} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {group.notes && (
        <Text variant="bodySmall" style={styles.groupNotes}>
          {group.notes}
        </Text>
      )}

      {group.exercises.map((ex) => (
        <ExerciseCard
          key={ex.name}
          exercise={ex}
          sessionId={sessionId}
          timerConfig={group.timerConfig}
        />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  groupCard: {
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timerSummary: {
    color: colors.textMuted,
  },
  roundIndicator: {
    color: colors.accent,
  },
  groupNotes: {
    color: colors.textMuted,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    fontStyle: 'italic',
  },
  groupRestContainer: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  groupHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  focusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  focusButtonText: {
    color: colors.accent,
  },
});
