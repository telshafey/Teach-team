import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { DailyLog, Project } from '@shared/types';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';
import { Ionicons } from '@expo/vector-icons';


interface DailyLogDetailModalProps {
  isVisible: boolean;
  onClose: () => void;
  date: string;
  logs: DailyLog[];
  onAdd: () => void;
  onEdit: (log: DailyLog) => void;
  onDelete: (logId: string) => Promise<void>;
  isEditable: boolean;
}

const DailyLogDetailModal: React.FC<DailyLogDetailModalProps> = ({ isVisible, onClose, date, logs, onAdd, onEdit, onDelete, isEditable }) => {
    const { supabaseClient } = useSupabase();

    const { data: projects = [] } = useQuery<Project[]>({
        queryKey: ['projects_list'],
        queryFn: () => api.getAll(supabaseClient!, 'projects', 'id, name'),
        enabled: !!supabaseClient && isVisible,
    });
    
    const handleDelete = (log: DailyLog) => {
        Alert.alert(
            "تأكيد الحذف",
            `هل أنت متأكد من رغبتك في حذف هذا السجل؟`,
            [
                { text: "إلغاء", style: "cancel" },
                { text: "حذف", onPress: () => onDelete(log.id), style: "destructive" }
            ]
        );
    };

    if (!isVisible) return null;
    
    const projectsMap = projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {} as Record<string, string>);
    const formattedDate = date ? format(parseISO(date), 'eeee, d MMMM yyyy', { locale: arSA }) : '';
    const totalHours = logs.reduce((sum, log) => sum + log.hours, 0);

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.modalTitle}>سجلات يوم {formattedDate}</Text>
                            <Text style={styles.modalSubtitle}>إجمالي الساعات: {totalHours.toFixed(1)} ساعة</Text>
                        </View>
                        {isEditable && (
                            <TouchableOpacity onPress={onAdd} style={styles.addButton}>
                                <Text style={styles.addButtonText}>+ إضافة</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                     {!isEditable && <Text style={styles.warningText}>انتهت الفترة المسموح بها لتعديل سجلات هذا اليوم.</Text>}
                    
                    <FlatList
                        data={logs}
                        keyExtractor={(item) => item.id}
                        style={styles.list}
                        ListEmptyComponent={<Text style={styles.emptyText}>لا توجد سجلات لهذا اليوم.</Text>}
                        renderItem={({ item }) => (
                            <View style={styles.logItem}>
                                <View style={styles.logContent}>
                                    <View style={styles.logHeader}>
                                        <Text style={styles.logHours}>{item.hours} ساعات</Text>
                                        <Text style={styles.logProject}>{projectsMap[item.projectId || ''] || "عمل آخر"}</Text>
                                    </View>
                                    <Text style={styles.logDescription}>{item.description}</Text>
                                </View>
                                {isEditable && (
                                    <View style={styles.actionsContainer}>
                                        <TouchableOpacity onPress={() => onEdit(item)} style={styles.actionButton}>
                                            <Ionicons name="pencil" size={18} color="#475569" />
                                        </TouchableOpacity>
                                         <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionButton}>
                                            <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )}
                    />
                    
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                    >
                        <Text style={styles.closeButtonText}>إغلاق</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        paddingBottom: 40,
        maxHeight: '70%',
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'right',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'right',
    },
    addButton: {
        backgroundColor: '#0ea5e9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    addButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    warningText: {
        fontSize: 12,
        color: '#d97706',
        fontWeight: '600',
        textAlign: 'right',
        marginBottom: 12,
    },
    list: {
        marginBottom: 20,
    },
    logItem: {
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
    },
    logContent: {
        flex: 1,
    },
    logHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 8,
    },
    logHours: {
        backgroundColor: '#e0f2fe',
        color: '#0369a1',
        fontWeight: 'bold',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        fontSize: 12,
        overflow: 'hidden',
    },
    logProject: {
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
    logDescription: {
        fontSize: 14,
        color: '#475569',
        textAlign: 'right',
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        padding: 4,
        marginLeft: 8,
    },
    emptyText: {
        textAlign: 'center',
        color: '#64748b',
        marginTop: 20,
    },
    closeButton: {
        backgroundColor: '#e2e8f0',
        borderRadius: 8,
        padding: 14,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#1e293b',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default DailyLogDetailModal;