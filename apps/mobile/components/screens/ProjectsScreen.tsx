import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';
import { Project } from '@shared/types';
import ProjectCard from '../projects/ProjectCard';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
    ProjectsList: undefined;
    ProjectDetail: { projectId: string };
};

type ProjectsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProjectsList'>;


const ProjectsScreen: React.FC = () => {
    const { supabaseClient } = useSupabase();
    const navigation = useNavigation<ProjectsScreenNavigationProp>();
    
    const { data: projects = [], isLoading } = useQuery<Project[]>({
        queryKey: ['projects'],
        queryFn: () => api.getAll(supabaseClient!, 'projects'),
        enabled: !!supabaseClient,
    });

    if (isLoading) {
        return <View style={styles.center}><ActivityIndicator size="large" /></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={styles.header}>المشاريع</Text>
            </View>
            <FlatList
                data={projects}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => navigation.navigate('ProjectDetail', { projectId: item.id })}>
                        <ProjectCard project={item} />
                    </TouchableOpacity>
                )}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={<Text style={styles.emptyText}>لا توجد مشاريع لعرضها.</Text>}
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
        padding: 16,
        paddingBottom: 8,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0f172a',
        textAlign: 'right',
    },
    list: {
        padding: 16,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 32,
        color: '#64748b',
    },
});

export default ProjectsScreen;
