import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { useSettingsContext } from '@shared/contexts/SettingsContext';
import { Penalty, PenaltyStatus } from '@shared/types';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import StatusBadge from '../ui/StatusBadge';

interface PenaltyCardProps {
    penalty: Penalty;
    memberName: string | undefined;
    currency: string;
    onReview: (penalty: Penalty) => void;
    canReview: boolean;
}

const PenaltyCard: React.FC<PenaltyCardProps> = ({ penalty, memberName, currency, onReview, canReview }) => (
    <View style={styles.card}>
        <View style={styles.cardHeader}>
            <View style={{flex: 1}}>
                <Text style={styles.memberName}>{memberName || 'غير معروف'}</Text>
                <Text style={styles.date}>{format(parseISO(penalty.date), 'd MMMM yyyy', { locale: arSA })}</Text>
            </View>
            <StatusBadge status={penalty.status} type="penalty" />
        </View>
        <Text style={styles.reason}>{penalty.reason}</Text>
        <View style={styles.footer}>
            <Text style={styles.amount}>{penalty.amount} {currency}</Text>
            {canReview && penalty.status === 'pending' && (
                <TouchableOpacity onPress={() => onReview(penalty)}>
                    <Text style={styles.reviewButton}>مراجعة</Text>
                </TouchableOpacity>
            )}
        </View>
    </View>
);

interface PenaltiesTabProps {
    penalties: Penalty[];
    onReview: (penalty: Penalty) => void;
    onNew: () => void;
}

const PenaltiesTab: React.FC<PenaltiesTabProps> = ({ penalties, onReview, onNew }) => {
    const { teamMembers, hasPermission } = useTeamContext();
    const { currency } = useSettingsContext();
    const [statusFilter, setStatusFilter] = useState<'all' | PenaltyStatus>('all');

    const membersMap = useMemo(() => teamMembers.reduce((acc, m) => ({ ...acc, [m.id]: m.name }), {} as Record<number, string>), [teamMembers]);

    const filteredPenalties = useMemo(() => {
        if (statusFilter === 'all') return penalties;
        return penalties.filter(p => p.status === statusFilter);
    }, [penalties, statusFilter]);

    const filterOptions: { label: string; value: 'all' | PenaltyStatus }[] = [
        { label: 'الكل', value: 'all' },
        { label: 'قيد المراجعة', value: 'pending' },
        { label: 'معتمدة', value: 'approved' },
        { label: 'مرفوضة', value: 'rejected' },
    ];
    
    const canIssue = hasPermission('issue_penalties');
    const canApprove = hasPermission('approve_penalties');

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
                {canIssue && (
                    <TouchableOpacity onPress={onNew} style={styles.newButton}>
                        <Ionicons name="add" size={20} color="white" />
                        <Text style={styles.newButtonText}>إصدار جزاء</Text>
                    </TouchableOpacity>
                )}
            </View>
            <FlatList
                data={filteredPenalties}
                renderItem={({ item }) => (
                    <PenaltyCard
                        penalty={item}
                        memberName={membersMap[item.teamMemberId]}
                        currency={currency}
                        onReview={onReview}
                        canReview={canApprove}
                    />
                )}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={<Text style={styles.emptyText}>لا توجد جزاءات.</Text>}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    filters: { flexDirection: 'row-reverse', justifyContent: 'center', marginBottom: 16 },
    filterButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#e2e8f0', marginHorizontal: 4 },
    activeFilterButton: { backgroundColor: '#0ea5e9' },
    filterButtonText: { color: '#334155' },
    activeFilterButtonText: { color: 'white', fontWeight: 'bold' },
    newButton: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', backgroundColor: '#dc2626', paddingVertical: 10, borderRadius: 8 },
    newButtonText: { color: 'white', fontWeight: 'bold', marginRight: 8 },
    list: { padding: 16 },
    card: { backgroundColor: 'white', borderRadius: 8, padding: 16, marginBottom: 12 },
    cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    memberName: { fontSize: 16, fontWeight: 'bold', textAlign: 'right' },
    date: { fontSize: 12, color: '#64748b', textAlign: 'right' },
    reason: { fontSize: 14, color: '#475569', textAlign: 'right', marginBottom: 12 },
    footer: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    amount: { fontSize: 16, fontWeight: 'bold', color: '#dc2626' },
    reviewButton: { color: '#0ea5e9', fontWeight: 'bold' },
    emptyText: { textAlign: 'center', marginTop: 32, color: '#64748b' },
});

export default PenaltiesTab;
