import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenContainer, TextInput } from '../../components/ui';
import { MessageBubble } from '../../components/chat';
import { useChatStore } from '../../stores/chatStore';
import { colors, spacing } from '../../theme';
import type { ChatDisplayMessage } from '../../types';

export default function ChatScreen() {
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const error = useChatStore((s) => s.error);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const newChat = useChatStore((s) => s.newChat);
  const lastFailedMessage = useChatStore((s) => s.lastFailedMessage);
  const retryLastMessage = useChatStore((s) => s.retryLastMessage);
  const clearError = useChatStore((s) => s.clearError);

  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList<ChatDisplayMessage>>(null);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    clearError();
    sendMessage(text);
  }, [input, isStreaming, sendMessage, clearError]);

  const renderItem = useCallback(
    ({ item }: { item: ChatDisplayMessage }) => <MessageBubble message={item} />,
    [],
  );

  const keyExtractor = useCallback((item: ChatDisplayMessage) => item.id, []);

  const scrollToEnd = useCallback(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="dumbbell"
          size={64}
          color={colors.textMuted}
        />
        <Text variant="titleMedium" style={styles.emptyTitle}>
          Ask your trainer anything
        </Text>
        <Text variant="bodySmall" style={styles.emptyHint}>
          Try &quot;Plan my week&quot;
        </Text>
      </View>
    ),
    [],
  );

  return (
    <ScreenContainer padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {messages.length > 0 && (
          <View style={styles.headerBar}>
            <IconButton
              icon="chat-plus-outline"
              iconColor={colors.accent}
              size={22}
              onPress={newChat}
              disabled={isStreaming}
            />
          </View>
        )}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.listContent,
            messages.length === 0 && styles.emptyList,
          ]}
          onContentSizeChange={scrollToEnd}
          onLayout={scrollToEnd}
          ListEmptyComponent={renderEmpty}
          keyboardShouldPersistTaps="handled"
        />

        {error ? (
          <View style={styles.errorBar}>
            <Text variant="labelSmall" style={styles.errorText}>
              {error}
            </Text>
            {lastFailedMessage ? (
              <TouchableOpacity onPress={retryLastMessage} style={styles.retryButton}>
                <Text variant="labelSmall" style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Message your trainer..."
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            multiline
            mode="outlined"
          />
          <IconButton
            icon="send"
            iconColor={isStreaming || !input.trim() ? colors.textMuted : colors.accent}
            size={24}
            onPress={handleSend}
            disabled={isStreaming || !input.trim()}
            style={styles.sendButton}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  listContent: {
    paddingVertical: spacing.base,
  },
  emptyList: {
    flex: 1,
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
  },
  errorBar: {
    backgroundColor: colors.destructive,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 4,
  },
  retryText: {
    color: colors.destructive,
    fontWeight: '600',
  },
  errorText: {
    color: colors.textPrimary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    fontSize: 14,
  },
  sendButton: {
    marginBottom: spacing.xs,
  },
});
