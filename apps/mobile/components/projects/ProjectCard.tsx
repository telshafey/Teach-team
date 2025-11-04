import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Project } from '@shared/types';
import { useTimeLogContext } from '@shared/contexts/TimeLogContext';
import { useSettingsContext } from '@shared/contexts/SettingsContext';
import StatusBadge from '../ui/StatusBadge';

interface ProjectCardProps {
  project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
    const { dailyLogs } = useTimeLogContext();
    const { currency } = useSettingsContext();
    const hoursLogged = useMemo(() => dailyLogs.filter(log => log.projectId === project.id).reduce((sum, log) => sum + log.hours, 0), [dailyLogs, project.id]);
    
    const budgetUsage = project.budgetHours ? (hoursLogged / project.budgetHours) * 100 : 0;

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.title}>{project.name}</Text>
                <StatusBadge status={project.status} type="project" />
            </View>
            
            <View style={styles.budgetContainer}>
                <View style={styles.budgetLabels}>
                    <Text style={styles.budgetText}>تقدم الميزانية (ساعات)</Text>
                    <Text style={styles.budgetText}>{budgetUsage.toFixed(0)}%</Text>
                </View>
                <View style={styles.progressBarBackground}>
                    <View style={[styles.progressBar, { width: `${Math.min(budgetUsage, 100)}%`, backgroundColor: budgetUsage > 90 ? '#ef4444' : '#0ea5e9' }]} />
                </View>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    <Text style={styles.footerValue}>{hoursLogged.toFixed(1)}</Text> / {project.budgetHours || '∞'} ساعة
                </Text>
                {project.budgetAmount && (
                    <Text style={styles.footerText}>
                        <Text style={styles.footerValue}>{project.budgetAmount.toLocaleString()}</Text> {currency}
                    </Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1.41,
        elevation: 2,
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
        flex: 1,
        textAlign: 'right',
        marginRight: 8,
    },
    budgetContainer: {
        marginBottom: 16,
    },
    budgetLabels: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    budgetText: {
        fontSize: 12,
        color: '#64748b',
    },
    progressBarBackground: {
        height: 8,
        backgroundColor: '#e2e8f0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 4,
    },
    footer: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingTop: 12,
    },
    footerText: {
        fontSize: 14,
        color: '#475569',
    },
    footerValue: {
        fontWeight: 'bold',
        color: '#1e293b',
    },
});

export default ProjectCard;
