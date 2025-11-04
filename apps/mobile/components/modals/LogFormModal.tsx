import React, { useState, useEffect, useMemo } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { DailyLog, DailyLogFormData, Task, Project } from '@shared/types';
import { useAuth } from '@shared/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';
import { Picker } from '@react-native-picker/picker';

interface LogFormModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (logData: DailyLogFormData) => Promise<void>;
  log: DailyLog | null;
  date: string;
}

const LogFormModal: React.FC<LogFormModalProps> = ({ isVisible, onClose, onSave, log, date }) => {
    const { currentUser } = useAuth();
    const { supabaseClient } = useSupabase();

    const [formData, setFormData] = useState({
        hours: '',
        description: '',
        projectId: '',
        taskId: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    const { data: projects = [], isLoading: isLoadingProjects } = useQuery<Project[]>({
        queryKey: ['projects_list'],
        queryFn: () => api.getAll(supabaseClient!, 'projects', 'id, name'),
        enabled: !!supabaseClient && isVisible,
    });

    const { data: tasks = [], isLoading: isLoadingTasks } = useQuery<Task[]>({
        queryKey: ['tasks_list_for_log'],
        queryFn: () => api.getAll(supabaseClient!, 'tasks', 'id, title, project_id'),
        enabled: !!supabaseClient && isVisible,
    });
    
    const myTasks = useMemo(() => tasks.filter(t => t.assignedTo === currentUser?.id), [tasks, currentUser]);

    useEffect(() => {
        if (log) {
            setFormData({
                hours: log.hours.toString(),
                description: log.description,
                projectId: log.projectId || '',
                taskId: log.taskId || ''
            });
        } else {
            setFormData({ hours: '', description: '', projectId: '', taskId: '' });
        }
    }, [log, isVisible]);

    const handleSubmit = async () => {
        setIsSaving(true);
        try {
            await onSave({
                hours: parseFloat(formData.hours) || 0,
                description: formData.description,
                projectId: formData.projectId || undefined,
                taskId: formData.taskId || undefined,
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleTaskSelectionChange = (selectedTaskId: string) => {
        if (!selectedTaskId) {
            setFormData({ ...formData, taskId: '', projectId: '' });
            return;
        }
        const task = myTasks.find(t => t.id === selectedTaskId);
        if (task) {
            setFormData({ ...formData, taskId: task.id, projectId: task.projectId || '' });
        }
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>{log ? 'تعديل السجل' : 'إضافة سجل'}</Text>
                    
                    <ScrollView>
                        <Text style={styles.label}>عدد الساعات</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.hours}
                            onChangeText={(text) => setFormData({...formData, hours: text})}
                            keyboardType="numeric"
                        />
                        
                        <Text style={styles.label}>المهمة (اختياري)</Text>
                        <View style={styles.pickerContainer}>
                           <Picker
                                selectedValue={formData.taskId}
                                onValueChange={(itemValue) => handleTaskSelectionChange(itemValue)}
                            >
                                <Picker.Item label="-- عمل آخر / بدون مهمة --" value="" />
                                {myTasks.map(task => (
                                     <Picker.Item key={task.id} label={task.title} value={task.id} />
                                ))}
                            </Picker>
                        </View>

                        <Text style={styles.label}>الوصف</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={formData.description}
                            onChangeText={(text) => setFormData({...formData, description: text})}
                            multiline
                        />
                    </ScrollView>
                    
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.buttonCancel} onPress={onClose}>
                            <Text style={styles.buttonCancelText}>إلغاء</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.buttonSave} onPress={handleSubmit} disabled={isSaving}>
                            {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonSaveText}>حفظ</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 20,
    },
    modalView: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'right',
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'right',
        marginBottom: 8,
        color: '#334155',
    },
    input: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        fontSize: 16,
        marginBottom: 16,
        textAlign: 'right',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    pickerContainer: {
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        marginBottom: 16,
        justifyContent: 'center',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 24,
    },
    buttonCancel: {
        backgroundColor: '#e2e8f0',
        borderRadius: 8,
        padding: 14,
        flex: 1,
        alignItems: 'center',
        marginRight: 8,
    },
    buttonCancelText: {
        color: '#1e293b',
        fontWeight: 'bold',
        fontSize: 16,
    },
    buttonSave: {
        backgroundColor: '#0ea5e9',
        borderRadius: 8,
        padding: 14,
        flex: 1,
        alignItems: 'center',
        marginLeft: 8,
    },
    buttonSaveText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default LogFormModal;
