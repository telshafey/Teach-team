import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { useTimeLogContext } from '@shared/contexts/TimeLogContext';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';
import { Task } from '@shared/types';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

type RootStackParamList = {
    TeamList: undefined;
    TeamDetail: { memberId: number };
};

type TeamDetailScreenRouteProp = RouteProp<RootStackParamList, 'TeamDetail'>;

const InfoRow: React.FC<{ label: string, value: string | undefined }> = ({ label, value }) => (
    <View style={styles.infoRow}>
        <Text style={styles.infoValue}>{value || '-'}</Text>
        <Text style={styles.infoLabel}>{label}</Text>
    </View>
);

const TeamDetailScreen: React.FC = () => {
    const route = useRoute<TeamDetailScreenRouteProp>();
    const { memberId } = route.params;
    const { teamMembers, roles, isLoading: isTeamLoading } = useTeamContext();
    const { dailyLogs, isLoading: areLogsLoading } = useTimeLogContext();
    const { supabaseClient } = useSupabase();

    const member = useMemo(() => teamMembers.find(m => m.id === memberId), [teamMembers, memberId]);
    const role = useMemo(() => roles.find(r => r.id === member?.roleId), [roles, member]);
    const manager = useMemo(() => teamMembers.find(m => m.id === member?.reportsTo), [teamMembers, member]);

    const { data: tasks = [], isLoading: areTasksLoading } = useQuery<Task[]>({
        queryKey: ['tasks'],
        queryFn: () => api.getAll(supabaseClient!, 'tasks'),
        enabled: !!supabaseClient,
    });
    
    const memberData = useMemo(() => {
        if (!member) return null;
        const now = new Date();
        const startOfCurrentMonth = startOfMonth(now);
        const endOfCurrentMonth = endOfMonth(now);

        const memberLogs = dailyLogs.filter(log => log.teamMemberId === member.id);
        const memberTasks = tasks.filter(task => task.assignedTo === member.id);

        const currentMonthHours = memberLogs
            .filter(log => isWithinInterval(parseISO(log.date), { start: startOfCurrentMonth, end: endOfCurrentMonth }))
            .reduce((sum, log) => sum + log.hours, 0);
        
        const openTasks = memberTasks.filter(t => t.status !== 'done');

        return { currentMonthHours, openTasks, recentLogs: memberLogs.slice(-5) };
    }, [member, dailyLogs, tasks]);


    if (isTeamLoading || areLogsLoading || areTasksLoading || !member) {
        return <View style={styles.center}><ActivityIndicator size="large" /></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.profileHeader}>
                    <Image source={{ uri: member.avatarUrl }} style={styles.avatar} />
                    <Text style={styles.name}>{member.name}</Text>
                    <Text style={styles.role}>{role?.name}</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>معلومات الموظف</Text>
                    <InfoRow label="البريد الإلكتروني" value={member.email} />
                    <InfoRow label="المدير المباشر" value={manager?.name} />
                    <InfoRow label="نوع الدوام" value={member.employmentType} />
                    {member.salary && <InfoRow label="الراتب" value={`${member.salary.toLocaleString()}`} />}
                    {member.hourlyRate && <InfoRow label="سعر الساعة" value={`${member.hourlyRate}`} />}
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>ملخص الأداء هذا الشهر</Text>
                     <InfoRow label="الساعات المسجلة" value={memberData?.currentMonthHours.toFixed(1)} />
                     <InfoRow label="المهام المفتوحة" value={memberData?.openTasks.length.toString()} />
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>آخر الأنشطة</Text>
                    {memberData?.recentLogs.length === 0 && <Text style={styles.emptyText}>لا توجد أنشطة مسجلة.</Text>}
                    {memberData?.recentLogs.map(log => (
                        <View key={log.id} style={styles.logItem}>
                            <Text style={styles.logText} numberOfLines={1}><Text style={styles.logHours}>{log.hours.toFixed(1)} ساعة:</Text> {log.description}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f1f5f9',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContainer: {
        padding: 16,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 12,
    },
    name: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    role: {
        fontSize: 16,
        color: '#64748b',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'right',
        color: '#334155'
    },
    infoRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    infoLabel: {
        fontSize: 14,
        color: '#64748b',
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1e293b',
    },
    logItem: {
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 6,
        marginBottom: 8,
    },
    logText: {
        fontSize: 14,
        color: '#334155',
        textAlign: 'right',
    },
    logHours: {
        fontWeight: 'bold',
    },
    emptyText: {
        textAlign: 'center',
        color: '#64748b'
    }
});

export default TeamDetailScreen;
