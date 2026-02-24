import { Audio } from 'expo-av';
import { getStoredToken } from './auth';
import type { VoiceParseResponse } from '../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export async function requestMicPermission(): Promise<boolean> {
  const { granted } = await Audio.requestPermissionsAsync();
  return granted;
}

export async function startRecording(): Promise<Audio.Recording> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  await recording.startAsync();
  return recording;
}

export async function stopAndUpload(
  recording: Audio.Recording,
  exerciseName: string,
  sessionId: string,
): Promise<VoiceParseResponse> {
  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  if (!uri) {
    throw new Error('Recording URI not available');
  }

  const token = await getStoredToken();
  const formData = new FormData();
  formData.append('audio', {
    uri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  } as any);
  formData.append('exercise_name', exerciseName);
  formData.append('session_id', sessionId);

  const response = await fetch(`${API_URL}/api/voice/parse`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Voice parse failed: ${response.status}`);
  }

  return response.json() as Promise<VoiceParseResponse>;
}
