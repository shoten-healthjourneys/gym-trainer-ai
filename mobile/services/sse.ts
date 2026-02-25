import { getStoredToken } from './auth';
import type { SSEEvent } from '../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

const MAX_RETRIES = 2;
const RETRY_DELAYS = [1000, 2000];
const TIMEOUT_MS = 60_000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function* streamChat(message: string): AsyncGenerator<SSEEvent> {
  const token = await getStoredToken();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      yield { type: 'error', text: 'Connection lost, retrying...' };
      await delay(RETRY_DELAYS[attempt - 1]);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${API_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      });

      if (!response.ok) {
        // 4xx errors fail immediately (client error, no retry)
        if (response.status >= 400 && response.status < 500) {
          clearTimeout(timeoutId);
          throw new Error(`Chat request failed: ${response.status}`);
        }
        // 5xx errors are retryable
        lastError = new Error(`Server error: ${response.status}`);
        clearTimeout(timeoutId);
        continue;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        clearTimeout(timeoutId);
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;

            const jsonStr = trimmed.slice(6);
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr) as SSEEvent;
              yield event;
            } catch {
              // Skip malformed JSON
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      clearTimeout(timeoutId);
      return; // Success — exit retry loop
    } catch (e) {
      clearTimeout(timeoutId);

      if (e instanceof Error && e.name === 'AbortError') {
        lastError = new Error('Request timed out');
        continue;
      }

      // Network errors are retryable
      if (e instanceof TypeError) {
        lastError = e;
        continue;
      }

      // Non-retryable errors (4xx, etc.) throw immediately
      throw e;
    }
  }

  // All retries exhausted
  throw lastError ?? new Error('Failed to connect');
}
