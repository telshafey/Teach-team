import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface LineChartProps {
  data: { label: string; value: number }[];
}

const CHART_HEIGHT = 150;

const LineChart: React.FC<LineChartProps> = ({ data }) => {
  if (data.length < 2) {
    return <Text style={styles.emptyText}>تحتاج إلى نقطتي بيانات على الأقل لرسم المخطط.</Text>;
  }

  const maxValue = Math.max(...data.map(d => d.value), 0);
  const CHART_WIDTH = Math.max(300, data.length * 25);

  return (
    <View style={styles.container}>
        <View style={styles.yAxisLabels}>
            <Text style={styles.axisLabel}>{maxValue > 0 ? maxValue.toFixed(0) : ''}</Text>
            <Text style={styles.axisLabel}>0</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{flexDirection: 'row-reverse'}}>
            <View>
                <View style={[styles.chartArea, { width: CHART_WIDTH }]}>
                    {/* Horizontal lines */}
                    <View style={[styles.gridLine, { bottom: 0 }]} />
                    <View style={[styles.gridLine, { bottom: CHART_HEIGHT / 2 }]} />
                    <View style={[styles.gridLine, { top: 0 }]} />

                    {/* Data points */}
                    {data.map((point, index) => {
                        const xPercentage = (index / (data.length - 1)) * 100;
                        const yPercentage = maxValue > 0 ? (point.value / maxValue) * 100 : 0;
                        
                        return (
                            <View
                                key={index}
                                style={[
                                    styles.dot,
                                    {
                                        right: `${xPercentage}%`,
                                        bottom: `${yPercentage}%`,
                                        // Adjust position to center the dot on the point
                                        transform: [{ translateX: 4 }, { translateY: 4 }],
                                    },
                                ]}
                            />
                        );
                    })}
                </View>
                <View style={[styles.xAxisLabels, { width: CHART_WIDTH }]}>
                    <Text style={styles.axisLabel}>{data[data.length - 1].label}</Text>
                    <Text style={styles.axisLabel}>{data[0].label}</Text>
                </View>
            </View>
        </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row-reverse',
        paddingVertical: 10,
    },
    yAxisLabels: {
        height: CHART_HEIGHT,
        justifyContent: 'space-between',
        paddingLeft: 8,
        alignItems: 'flex-start',
    },
    chartArea: {
        height: CHART_HEIGHT,
        position: 'relative',
    },
    xAxisLabels: {
        height: 20,
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    axisLabel: {
        fontSize: 10,
        color: '#64748b',
    },
    gridLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: '#e2e8f0',
    },
    dot: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#0ea5e9',
        borderWidth: 1,
        borderColor: 'white'
    },
    emptyText: {
        textAlign: 'center',
        color: '#64748b',
        paddingVertical: 20,
    },
});

export default LineChart;
