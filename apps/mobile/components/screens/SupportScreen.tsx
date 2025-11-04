import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSupportContext } from '@shared/contexts/SupportContext';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { useAuth } from '@shared/contexts/AuthContext';
import { SupportTicket, TicketStatus } from '@shared/types';
import StatusBadge from '../ui/StatusBadge';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import SupportTicketFormModal from '../modals/SupportTicketFormModal';
import SupportTicketDetailModal from '../modals/SupportTicketDetailModal';

const SupportScreen: React.FC = () => {
    const { tickets, isLoading } = useSupportContext();
    const { hasPermission } = useTeamContext();
    const { currentUser } = useAuth();
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('open');

    const canManage = hasPermission('manage_support_tickets');

    const filteredTickets = useMemo(() => {
        let displayTickets = canManage ? tickets : tickets.filter(t => t.creatorId === currentUser?.id);
        if (statusFilter !== 'all') {
            displayTickets = displayTickets.filter(t => t.status === statusFilter);
        }
        return displayTickets;
    }, [tickets, currentUser, canManage, statusFilter]);
    
    const filterOptions: {label: string, value: 'all' | TicketStatus}[] = [
        {label: 'الكل', value: 'all'},
        {label: 'مفتوحة', value: 'open'},
        {label: 'قيد المعالجة', value: 'in-progress'},
        {label: 'مغلقة', value: 'closed'},
    ];

    if (isLoading) {
        return <View style={styles.center}><ActivityIndicator size="large" /></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={styles.header}>الدعم الفني</Text>
                <TouchableOpacity style={styles.addButton} onPress={() => setIsFormModalOpen(true)}>
                    <Ionicons name="add" size={20} color="white" />
                    <Text style={styles.addButtonText}>تذكرة جديدة</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.filterContainer}>
                {filterOptions.map(opt => (
                    <TouchableOpacity key={opt.value} onPress={() => setStatusFilter(opt.value)} style={[styles.filterButton, statusFilter === opt.value && styles.activeFilterButton]}>
                        <Text style={[styles.filterButtonText, statusFilter === opt.value && styles.activeFilterButtonText]}>{opt.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={filteredTickets}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={<Text style={styles.emptyText}>لا توجد تذاكر دعم.</Text>}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.ticketItem} onPress={() => setSelectedTicket(item)}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.ticketSubject} numberOfLines={1}>{item.subject}</Text>
                            <Text style={styles.ticketDate}>آخر تحديث: {format(parseISO(item.updatedAt), 'd MMM, p', { locale: arSA })}</Text>
                        </View>
                        <StatusBadge status={item.status} type="support_ticket_status" />
                    </TouchableOpacity>
                )}
            />

            <SupportTicketFormModal isVisible={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} />

            {selectedTicket && (
                <SupportTicketDetailModal isVisible={!!selectedTicket} onClose={() => setSelectedTicket(null)} ticket={selectedTicket} />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerContainer: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    header: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
    addButton: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#0ea5e9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
    addButtonText: { color: 'white', fontWeight: 'bold', fontSize: 14, marginRight: 4 },
    filterContainer: { flexDirection: 'row-reverse', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16 },
    filterButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#e2e8f0', marginHorizontal: 4 },
    activeFilterButton: { backgroundColor: '#0ea5e9' },
    filterButtonText: { color: '#334155' },
    activeFilterButtonText: { color: 'white', fontWeight: 'bold' },
    list: { paddingHorizontal: 16 },
    ticketItem: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 8, marginBottom: 12 },
    ticketSubject: { fontSize: 16, fontWeight: '600', textAlign: 'right', marginBottom: 4 },
    ticketDate: { fontSize: 12, color: '#64748b', textAlign: 'right' },
    emptyText: { textAlign: 'center', marginTop: 32, color: '#64748b' }
});

export default SupportScreen;
