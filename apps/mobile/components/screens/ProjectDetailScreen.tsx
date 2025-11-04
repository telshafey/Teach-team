import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';
import { Project, Task, TeamMember } from '@shared/types';
import KanbanBoard from '../project/KanbanBoard';
import { useTeamContext } from '@shared/contexts/TeamContext';
import TaskDetailModal from '../modals/TaskDetailModal';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useProjectContext } from '@shared/contexts/ProjectContext';

type RootStackParamList = {
    ProjectDetail: { projectId: string };
};

type ProjectDetailScreenRouteProp = RouteProp<RootStackParamList, 'ProjectDetail'>;

const ProjectDetailScreen: React.FC = () => {
    const route = useRoute<ProjectDetailScreenRouteProp>();
    const { projectId } = route.params;
    const { supabaseClient } = useSupabase();
    const { teamMembers } = useTeamContext();
    const { handleAddTask, handleUpdateTask } = useProjectContext();
    const navigation = useNavigation();

    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const { data: project, isLoading: isProjectLoading } = useQuery<Project | null>({
        queryKey: ['project', projectId],
        queryFn: () => api.getById<Project>(supabaseClient!, 'projects', projectId),
        enabled: !!supabaseClient,
    });

    const { data: tasks = [], isLoading: areTasksLoading } = useQuery<Task[]>({
        queryKey: ['tasks', projectId],
        queryFn: async () => {
            const { data, error } = await supabaseClient!.from('tasks').select('*').eq('project_id', projectId);
            if (error) throw error;
            return api.keysToCamel(data) as Task[];
        },
        enabled: !!supabaseClient,
    });

    const membersMap = useMemo(() => teamMembers.reduce((acc, m) => ({ ...acc, [m.id]: m }), {} as Record<number, TeamMember>), [teamMembers]);

    const isLoading = isProjectLoading || areTasksLoading;
    
    const handleTaskPress = (task: Task) => {
        setSelectedTask(task);
        setIsTaskModalOpen(true);
    };

    const handleOpenNewTaskModal = () => {
        setSelectedTask(null);
        setIsTaskModalOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedTask(null);
        setIsTaskModalOpen(false);
    };
    
    const handleSaveTask = async (taskData: Partial<Task>, isNew: boolean) => {
        if (isNew) {
            await handleAddTask(taskData as Omit<Task, 'id' | 'approvalStatus' | 'creatorId'>, projectId);
        } else if (selectedTask) {
            await handleUpdateTask({ ...taskData, id: selectedTask.id });
        }
        handleCloseModal();
    };


    if (isLoading) {
        return <View style={styles.center}><ActivityIndicator size="large" /></View>;
    }

    if (!project) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}><Text>لم يتم العثور على المشروع.</Text></View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-forward-outline" size={24} color="#0f172a" />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.header} numberOfLines={1}>{project.name}</Text>
                    <Text style={styles.description} numberOfLines={2}>{project.description}</Text>
                </View>
            </View>
            
            <KanbanBoard tasks={tasks} membersMap={membersMap} onTaskClick={handleTaskPress} />

            <TouchableOpacity style={styles.fab} onPress={handleOpenNewTaskModal}>
                <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>

            <TaskDetailModal 
                isVisible={isTaskModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveTask}
                task={selectedTask}
                project={project}
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
    headerContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
    headerTextContainer: {
        flex: 1,
    },
    header: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#0f172a',
        textAlign: 'right',
    },
    description: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'right',
        marginTop: 4,
    },
    backButton: {
        padding: 8,
        marginLeft: 8,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#0ea5e9',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
});

export default ProjectDetailScreen;