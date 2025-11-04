import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { useTimeLogContext } from '@shared/contexts/TimeLogContext';
import { useRequestsContext } from '@shared/contexts/RequestsContext';
import { useSettingsContext } from '@shared/contexts/SettingsContext';
import { calculateProjectCostBreakdown } from '@shared/utils/costs';
import { Project } from '@shared/types';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';
import { Ionicons } from '@expo/vector-icons';

const ProjectFinancialsRow: React.FC<{ project: Project }> = ({ project }) => {
    const { teamMembers } = useTeamContext();
    const { dailyLogs } = useTimeLogContext();
    const { expenseClaims, overtimeRequests } = useRequestsContext();
    const { currency, siteSettings } = useSettingsContext();
    const [isOpen, setIsOpen] = useState(false);

    const costData = useMemo(() => {
        return calculateProjectCostBreakdown(project, teamMembers, dailyLogs, expenseClaims, overtimeRequests, siteSettings);
    }, [project, teamMembers, dailyLogs, expenseClaims, overtimeRequests, siteSettings]);

    return (
        <View style={styles.rowContainer}>
            <TouchableOpacity onPress={() => setIsOpen(!isOpen)} style={styles.rowHeader}>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#64748b" />
                <Text style={styles.rowTotal}>{costData.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}</Text>
                <Text style={styles.rowProjectName}>{project.name}</Text>
            </TouchableOpacity>
            {isOpen && (
                <View style={styles.detailsContainer}>
                    <View style={styles.detailRow}><Text style={styles.detailValue}>{costData.employeeCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}</Text><Text style={styles.detailLabel}>تكلفة الموظفين:</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailValue}>{costData.freelancerCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}</Text><Text style={styles.detailLabel}>تكلفة المستقلين:</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailValue}>{costData.expenseCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}</Text><Text style={styles.detailLabel}>تكلفة المصروفات:</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailValue}>{costData.overtimeCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}</Text><Text style={styles.detailLabel}>تكلفة الساعات الإضافية:</Text></View>
                </View>
            )}
        </View>
    );
};

const ProjectFinancialsTab: React.FC = () => {
    const { supabaseClient } = useSupabase();
    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: () => api.getAll<Project>(supabaseClient!, 'projects'),
        enabled: !!supabaseClient,
    });

    return (
        <FlatList
            data={projects}
            renderItem={({ item }) => <ProjectFinancialsRow project={item} />}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.emptyText}>لا توجد مشاريع لعرضها.</Text>}
        />
    );
};

const styles = StyleSheet.create({
    list: {
        padding: 16,
    },
    rowContainer: {
        backgroundColor: 'white',
        borderRadius: 8,
        marginBottom: 12,
        overflow: 'hidden',
    },
    rowHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    rowProjectName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        textAlign: 'right',
        marginRight: 12,
    },
    rowTotal: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0f172a',
        marginLeft: 12,
    },
    detailsContainer: {
        backgroundColor: '#f8fafc',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    detailRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: 14,
        color: '#64748b',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#334155',
    },
    emptyText: {
        textAlign: 'center',
        color: '#64748b',
        marginTop: 20,
    }
});

export default ProjectFinancialsTab;
