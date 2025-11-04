import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ChartData {
  label: string;
  value: number;
}

interface BarChartProps {
  title: string;
  data: ChartData[];
}

const BarChart: React.FC<BarChartProps> = ({ title, data }) => {
  const maxValue = Math.max(...data.map(d => d.value), 0);

  return (
    <View>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chart}>
        {data.length > 0 ? data.map(item => (
          <View key={item.label} style={styles.barRow}>
            <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
            <View style={styles.barContainer}>
              <View style={[styles.bar, { width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }]} />
            </View>
            <Text style={styles.value}>{item.value.toFixed(1)}</Text>
          </View>
        )) : <Text style={styles.emptyText}>لا توجد بيانات للعرض.</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'right',
    color: '#1e293b',
  },
  chart: {
    // container for all bars
  },
  barRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    width: 100,
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
  },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    marginHorizontal: 8,
    flexDirection: 'row-reverse',
  },
  bar: {
    height: '100%',
    backgroundColor: '#0ea5e9',
    borderRadius: 10,
  },
  value: {
    width: 50,
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'left',
  },
  emptyText: {
      textAlign: 'center',
      color: '#64748b',
      paddingVertical: 20,
  }
});

export default BarChart;
