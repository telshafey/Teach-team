import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { useTimeLogContext } from '@shared/contexts/TimeLogContext';
import { useRequestsContext } from '@shared/contexts/RequestsContext';
import { useSettingsContext } from '@shared/contexts/SettingsContext';
import { calculateProjectCostBreakdown } from '@shared/utils/costs';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';
import { Project } from '@shared/types';
import StatCard from '../ui/StatCard';
import BarChart from '../ui/BarChart';

const FinanceOverviewTab: React.FC = () => {
    const { teamMembers } = useTeamContext();
    const { dailyLogs } = useTimeLogContext();
    const { expenseClaims, overtimeRequests } = useRequestsContext();
    const { currency, siteSettings } = useSettingsContext();
    const { supabaseClient } = useSupabase();

    const { data: projects = [] } = useQuery<Project[]>({
        queryKey: ['projects'],
        queryFn: () => api.getAll(supabaseClient!, 'projects'),
        enabled: !!supabaseClient,
    });

    const totalSalaries = useMemo(() => {
        return teamMembers
            .filter(m => m.salary)
            .reduce((sum, m) => sum + (m.salary || 0), 0);
    }, [teamMembers]);

    const totalApprovedExpenses = useMemo(() => {
        return expenseClaims
            .filter(e => e.status === 'approved')
            .reduce((sum, e) => sum + e.amount, 0);
    }, [expenseClaims]);

    const projectCosts = useMemo(() => {
        return projects.map(project => {
            const { totalCost } = calculateProjectCostBreakdown(project, teamMembers, dailyLogs, expenseClaims, overtimeRequests, siteSettings);
            return { label: project.name, value: totalCost };
        });
    }, [projects, dailyLogs, teamMembers, expenseClaims, overtimeRequests, siteSettings]);

    const top5CostlyProjects = useMemo(() => {
        return projectCosts.sort((a, b) => b.value - a.value).slice(0, 5);
    }, [projectCosts]);
    
    const totalProjectCosts = projectCosts.reduce((sum, p) => sum + p.value, 0);

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.statsRow}>
                <StatCard label="إجمالي الرواتب" value={`${totalSalaries.toLocaleString()} ${currency}`} />
            </View>
             <View style={styles.statsRow}>
                <StatCard label="إجمالي المصروفات" value={`${totalApprovedExpenses.toLocaleString()} ${currency}`} />
                 <StatCard label="تكاليف المشاريع" value={`${totalProjectCosts.toLocaleString(undefined, {maximumFractionDigits: 0})} ${currency}`} />
            </View>
            <View style={styles.chartContainer}>
                <BarChart title="أكثر المشاريع تكلفة" data={top5CostlyProjects} />
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    chartContainer: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
    }
});

export default FinanceOverviewTab;
