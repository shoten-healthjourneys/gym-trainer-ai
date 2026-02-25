import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { colors, spacing } from '../../theme';
import type { ProgressDataPoint } from '../../types';

interface WeightChartProps {
  dataPoints: ProgressDataPoint[];
}

export function WeightChart({ dataPoints }: WeightChartProps) {
  if (dataPoints.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="bodyMedium" style={styles.emptyText}>
          No data yet
        </Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width - spacing.base * 2;

  // Show every Nth label to avoid overlap
  const labelInterval = dataPoints.length > 8
    ? Math.ceil(dataPoints.length / 6)
    : 1;

  const labels = dataPoints.map((p, i) => {
    if (i % labelInterval !== 0) return '';
    const d = new Date(p.date);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });

  const data = {
    labels,
    datasets: [
      {
        data: dataPoints.map((p) => p.maxWeight),
        color: () => colors.accent,
        strokeWidth: 2,
      },
    ],
  };

  return (
    <View style={styles.container}>
      <Text variant="labelMedium" style={styles.title}>
        Max Weight (kg)
      </Text>
      <LineChart
        data={data}
        width={screenWidth}
        height={220}
        chartConfig={{
          backgroundColor: colors.surface,
          backgroundGradientFrom: colors.surface,
          backgroundGradientTo: colors.surface,
          decimalPlaces: 1,
          color: () => colors.accent,
          labelColor: () => colors.textSecondary,
          propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: colors.accent,
          },
          propsForBackgroundLines: {
            stroke: colors.borderSubtle,
          },
        }}
        bezier
        style={styles.chart}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.base,
  },
  title: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  chart: {
    borderRadius: 8,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
  },
});
