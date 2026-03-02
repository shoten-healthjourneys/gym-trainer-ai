import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function hapticTick(): void {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}

export function hapticWarning(): void {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }
}

export function hapticSuccess(): void {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }
}

let beepSound: Audio.Sound | null = null;
let audioModeSet = false;

export async function playBeep(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if (!audioModeSet) {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      audioModeSet = true;
    }
    if (!beepSound) {
      const { sound } = await Audio.Sound.createAsync(
        require('../../../assets/sounds/beep.wav'),
      );
      beepSound = sound;
    }
    await beepSound.setPositionAsync(0);
    await beepSound.playAsync();
  } catch {
    // fire-and-forget — don't crash the timer
  }
}

/** Haptic tick + audible beep for countdown warnings */
export function countdownWarningTick(): void {
  hapticTick();
  playBeep();
}
