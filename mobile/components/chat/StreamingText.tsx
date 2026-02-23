import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../../theme';

type StreamingTextProps = {
  content: string;
  isStreaming: boolean;
};

export function StreamingText({ content, isStreaming }: StreamingTextProps) {
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isStreaming) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(cursorOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      );
      animationRef.current = animation;
      animation.start();
    } else {
      animationRef.current?.stop();
      cursorOpacity.setValue(0);
    }

    return () => {
      animationRef.current?.stop();
    };
  }, [isStreaming, cursorOpacity]);

  if (!content && !isStreaming) return null;

  return (
    <View style={styles.container}>
      <Text variant="bodyMedium" style={styles.text}>
        {content}
        {isStreaming && (
          <Animated.Text style={[styles.cursor, { opacity: cursorOpacity }]}>
            |
          </Animated.Text>
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  text: {
    color: colors.textPrimary,
    lineHeight: 22,
  },
  cursor: {
    color: colors.accent,
    fontWeight: '700',
  },
});
