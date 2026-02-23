import { Text } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import { ScreenContainer } from '../../components/ui';
import { colors } from '../../theme';

export default function ProgressScreen() {
  return (
    <ScreenContainer>
      <Text variant="headlineMedium" style={styles.heading}>Progress</Text>
      <Text variant="bodyMedium" style={styles.body}>Coming soon...</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.textPrimary,
  },
  body: {
    color: colors.textSecondary,
  },
});
