import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ExpenseClaim } from '@shared/types';
import { useSettingsContext } from '@shared/contexts/SettingsContext';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import StatusBadge from '../ui/StatusBadge';

interface ExpenseClaimCardProps {
  claim: ExpenseClaim;
}

const ExpenseClaimCard: React.FC<ExpenseClaimCardProps> = ({ claim }) => {
    const { currency } = useSettingsContext();

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.amount}>{claim.amount.toLocaleString()} {currency}</Text>
                    <Text style={styles.date}>{format(parseISO(claim.date), 'd MMMM yyyy', { locale: arSA })}</Text>
                </View>
                <StatusBadge status={claim.status} type="request" />
            </View>
            <Text style={styles.description}>{claim.description}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    amount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
        textAlign: 'right',
    },
    date: {
        fontSize: 12,
        color: '#64748b',
        textAlign: 'right',
        marginTop: 2,
    },
    description: {
        fontSize: 14,
        color: '#475569',
        textAlign: 'right',
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingTop: 8,
    },
});

export default ExpenseClaimCard;
