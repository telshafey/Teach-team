import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface StatCardProps {
    label: string;
    value: string | number;
    style?: ViewStyle;
    valueStyle?: TextStyle;
    labelStyle?: TextStyle;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, style, valueStyle, labelStyle }) => {
    return (
        <View style={[styles.card, style]}>
            <Text style={[styles.value, valueStyle]}>{value}</Text>
            <Text style={[styles.label, labelStyle]}>{label}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        marginHorizontal: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1.41,
        elevation: 2,
    },
    value: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0ea5e9', // sky-500
    },
    label: {
        fontSize: 14,
        color: '#64748b', // slate-500
        marginTop: 4,
    },
});

export default StatCard;
