import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Task, TeamMember } from '@shared/types';
import TaskColumn from './TaskColumn';

interface KanbanBoardProps {
    tasks: Task[];
    membersMap: Record<number, TeamMember>;
    onTaskClick: (task: Task) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, membersMap, onTaskClick }) => {
    const tasksByStatus = useMemo(() => {
        return {
            todo: tasks.filter(t => t.status === 'todo'),
            inprogress: tasks.filter(t => t.status === 'inprogress'),
            done: tasks.filter(t => t.status === 'done'),
        };
    }, [tasks]);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.columnWrapper}>
                <TaskColumn
                    title="المهام المطلوبة"
                    tasks={tasksByStatus.todo}
                    membersMap={membersMap}
                    onTaskPress={onTaskClick}
                />
            </View>
            <View style={styles.columnWrapper}>
                <TaskColumn
                    title="قيد التنفيذ"
                    tasks={tasksByStatus.inprogress}
                    membersMap={membersMap}
                    onTaskPress={onTaskClick}
                />
            </View>
            <View style={styles.columnWrapper}>
                <TaskColumn
                    title="المهام المكتملة"
                    tasks={tasksByStatus.done}
                    membersMap={membersMap}
                    onTaskPress={onTaskClick}
                />
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    columnWrapper: {
        marginBottom: 24,
    }
});

export default KanbanBoard;