import { getStoredToken } from './auth';
import type { SSEEvent } from '../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

const TIMEOUT_MS = 60_000;

export async function* streamChat(message: string): AsyncGenerator<SSEEvent> {
  const token = await getStoredToken();

  const events: SSEEvent[] = [];
  let done = false;
  let error: Error | null = null;
  let resolve: (() => void) | null = null;

  function notify() {
    if (resolve) {
      const r = resolve;
      resolve = null;
      r();
    }
  }

  function waitForEvent(): Promise<void> {
    return new Promise((r) => {
      resolve = r;
    });
  }

  const xhr = new XMLHttpRequest();
  xhr.open('POST', `${API_URL}/chat/stream`);
  xhr.setRequestHeader('Content-Type', 'application/json');
  if (token) {
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  }
  xhr.responseType = 'text';
  xhr.timeout = TIMEOUT_MS;

  let lastIndex = 0;
  let buffer = '';

  function processChunk(newData: string) {
    buffer += newData;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;

      const jsonStr = trimmed.slice(6);
      if (!jsonStr) continue;

      try {
        const event = JSON.parse(jsonStr) as SSEEvent;
        events.push(event);
      } catch {
        // Skip malformed JSON
      }
    }
  }

  xhr.onprogress = () => {
    const newData = xhr.responseText.substring(lastIndex);
    lastIndex = xhr.responseText.length;
    processChunk(newData);
    notify();
  };

  xhr.onload = () => {
    // Process any remaining data
    const remaining = xhr.responseText.substring(lastIndex);
    if (remaining) {
      processChunk(remaining);
    }
    done = true;
    notify();
  };

  xhr.onerror = () => {
    error = new Error('Network error');
    done = true;
    notify();
  };

  xhr.ontimeout = () => {
    error = new Error('Request timed out');
    done = true;
    notify();
  };

  xhr.onreadystatechange = () => {
    if (xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
      if (xhr.status >= 400) {
        error = new Error(`Chat request failed: ${xhr.status}`);
        done = true;
        xhr.abort();
        notify();
      }
    }
  };

  xhr.send(JSON.stringify({ message }));

  try {
    while (true) {
      if (events.length > 0) {
        yield events.shift()!;
        continue;
      }

      if (done) {
        if (error) throw error;
        return;
      }

      await waitForEvent();
    }
  } finally {
    if (!done) {
      xhr.abort();
    }
  }
}
