import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '@shared/contexts/AuthContext';
import { useTimeLogContext } from '@shared/contexts/TimeLogContext';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';
import { Task, Meeting, Project, TeamMember } from '@shared/types';
import { isSameDay, isThisWeek, parseISO, differenceInCalendarDays } from 'date-fns';
import StatCard from '../ui/StatCard';
import { useTeamContext } from '@shared/contexts/TeamContext';
import PunchClockCard from '../dashboard/PunchClockCard';
import MyTasksCard from '../dashboard/MyTasksCard';
import UpcomingMeetingCard from '../meetings/UpcomingMeetingCard';
import { useNavigation } from '@react-navigation/native';
import TaskDetailModal from '../modals/TaskDetailModal';
import { useProjectContext } from '@shared/contexts/ProjectContext';
import { usePendingApprovals } from '@shared/hooks/usePendingApprovals';

const DashboardScreen: React.FC = () => {
    const { currentUser } = useAuth();
    const { dailyLogs } = useTimeLogContext();
    const { supabaseClient } = useSupabase();
    const { teamMembers } = useTeamContext();
    const navigation = useNavigation<any>();
    const { handleUpdateTask, handleAddTask } = useProjectContext();
    const { count: pendingApprovalsCount } = usePendingApprovals();


    const [viewingTask, setViewingTask] = useState<Task | null>(null);

    const { data: meetings = [] } = useQuery<Meeting[]>({
        queryKey: ['meetings'],
        queryFn: () => api.getAll(supabaseClient!, 'meetings'),
        enabled: !!supabaseClient,
    });
    
    const { data: projects = [] } = useQuery<Project[]>({
        queryKey: ['projects_list'],
        queryFn: () => api.getAll(supabaseClient!, 'projects', 'id, name'),
        enabled: !!supabaseClient,
    });

    const { data: tasks = [], isLoading: isTasksLoading } = useQuery<Task[]>({
        queryKey: ['tasks'],
        queryFn: () => api.getAll(supabaseClient!, 'tasks'),
        enabled: !!supabaseClient,
    });

    const myLogs = useMemo(() => dailyLogs.filter(log => log.teamMemberId === currentUser?.id), [dailyLogs, currentUser]);
    
    const { hasPermission } = useTeamContext();
    const canViewAllTasks = hasPermission('manage_team') || hasPermission('view_reports') || hasPermission('manage_projects');
    const myTasks = useMemo(() => {
        if (!currentUser) return [];
        if (canViewAllTasks) return tasks;
        return tasks.filter(task => task.assignedTo === currentUser.id || task.creatorId === currentUser.id);
    }, [tasks, currentUser, canViewAllTasks]);

    const myOpenTasks = useMemo(() => myTasks.filter(task => task.status !== 'done'), [myTasks]);
    
    const myMeetings = useMemo(() => {
        if (!currentUser) return [];
        return meetings.filter(m => m.members?.includes(currentUser.id) && m.endTime && new Date(m.endTime) > new Date());
    }, [meetings, currentUser]);

    const { todayHours, thisWeekHours } = useMemo(() => {
        const now = new Date();
        return {
            todayHours: myLogs.filter(l => isSameDay(new Date(l.date), now)).reduce((sum, l) => sum + l.hours, 0),
            thisWeekHours: myLogs.filter(l => isThisWeek(new Date(l.date), { weekStartsOn: 0 })).reduce((sum, l) => sum + l.hours, 0),
        };
    }, [myLogs]);

    const isEmployee = currentUser?.employmentType === 'full-time' || currentUser?.employmentType === 'part-time';
    
    const handleJoinMeeting = (meeting: Meeting) => {
        // This would navigate to a WebView for the meeting
        console.log('Joining meeting:', meeting.title);
    };

    const handleSaveTask = async (taskData: Partial<Task>, isNew: boolean) => {
        if (isNew) {
            await handleAddTask(taskData as Omit<Task, 'id' | 'approvalStatus' | 'creatorId'>, taskData.projectId);
        } else if (viewingTask) {
            await handleUpdateTask({ ...taskData, id: viewingTask.id });
        }
        setViewingTask(null);
    };


    if (isTasksLoading) {
        return <View style={styles.center}><ActivityIndicator size="large" /></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.header}>لوحة التحكم</Text>
                <Text style={styles.subtitle}>مرحباً {currentUser?.name}، إليك نظرة على يومك.</Text>

                <View style={styles.statsContainer}>
                    <StatCard label="ساعات اليوم" value={todayHours.toFixed(1)} />
                    <StatCard label="ساعات الأسبوع" value={thisWeekHours.toFixed(1)} />
                    <StatCard label="مهام مفتوحة" value={myOpenTasks.length} />
                </View>

                {pendingApprovalsCount > 0 && (
                    <TouchableOpacity onPress={() => navigation.navigate('MoreTab', { screen: 'Approvals' })}>
                         <StatCard 
                            label="موافقات معلقة" 
                            value={pendingApprovalsCount} 
                            style={{backgroundColor: '#fef3c7', marginBottom: 24}}
                            valueStyle={{color: '#b45309'}}
                            labelStyle={{color: '#d97706'}}
                        />
                    </TouchableOpacity>
                )}


                {isEmployee && <PunchClockCard />}

                <MyTasksCard 
                    tasks={myOpenTasks} 
                    projects={projects}
                    onTaskPress={(task) => setViewingTask(task)} 
                    onViewAll={() => navigation.navigate('TasksTab')} 
                />

                <View style={{marginTop: 16}}>
                    <Text style={styles.cardTitle}>الاجتماعات القادمة</Text>
                    {myMeetings.length > 0 ? myMeetings.map(meeting => (
                         <UpcomingMeetingCard
                            key={meeting.id}
                            meeting={meeting}
                            project={meeting.projectId ? projects.find(p => p.id === meeting.projectId) : undefined}
                            participants={(meeting.members || []).map(id => teamMembers.find(m => m.id === id)).filter(Boolean) as TeamMember[]}
                            onJoinMeeting={handleJoinMeeting}
                        />
                    )) : (
                        <View style={styles.emptyMeeting}>
                            <Text style={styles.emptyText}>لا توجد اجتماعات قادمة.</Text>
                        </View>
                    )}
                </View>

            </ScrollView>

            {viewingTask && (
                <TaskDetailModal 
                    isVisible={!!viewingTask}
                    onClose={() => setViewingTask(null)}
                    onSave={handleSaveTask}
                    task={viewingTask}
                    project={projects.find(p => p.id === viewingTask.projectId)}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f1f5f9',
    },
    scrollContainer: {
        padding: 16,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0f172a',
        textAlign: 'right',
    },
    subtitle: {
        fontSize: 16,
        color: '#64748b',
        marginBottom: 24,
        textAlign: 'right',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 24,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'right',
        marginBottom: 12,
        color: '#1e293b'
    },
    emptyMeeting: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: '#64748b'
    }
});

export default DashboardScreen;
