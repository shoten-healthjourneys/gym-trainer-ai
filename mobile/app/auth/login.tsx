import { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import { Snackbar, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';
import { Button, TextInput } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';

export default function LoginScreen() {
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <MaterialCommunityIcons
              name="dumbbell"
              size={64}
              color={colors.accent}
            />
            <Text variant="displaySmall" style={styles.title}>
              GymTrainer
            </Text>
            <Text variant="bodyLarge" style={styles.tagline}>
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
            />
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={styles.input}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />

            <Button
              variant="primary"
              onPress={handleSubmit}
              loading={isLoading}
              disabled={isLoading || !canSubmit}
              style={styles.button}
            >
              {isRegisterMode ? 'Create Account' : 'Sign In'}
            </Button>

            <Button
              variant="ghost"
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
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    color: colors.textPrimary,
    marginTop: spacing.base,
  },
  tagline: {
    marginTop: spacing.sm,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: spacing.md,
  },
  button: {
    marginTop: spacing.sm,
  },
  switchButton: {
    marginTop: spacing.md,
  },
});
