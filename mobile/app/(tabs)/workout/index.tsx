import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export default function WorkoutScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Workouts</Text>
      <Text variant="bodyMedium">Coming soon...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
