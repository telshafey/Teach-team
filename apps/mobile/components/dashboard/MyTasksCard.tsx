import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Task, Project } from '@shared/types';
import Card from '../ui/Card';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface MyTasksCardProps {
    tasks: Task[];
    projects: Project[];
    onTaskPress: (task: Task) => void;
    onViewAll: () => void;
}

const MyTasksCard: React.FC<MyTasksCardProps> = ({ tasks, projects, onTaskPress, onViewAll }) => {
    const projectsMap = React.useMemo(() => projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {} as Record<string, string>), [projects]);

    return (
        <Card title="المهام المفتوحة">
            <View>
                {tasks.length > 0 ? (
                    tasks.slice(0, 5).map(task => (
                        <TouchableOpacity key={task.id} style={styles.taskItem} onPress={() => onTaskPress(task)}>
                            <View>
                                <Text style={styles.taskTitle}>{task.title}</Text>
                                <Text style={styles.taskMeta}>
                                    {task.projectId ? projectsMap[task.projectId] : 'مهمة خاصة'}
                                    {task.dueDate && ` • ${format(parseISO(task.dueDate), 'd MMM', { locale: arSA })}`}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))
                ) : (
                    <Text style={styles.emptyText}>لا توجد مهام مفتوحة حاليًا.</Text>
                )}

                {tasks.length > 0 && (
                     <TouchableOpacity onPress={onViewAll} style={styles.viewAllButton}>
                        <Text style={styles.viewAllText}>عرض الكل</Text>
                    </TouchableOpacity>
                )}
            </View>
        </Card>
    );
};

const styles = StyleSheet.create({
    taskItem: {
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 6,
        marginBottom: 8,
    },
    taskTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1e293b',
        textAlign: 'right',
    },
    taskMeta: {
        fontSize: 12,
        color: '#64748b',
        textAlign: 'right',
        marginTop: 4,
    },
    emptyText: {
        textAlign: 'center',
        color: '#64748b',
        paddingVertical: 20,
    },
    viewAllButton: {
        marginTop: 8,
        padding: 8,
    },
    viewAllText: {
        textAlign: 'center',
        color: '#0ea5e9',
        fontWeight: 'bold',
    },
});

export default MyTasksCard;
