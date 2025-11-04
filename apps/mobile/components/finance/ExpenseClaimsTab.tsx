import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRequestsContext } from '@shared/contexts/RequestsContext';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { ExpenseClaimStatus } from '@shared/types';
import { useAuth } from '@shared/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import ExpenseClaimCard from './ExpenseClaimCard';

interface ExpenseClaimsTabProps {
    onNewClaim: () => void;
}

const ExpenseClaimsTab: React.FC<ExpenseClaimsTabProps> = ({ onNewClaim }) => {
    const { expenseClaims } = useRequestsContext();
    const { hasPermission } = useTeamContext();
    const { currentUser } = useAuth();
    const [statusFilter, setStatusFilter] = useState<'all' | ExpenseClaimStatus>('all');

    const claimsToDisplay = useMemo(() => {
        let claims = expenseClaims;
        if (!hasPermission('approve_expense_claims')) {
            claims = claims.filter(c => c.teamMemberId === currentUser?.id);
        }
        if (statusFilter === 'all') return claims.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return claims.filter(c => c.status === statusFilter).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenseClaims, statusFilter, currentUser, hasPermission]);
    
    const filterOptions: {label: string, value: 'all' | ExpenseClaimStatus}[] = [
        {label: 'الكل', value: 'all'},
        {label: 'قيد المراجعة', value: 'pending'},
        {label: 'معتمدة', value: 'approved'},
        {label: 'مرفوضة', value: 'rejected'},
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.filters}>
                    {filterOptions.map(opt => (
                        <TouchableOpacity key={opt.value} onPress={() => setStatusFilter(opt.value)} style={[styles.filterButton, statusFilter === opt.value && styles.activeFilterButton]}>
                            <Text style={[styles.filterButtonText, statusFilter === opt.value && styles.activeFilterButtonText]}>{opt.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                 {hasPermission('submit_expenses') && (
                    <TouchableOpacity onPress={onNewClaim} style={styles.newButton}>
                        <Ionicons name="add" size={20} color="white" />
                        <Text style={styles.newButtonText}>طلب جديد</Text>
                    </TouchableOpacity>
                )}
            </View>
            <FlatList
                data={claimsToDisplay}
                renderItem={({ item }) => <ExpenseClaimCard claim={item} />}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={<Text style={styles.emptyText}>لا توجد طلبات صرف.</Text>}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    filters: {
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        marginBottom: 16,
    },
    filterButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#e2e8f0',
        marginHorizontal: 4,
    },
    activeFilterButton: {
        backgroundColor: '#0ea5e9',
    },
    filterButtonText: {
        color: '#334155',
    },
    activeFilterButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    newButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0ea5e9',
        paddingVertical: 10,
        borderRadius: 8,
    },
    newButtonText: {
        color: 'white',
        fontWeight: 'bold',
        marginRight: 8,
    },
    list: {
        padding: 16,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 32,
        color: '#64748b',
    },
});

export default ExpenseClaimsTab;
