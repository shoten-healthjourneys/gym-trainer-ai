import { StyleSheet, View } from 'react-native';
import { Button, Snackbar, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const MaterialCommunityIcons = require('react-native-vector-icons/MaterialCommunityIcons').default;

export default function LoginScreen() {
  const theme = useTheme();
  const { isLoading, error, signIn, clearError } = useAuthStore();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="dumbbell"
            size={64}
            color={theme.colors.secondary}
          />
          <Text variant="displaySmall" style={[styles.title, { color: theme.colors.onBackground }]}>
            GymTrainer
          </Text>
          <Text variant="bodyLarge" style={[styles.tagline, { color: theme.colors.onSurfaceVariant }]}>
            Your AI-powered personal trainer
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            icon="google"
            onPress={signIn}
            loading={isLoading}
            disabled={isLoading}
            contentStyle={styles.buttonContent}
            style={styles.button}
            buttonColor={theme.colors.secondary}
          >
            Sign in with Google
          </Button>
        </View>
      </View>

      <Snackbar
        visible={!!error}
        onDismiss={clearError}
        duration={4000}
        action={{ label: 'Dismiss', onPress: clearError }}
      >
        {error ?? ''}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 64,
  },
  title: {
    fontWeight: 'bold',
    marginTop: 16,
  },
  tagline: {
    marginTop: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
  },
  buttonContent: {
    height: 48,
  },
  button: {
    borderRadius: 24,
  },
});
