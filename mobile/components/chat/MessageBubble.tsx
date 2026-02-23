import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { ThinkingBlock } from './ThinkingBlock';
import { ToolIndicator } from './ToolIndicator';
import { StreamingText } from './StreamingText';
import { PlanCard } from './PlanCard';
import { colors, spacing, radii } from '../../theme';
import type { ChatDisplayMessage } from '../../types';

type MessageBubbleProps = {
  message: ChatDisplayMessage;
};

/** Check if the content has a complete ```plan ... ``` block */
function hasCompletePlan(content: string): boolean {
  return /```plan\s*\n[\s\S]*?```/.test(content);
}

/** Check if a ```plan block has been started but not yet closed */
function hasPartialPlan(content: string): boolean {
  // Has opening fence but no closing fence
  return /```plan\s*\n/.test(content) && !hasCompletePlan(content);
}

/** Strip any partial or complete ```plan block from displayed text */
function stripPlanBlock(content: string): string {
  // Remove complete plan blocks
  let text = content.replace(/```plan\s*\n[\s\S]*?```/g, '');
  // Remove partial/in-progress plan block (opened but not yet closed)
  text = text.replace(/```plan\s*\n[\s\S]*$/, '');
  return text.trim();
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text variant="bodyMedium" style={styles.userText}>
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  const completePlan = hasCompletePlan(message.content);
  const buildingPlan = hasPartialPlan(message.content);
  const displayText = stripPlanBlock(message.content);

  return (
    <View style={styles.assistantRow}>
      <View style={styles.assistantBubble}>
        {message.thinking ? (
          <ThinkingBlock
            text={message.thinking}
            isStreaming={message.isStreaming ?? false}
          />
        ) : null}

        {message.toolCalls?.map((tc, i) => (
          <ToolIndicator key={`${tc.name}-${i}`} toolCall={tc} />
        ))}

        <StreamingText
          content={displayText}
          isStreaming={message.isStreaming ?? false}
        />

        {buildingPlan ? (
          <View style={styles.buildingPlan}>
            <ActivityIndicator size={16} color={colors.accent} />
            <Text variant="labelSmall" style={styles.buildingPlanText}>
              Building your plan...
            </Text>
          </View>
        ) : null}

        {completePlan ? (
          <PlanCard content={message.content} toolCalls={message.toolCalls} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  userBubble: {
    backgroundColor: colors.accentMuted,
    borderRadius: radii.lg,
    borderBottomRightRadius: radii.sm,
    padding: spacing.md,
    maxWidth: '80%',
  },
  userText: {
    color: colors.textPrimary,
  },
  assistantRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  assistantBubble: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderBottomLeftRadius: radii.sm,
    padding: spacing.md,
    maxWidth: '90%',
  },
  buildingPlan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  buildingPlanText: {
    color: colors.textSecondary,
  },
});
