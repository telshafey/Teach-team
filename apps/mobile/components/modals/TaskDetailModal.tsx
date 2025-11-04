import React, { useState, useMemo, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Task, Project, TeamMember, TaskStatus } from '@shared/types';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { useAuth } from '@shared/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import StatusBadge from '../ui/StatusBadge';
import { Picker } from '@react-native-picker/picker';

interface TaskDetailModalProps {
    isVisible: boolean;
    onClose: () => void;
    task: Task | null; // null for create mode
    project?: Project | null;
    onSave: (taskData: Partial<Task>, isNew: boolean) => Promise<void>;
}

const DetailRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <View style={styles.detailRow}>
        <View style={{ flex: 1 }}>{children}</View>
        <Text style={styles.detailLabel}>{label}:</Text>
    </View>
);

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ isVisible, onClose, task, project, onSave }) => {
    const { teamMembers } = useTeamContext();
    const { currentUser } = useAuth();
    const isNew = !task;
    const [isEditing, setIsEditing] = useState(isNew);
    const [isSaving, setIsSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        title: task?.title || '',
        projectId: task?.projectId || project?.id || '',
        assignedTo: task?.assignedTo?.toString() || currentUser?.id.toString() || '',
        dueDate: task?.dueDate ? format(parseISO(task.dueDate), 'yyyy-MM-dd') : '',
        status: task?.status || 'todo' as TaskStatus,
    });

    useEffect(() => {
        if (isVisible) {
            setIsEditing(isNew);
            setFormData({
                title: task?.title || '',
                projectId: task?.projectId || project?.id || '',
                assignedTo: task?.assignedTo?.toString() || currentUser?.id.toString() || '',
                dueDate: task?.dueDate ? format(parseISO(task.dueDate), 'yyyy-MM-dd') : '',
                status: task?.status || 'todo' as TaskStatus,
            });
        }
    }, [isVisible, task, project, currentUser]);
    
    const assignedMember = useMemo(() => teamMembers.find(m => m.id.toString() === (isEditing ? formData.assignedTo : task?.assignedTo?.toString())), [teamMembers, isEditing, formData.assignedTo, task]);

    const handleSave = async () => {
        setIsSaving(true);
        await onSave({
            ...formData,
            assignedTo: formData.assignedTo ? parseInt(formData.assignedTo, 10) : undefined,
            dueDate: formData.dueDate || undefined,
        }, isNew);
        setIsSaving(false);
    };

    const renderViewMode = () => (
        <>
            <DetailRow label="مسندة إلى">{assignedMember ? <Text style={styles.detailValue}>{assignedMember.name}</Text> : <Text style={styles.detailValue}>غير مسندة</Text>}</DetailRow>
            <DetailRow label="تاريخ الاستحقاق"><Text style={styles.detailValue}>{task?.dueDate ? format(parseISO(task.dueDate), 'd MMMM yyyy', { locale: arSA }) : 'غير محدد'}</Text></DetailRow>
            <DetailRow label="الحالة"><StatusBadge status={task!.status} type="task" /></DetailRow>
        </>
    );
    
    const renderEditMode = () => (
        <>
            <Text style={styles.label}>عنوان المهمة</Text>
            <TextInput style={styles.input} value={formData.title} onChangeText={text => setFormData({...formData, title: text})} />
            
            <Text style={styles.label}>مسندة إلى</Text>
            <View style={styles.pickerContainer}>
                <Picker selectedValue={formData.assignedTo} onValueChange={itemValue => setFormData({...formData, assignedTo: itemValue as string})}>
                    <Picker.Item label="غير مسندة" value="" />
                    {teamMembers.map(m => <Picker.Item key={m.id} label={m.name} value={m.id.toString()} />)}
                </Picker>
            </View>

            <Text style={styles.label}>تاريخ الاستحقاق (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={formData.dueDate} onChangeText={text => setFormData({...formData, dueDate: text})} />
            
            <Text style={styles.label}>الحالة</Text>
            <View style={styles.pickerContainer}>
                <Picker selectedValue={formData.status} onValueChange={itemValue => setFormData({...formData, status: itemValue as TaskStatus})}>
                    <Picker.Item label="لم تبدأ" value="todo" />
                    <Picker.Item label="قيد التنفيذ" value="inprogress" />
                    <Picker.Item label="مكتملة" value="done" />
                </Picker>
            </View>
        </>
    );

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.centeredView}>
                <View style={styles.modalView}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#64748b" />
                        </TouchableOpacity>
                        <Text style={styles.title} numberOfLines={1}>{isEditing ? (isNew ? 'مهمة جديدة' : 'تعديل المهمة') : task?.title}</Text>
                        {!isNew && !isEditing && (
                            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
                                <Ionicons name="pencil" size={20} color="#0ea5e9" />
                            </TouchableOpacity>
                        )}
                    </View>
                    <ScrollView>
                        {isEditing ? renderEditMode() : renderViewMode()}
                    </ScrollView>
                    {isEditing && (
                        <View style={styles.actionsContainer}>
                            <TouchableOpacity style={styles.cancelButton} onPress={isNew ? onClose : () => setIsEditing(false)}>
                                <Text style={styles.cancelButtonText}>إلغاء</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
                                {isSaving ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>حفظ</Text>}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalView: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, height: '85%' },
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    title: { fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'right', marginHorizontal: 10 },
    closeButton: {},
    editButton: {},
    detailRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    detailLabel: { fontSize: 14, color: '#64748b', width: 100 },
    detailValue: { fontSize: 14, fontWeight: '600' },
    label: { fontSize: 14, fontWeight: '500', textAlign: 'right', marginBottom: 8, color: '#334155' },
    input: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, fontSize: 16, marginBottom: 16, textAlign: 'right', borderWidth: 1, borderColor: '#cbd5e1' },
    pickerContainer: { backgroundColor: '#f1f5f9', borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#cbd5e1' },
    actionsContainer: { flexDirection: 'row-reverse', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
    saveButton: { flex: 1, backgroundColor: '#0ea5e9', padding: 14, borderRadius: 8, alignItems: 'center', marginLeft: 8 },
    saveButtonText: { color: 'white', fontWeight: 'bold' },
    cancelButton: { flex: 1, backgroundColor: '#e2e8f0', padding: 14, borderRadius: 8, alignItems: 'center', marginRight: 8 },
    cancelButtonText: { color: '#334155', fontWeight: 'bold' },
});

export default TaskDetailModal;
