import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
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

  const mdStyles = useMemo(
    () =>
      StyleSheet.create({
        body: { color: colors.textPrimary, fontSize: 14, lineHeight: 22 },
        heading1: { color: colors.textPrimary, fontSize: 20, fontWeight: '700', marginVertical: 6 },
        heading2: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginVertical: 4 },
        heading3: { color: colors.textPrimary, fontSize: 16, fontWeight: '600', marginVertical: 4 },
        strong: { fontWeight: '700', color: colors.textPrimary },
        em: { fontStyle: 'italic', color: colors.textPrimary },
        bullet_list: { marginVertical: 4 },
        ordered_list: { marginVertical: 4 },
        list_item: { marginVertical: 2 },
        bullet_list_icon: { color: colors.accent, fontSize: 14, lineHeight: 22, marginRight: 8 },
        ordered_list_icon: { color: colors.accent, fontSize: 14, lineHeight: 22, marginRight: 8 },
        code_inline: {
          backgroundColor: colors.surfaceElevated,
          color: colors.accent,
          fontFamily: 'monospace',
          paddingHorizontal: 4,
          paddingVertical: 1,
          borderRadius: 4,
        },
        fence: {
          backgroundColor: colors.surfaceElevated,
          color: colors.textPrimary,
          fontFamily: 'monospace',
          padding: 12,
          borderRadius: 8,
          marginVertical: 6,
        },
        code_block: {
          backgroundColor: colors.surfaceElevated,
          color: colors.textPrimary,
          fontFamily: 'monospace',
          padding: 12,
          borderRadius: 8,
          marginVertical: 6,
        },
        link: { color: colors.accent, textDecorationLine: 'underline' },
        paragraph: { marginVertical: 2 },
      }),
    [],
  );

  if (!content && !isStreaming) return null;

  return (
    <View style={styles.container}>
      <Markdown style={mdStyles}>{content || ''}</Markdown>
      {isStreaming && (
        <Animated.Text style={[styles.cursor, { opacity: cursorOpacity }]}>
          |
        </Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  cursor: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 14,
  },
});
