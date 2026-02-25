import { create } from 'zustand';
import { del } from '../services/api';
import { streamChat } from '../services/sse';
import type { ChatDisplayMessage } from '../types';

interface ChatState {
  messages: ChatDisplayMessage[];
  isStreaming: boolean;
  error: string | null;
  lastFailedMessage: string | null;
  sendMessage: (text: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  newChat: () => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,
  error: null,
  lastFailedMessage: null,

  sendMessage: async (text: string) => {
    const userMsg: ChatDisplayMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    const assistantMsg: ChatDisplayMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      thinking: '',
      toolCalls: [],
      isStreaming: true,
    };

    set((state) => ({
      messages: [...state.messages, userMsg, assistantMsg],
      isStreaming: true,
      error: null,
      lastFailedMessage: null,
    }));

    try {
      for await (const event of streamChat(text)) {
        const msgs = get().messages;
        const lastIdx = msgs.length - 1;
        const last = msgs[lastIdx];
        if (!last || last.role !== 'assistant') continue;

        let updated: ChatDisplayMessage;

        switch (event.type) {
          case 'thinking':
            updated = { ...last, thinking: (last.thinking ?? '') + (event.text ?? '') };
            break;
          case 'tool_start': {
            const toolName = event.name ?? '';
            // Skip empty names and duplicates
            if (!toolName || (last.toolCalls ?? []).some((tc) => tc.name === toolName)) {
              continue;
            }
            updated = {
              ...last,
              toolCalls: [...(last.toolCalls ?? []), { name: toolName, status: 'loading' as const }],
            };
            break;
          }
          case 'tool_done':
            updated = {
              ...last,
              toolCalls: (last.toolCalls ?? []).map((tc) =>
                tc.name === event.name ? { ...tc, status: 'complete' as const } : tc
              ),
            };
            break;
          case 'text':
            // Backend sends cumulative text
            updated = { ...last, content: event.text ?? '' };
            break;
          case 'error':
            updated = { ...last, content: last.content + '\n\n⚠️ ' + (event.text ?? 'An error occurred'), isStreaming: false };
            break;
          case 'done':
            updated = { ...last, isStreaming: false };
            break;
          default:
            continue;
        }

        set((state) => ({
          messages: [...state.messages.slice(0, lastIdx), updated],
        }));
      }
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : 'Failed to send message',
        lastFailedMessage: text,
      });
    } finally {
      set((state) => {
        const msgs = state.messages;
        const lastIdx = msgs.length - 1;
        const last = msgs[lastIdx];
        if (last?.isStreaming) {
          return {
            isStreaming: false,
            messages: [...msgs.slice(0, lastIdx), { ...last, isStreaming: false }],
          };
        }
        return { isStreaming: false };
      });
    }
  },

  retryLastMessage: async () => {
    const { lastFailedMessage, messages } = get();
    if (!lastFailedMessage) return;

    // Remove last failed assistant message
    const filtered = messages.filter((m, i) => {
      if (i === messages.length - 1 && m.role === 'assistant') return false;
      return true;
    });

    set({ messages: filtered, error: null, lastFailedMessage: null });
    await get().sendMessage(lastFailedMessage);
  },

  newChat: async () => {
    try {
      await del('/chat/history');
    } catch {
      // Clear locally even if server fails
    }
    set({ messages: [], error: null, isStreaming: false });
  },

  clearMessages: () => set({ messages: [], error: null }),
  clearError: () => set({ error: null }),
}));
