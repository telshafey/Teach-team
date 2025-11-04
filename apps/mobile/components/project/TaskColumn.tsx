import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Task, TaskStatus, TeamMember } from '@shared/types';
import TaskCard from './TaskCard';

interface TaskColumnProps {
    title: string;
    tasks: Task[];
    membersMap: Record<number, TeamMember>;
    onTaskPress: (task: Task) => void;
}

export const TaskColumn: React.FC<TaskColumnProps> = ({ title, tasks, membersMap, onTaskPress }) => {
  return (
    <View>
      <Text style={styles.header}>{title} ({tasks.length})</Text>
      {tasks.length > 0 ? (
        tasks.map(task => (
          <TaskCard 
            key={task.id} 
            task={task} 
            assignedMember={task.assignedTo ? membersMap[task.assignedTo] : undefined}
            onPress={onTaskPress}
          />
        ))
      ) : (
        <Text style={styles.emptyText}>لا توجد مهام في هذه القائمة.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 12,
    textAlign: 'right',
  },
  emptyText: {
      textAlign: 'center',
      color: '#64748b',
      padding: 16,
  }
});

export default TaskColumn;
