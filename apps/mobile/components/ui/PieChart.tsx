import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
}

const PieChart: React.FC<PieChartProps> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return <Text style={styles.emptyText}>لا توجد بيانات للعرض.</Text>;
  }

  return (
    <View>
      {data.map(item => (
        <View key={item.label} style={styles.legendItem}>
          <Text style={styles.value}>{((item.value / total) * 100).toFixed(1)}%</Text>
          <Text style={styles.label}>{item.label}</Text>
          <View style={[styles.colorBox, { backgroundColor: item.color }]} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
    emptyText: {
        textAlign: 'center',
        color: '#64748b',
        paddingVertical: 20,
    },
    legendItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 8,
        paddingVertical: 4,
    },
    colorBox: {
        width: 12,
        height: 12,
        borderRadius: 2,
        marginLeft: 8,
    },
    label: {
        flex: 1,
        textAlign: 'right',
        color: '#334155'
    },
    value: {
        fontWeight: 'bold',
        color: '#1e293b',
        width: 60,
        textAlign: 'left'
    }
});


export default PieChart;
