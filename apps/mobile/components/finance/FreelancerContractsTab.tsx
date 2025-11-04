import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { useAuth } from '@shared/contexts/AuthContext';
import { useSettingsContext } from '@shared/contexts/SettingsContext';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';
import { Project, FreelancerContract } from '@shared/types';
import StatusBadge from '../ui/StatusBadge';

const ContractCard = ({ project, membersMap, currency }: { project: Project, membersMap: Record<number, string>, currency: string }) => {
    const contract = project.freelancerContract;
    let value = '-';
    if(contract?.type === 'fixed') value = `${contract.amount} ${currency}`;
    if(contract?.type === 'hourly') value = `${contract.hourlyRate} ${currency}/ساعة`;
    if(contract?.type === 'per-task') value = `بالقطعة`;

    return (
        <View style={styles.card}>
            <Text style={styles.projectName}>{project.name}</Text>
            {contract ? (
                <>
                    <Text style={styles.detailText}>المستقل: {membersMap[contract.freelancerId]}</Text>
                    <Text style={styles.detailText}>نوع العقد: {contract.type}</Text>
                    <Text style={styles.detailText}>القيمة: {value}</Text>
                    <View style={styles.statusContainer}>
                        <StatusBadge status={contract.status} type="contract" />
                    </View>
                </>
            ) : (
                <Text style={styles.detailText}>لا يوجد عقد مستقل لهذا المشروع.</Text>
            )}
        </View>
    );
}

const FreelancerContractsTab = () => {
    const { teamMembers, hasPermission } = useTeamContext();
    const { currentUser } = useAuth();
    const { currency } = useSettingsContext();
    const { supabaseClient } = useSupabase();

    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: () => api.getAll<Project>(supabaseClient!, 'projects'),
        enabled: !!supabaseClient,
    });

    const isFreelancer = currentUser?.roleId === 'freelancer';
    const canManageContracts = hasPermission('approve_freelancer_contracts');

    const contractsToDisplay = useMemo(() => {
        if (isFreelancer) {
            return projects.filter(p => p.members?.some(m => m.teamMemberId === currentUser.id));
        }
        if (canManageContracts) {
            return projects.filter(p => p.freelancerContract);
        }
        return [];
    }, [projects, currentUser, isFreelancer, canManageContracts]);

    const membersMap = useMemo(() => teamMembers.reduce((acc, m) => ({ ...acc, [m.id]: m.name }), {} as Record<number, string>), [teamMembers]);

    return (
        <FlatList
            data={contractsToDisplay}
            renderItem={({ item }) => <ContractCard project={item} membersMap={membersMap} currency={currency} />}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.emptyText}>لا توجد عقود لعرضها.</Text>}
        />
    );
};

const styles = StyleSheet.create({
    list: { padding: 16 },
    card: { backgroundColor: 'white', borderRadius: 8, padding: 16, marginBottom: 12 },
    projectName: { fontSize: 16, fontWeight: 'bold', textAlign: 'right', marginBottom: 8 },
    detailText: { textAlign: 'right', marginBottom: 4 },
    statusContainer: { alignItems: 'flex-end', marginTop: 8 },
    emptyText: { textAlign: 'center', marginTop: 32, color: '#64748b' }
});


export default FreelancerContractsTab;
