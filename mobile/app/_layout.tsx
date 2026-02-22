import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { useAuthStore } from '../stores/authStore';

function AuthGate() {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={[styles.splash, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.secondary} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <PaperProvider theme={theme}>
      <StatusBar style="light" />
      <AuthGate />
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
