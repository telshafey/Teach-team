import React, { useMemo } from 'react';
import { StyleSheet, ScrollView, Text } from 'react-native';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { useTimeLogContext } from '@shared/contexts/TimeLogContext';
import Card from '../ui/Card';
import BarChart from '../ui/BarChart';
import PieChart from '../ui/PieChart';
import LineChart from '../ui/LineChart';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';
import { Project, Task } from '@shared/types';

const AnalyticsScreen: React.FC = () => {
    const { teamMembers } = useTeamContext();
    const { dailyLogs } = useTimeLogContext();
    const { supabaseClient } = useSupabase();

    const { data: projects = [] } = useQuery<Project[]>({
      queryKey: ['projects'],
      queryFn: () => api.getAll(supabaseClient!, 'projects'),
      enabled: !!supabaseClient,
    });
    
    const { data: tasks = [] } = useQuery<Task[]>({
      queryKey: ['tasks'],
      queryFn: () => api.getAll(supabaseClient!, 'tasks'),
      enabled: !!supabaseClient,
    });
    
    // Simplified: no date range filter for mobile
    const filteredDailyLogs = dailyLogs;

    const projectHoursData = useMemo(() => {
        return projects.map(project => ({
            label: project.name,
            value: filteredDailyLogs.filter(l => l.projectId === project.id).reduce((sum, l) => sum + l.hours, 0)
        })).filter(item => item.value > 0).sort((a,b) => b.value - a.value).slice(0, 10);
    }, [projects, filteredDailyLogs]);

    const memberHoursData = useMemo(() => {
        return teamMembers.map(member => ({
            label: member.name,
            value: filteredDailyLogs.filter(l => l.teamMemberId === member.id).reduce((sum, l) => sum + l.hours, 0)
        })).filter(item => item.value > 0).sort((a,b) => b.value - a.value).slice(0, 10);
    }, [teamMembers, filteredDailyLogs]);

    const taskStatusData = useMemo(() => {
        const statusCounts = tasks.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        return [
            { label: 'لم تبدأ', value: statusCounts.todo || 0, color: '#94a3b8' },
            { label: 'قيد التنفيذ', value: statusCounts.inprogress || 0, color: '#38bdf8' },
            { label: 'مكتملة', value: statusCounts.done || 0, color: '#22c55e' },
        ];
    }, [tasks]);

    const dailyProductivityData = useMemo(() => {
        const endDate = new Date();
        const startDate = subDays(endDate, 29);

        const rangeDays = eachDayOfInterval({ start: startDate, end: endDate });
        const productivityMap: Record<string, number> = {};

        rangeDays.forEach(day => {
            productivityMap[format(day, 'yyyy-MM-dd')] = 0;
        });
        
        dailyLogs.forEach(log => {
            if (productivityMap.hasOwnProperty(log.date)) {
                productivityMap[log.date] += log.hours;
            }
        });

        return Object.entries(productivityMap).map(([date, hours]: [string, number]) => ({
            label: format(new Date(date), 'd MMM'),
            value: hours
        }));
    }, [dailyLogs]);

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.header}>التحليلات</Text>
            <BarChart title="توزيع ساعات العمل على المشاريع" data={projectHoursData} />
            <BarChart title="توزيع ساعات العمل على أعضاء الفريق" data={memberHoursData} />
            <Card title="حالة المهام">
                <PieChart data={taskStatusData} />
            </Card>
            <Card title="إجمالي الساعات المسجلة (آخر 30 يوم)">
                <LineChart data={dailyProductivityData} />
            </Card>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#f1f5f9',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'right',
        marginBottom: 16,
        color: '#0f172a',
    },
});

export default AnalyticsScreen;
