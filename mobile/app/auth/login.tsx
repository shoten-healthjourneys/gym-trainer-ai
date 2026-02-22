import { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import { Button, Snackbar, Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const MaterialCommunityIcons = require('react-native-vector-icons/MaterialCommunityIcons').default;

export default function LoginScreen() {
  const theme = useTheme();
  const { isLoading, error, login, register, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = () => {
    if (isRegisterMode) {
      register(email, password, displayName);
    } else {
      login(email, password);
    }
  };

  const canSubmit = email.length > 0 && password.length >= 6 && (!isRegisterMode || displayName.length > 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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

          <View style={styles.form}>
            {isRegisterMode && (
              <TextInput
                label="Display Name"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                style={styles.input}
                mode="outlined"
              />
            )}
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={styles.input}
              mode="outlined"
            />
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={styles.input}
              mode="outlined"
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={isLoading}
              disabled={isLoading || !canSubmit}
              contentStyle={styles.buttonContent}
              style={styles.button}
              buttonColor={theme.colors.secondary}
            >
              {isRegisterMode ? 'Create Account' : 'Sign In'}
            </Button>

            <Button
              mode="text"
              onPress={() => {
                setIsRegisterMode(!isRegisterMode);
                clearError();
              }}
              style={styles.switchButton}
            >
              {isRegisterMode ? 'Already have an account? Sign In' : "Don't have an account? Register"}
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>

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
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontWeight: 'bold',
    marginTop: 16,
  },
  tagline: {
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 12,
  },
  buttonContent: {
    height: 48,
  },
  button: {
    borderRadius: 24,
    marginTop: 8,
  },
  switchButton: {
    marginTop: 12,
  },
});
