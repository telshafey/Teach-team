import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, SectionList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';
import { Task, Project } from '@shared/types';
import { useAuth } from '@shared/contexts/AuthContext';
import StatusBadge from '../ui/StatusBadge';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { arSA } from 'date-fns/locale';

const TaskItem: React.FC<{ task: Task; projects: Project[] }> = ({ task, projects }) => {
    const project = projects.find(p => p.id === task.projectId);
    const isOverdue = task.dueDate && !isToday(parseISO(task.dueDate)) && isPast(parseISO(task.dueDate));

    return (
        <TouchableOpacity style={styles.taskItem}>
            <View style={styles.taskContent}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <View style={styles.taskMeta}>
                    {project && <Text style={styles.taskProject}>{project.name}</Text>}
                    {task.dueDate && (
                         <Text style={[styles.taskDueDate, isOverdue && styles.overdueText]}>
                            {format(parseISO(task.dueDate), 'd MMM', { locale: arSA })}
                        </Text>
                    )}
                </View>
            </View>
            <StatusBadge status={task.status} type="task" />
        </TouchableOpacity>
    );
};

const TasksScreen: React.FC = () => {
    const { supabaseClient } = useSupabase();
    const { currentUser } = useAuth();

    const { data: projects = [] } = useQuery<Project[]>({
        queryKey: ['projects_list'],
        queryFn: () => api.getAll(supabaseClient!, 'projects', 'id, name'),
        enabled: !!supabaseClient,
    });

    const { data: tasks = [], isLoading } = useQuery<Task[]>({
        queryKey: ['tasks'],
        queryFn: () => api.getAll(supabaseClient!, 'tasks'),
        enabled: !!supabaseClient && !!currentUser,
    });

    const taskSections = useMemo(() => {
        if (!currentUser) return [];

        const myTasks = tasks.filter(t => t.assignedTo === currentUser.id);
        const inProgress = myTasks.filter(t => t.status === 'inprogress');
        const todo = myTasks.filter(t => t.status === 'todo');

        const sections = [];
        if (inProgress.length > 0) {
            sections.push({ title: 'قيد التنفيذ', data: inProgress.sort((a,b) => (a.dueDate && b.dueDate) ? new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime() : a.dueDate ? -1 : 1) });
        }
        if (todo.length > 0) {
            sections.push({ title: 'المهام المطلوبة', data: todo.sort((a,b) => (a.dueDate && b.dueDate) ? new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime() : a.dueDate ? -1 : 1) });
        }
        return sections;

    }, [tasks, currentUser]);


    if (isLoading) {
        return <View style={styles.center}><ActivityIndicator size="large" /></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.header}>مهامي</Text>
            <SectionList
                sections={taskSections}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <TaskItem task={item} projects={projects} />}
                renderSectionHeader={({ section: { title } }) => (
                    <Text style={styles.sectionHeader}>{title}</Text>
                )}
                contentContainerStyle={styles.list}
                ListEmptyComponent={<Text style={styles.emptyText}>لا توجد مهام مفتوحة مسندة إليك.</Text>}
            />
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
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0f172a',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        textAlign: 'right',
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: '600',
        color: '#475569',
        backgroundColor: '#f1f5f9',
        paddingVertical: 8,
        paddingHorizontal: 16,
        textAlign: 'right',
    },
    list: {
        paddingBottom: 16,
    },
    taskItem: {
        backgroundColor: 'white',
        padding: 16,
        marginHorizontal: 16,
        borderRadius: 8,
        marginBottom: 12,
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    taskContent: {
        flex: 1,
        marginRight: 12,
    },
    taskTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        textAlign: 'right',
    },
    taskMeta: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginTop: 4,
    },
    taskProject: {
        fontSize: 12,
        color: '#64748b',
    },
    taskDueDate: {
        fontSize: 12,
        color: '#64748b',
        marginLeft: 12,
    },
    overdueText: {
        color: '#dc2626',
        fontWeight: '600',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 32,
        color: '#64748b',
    },
});

export default TasksScreen;
