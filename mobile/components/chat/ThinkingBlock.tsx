import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, CardContent } from '../ui';
import { colors, spacing, radii } from '../../theme';

type ThinkingBlockProps = {
  text: string;
  isStreaming: boolean;
};

export function ThinkingBlock({ text, isStreaming }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(true);

  // Auto-collapse once thinking is done
  React.useEffect(() => {
    if (!isStreaming && text.length > 0) {
      setExpanded(false);
    }
  }, [isStreaming, text.length]);

  if (!text) return null;

  return (
    <Card style={styles.card}>
      <TouchableOpacity
        onPress={() => setExpanded((prev) => !prev)}
        activeOpacity={0.7}
      >
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="brain"
            size={18}
            color={colors.textSecondary}
          />
          <Text variant="labelMedium" style={styles.label}>
            {isStreaming ? 'Thinking...' : 'Thought process'}
          </Text>
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textMuted}
          />
        </View>
      </TouchableOpacity>
      {expanded && (
        <CardContent style={styles.content}>
          <Text variant="bodySmall" style={styles.text}>
            {text}
          </Text>
        </CardContent>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  label: {
    flex: 1,
    color: colors.textSecondary,
  },
  content: {
    paddingTop: 0,
  },
  text: {
    color: colors.textMuted,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
});
