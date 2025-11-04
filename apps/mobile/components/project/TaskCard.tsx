import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Task, TeamMember } from '@shared/types';
import { useTimeLogContext } from '@shared/contexts/TimeLogContext';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';

interface TaskCardProps {
  task: Task;
  assignedMember: TeamMember | undefined;
  onPress: (task: Task) => void;
}

const DueDateIndicator: React.FC<{ dueDate: string | undefined }> = ({ dueDate }) => {
    if (!dueDate) return null;
    const parsedDate = parseISO(dueDate);
    const isUrgent = isPast(parsedDate) && !isToday(parsedDate);
    const isDueToday = isToday(parsedDate);

    const color = isUrgent ? '#ef4444' : isDueToday ? '#f59e0b' : '#64748b';

    return (
        <View style={styles.dueDateContainer}>
            <Ionicons name="notifications-outline" size={14} color={color} />
            <Text style={[styles.metaText, { color, marginLeft: 4 }]}>
                {format(parsedDate, 'd MMM', { locale: arSA })}
            </Text>
        </View>
    );
};

const TaskCard: React.FC<TaskCardProps> = React.memo(({ task, assignedMember, onPress }) => {
  const { dailyLogs } = useTimeLogContext();
  const taskHours = dailyLogs.filter(l => l.taskId === task.id).reduce((sum, log) => sum + log.hours, 0);

  return (
    <TouchableOpacity onPress={() => onPress(task)} style={styles.card}>
      <View style={styles.header}>
        <DueDateIndicator dueDate={task.dueDate} />
        <View style={styles.hoursContainer}>
            <Ionicons name="time-outline" size={14} color="#64748b" />
            <Text style={[styles.metaText, { marginLeft: 4 }]}>{taskHours.toFixed(1)}h</Text>
        </View>
      </View>

      <Text style={styles.title}>{task.title}</Text>
      
      <View style={styles.footer}>
        {assignedMember ? (
            <Image source={{ uri: assignedMember.avatarUrl }} style={styles.avatar} />
        ) : <View style={styles.avatarPlaceholder}/>}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1.41,
        elevation: 2,
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    dueDateContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
    hoursContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
    metaText: {
        fontSize: 12,
        color: '#64748b',
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1e293b',
        textAlign: 'right',
        marginBottom: 12,
    },
    footer: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    avatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    avatarPlaceholder: {
        width: 24,
        height: 24,
    }
});

export default TaskCard;