import React, { useState, useMemo, useEffect } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { MeetingFormData, Project, TeamMember } from '@shared/types';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';
import { Picker } from '@react-native-picker/picker';

interface MeetingFormModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (data: MeetingFormData) => Promise<void>;
}

const MeetingFormModal: React.FC<MeetingFormModalProps> = ({ isVisible, onClose, onSave }) => {
    const { teamMembers } = useTeamContext();
    const { supabaseClient } = useSupabase();

    const [formData, setFormData] = useState({
        title: '',
        members: [] as number[],
        startTime: '', // YYYY-MM-DDTHH:mm
        duration: '30',
        projectId: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    const { data: projects = [] } = useQuery<Project[]>({
        queryKey: ['projects_list'],
        queryFn: () => api.getAll(supabaseClient!, 'projects', 'id, name'),
        enabled: !!supabaseClient && isVisible,
    });
    
    useEffect(() => {
        if (isVisible) {
            const now = new Date();
            now.setSeconds(0);
            now.setMilliseconds(0);
            const defaultStartTime = `${format(now, "yyyy-MM-dd")}T${format(now, "HH:mm")}`;
            setFormData({
                title: '',
                members: [],
                startTime: defaultStartTime,
                duration: '30',
                projectId: '',
            });
        }
    }, [isVisible]);

    const handleSubmit = async () => {
        if (!formData.title.trim()) {
            Alert.alert('خطأ', 'عنوان الاجتماع مطلوب.');
            return;
        }
        if (new Date(formData.startTime) < new Date()) {
            Alert.alert('خطأ', 'لا يمكن جدولة اجتماع في وقت قد مضى.');
            return;
        }

        setIsSaving(true);
        try {
            await onSave({ 
                ...formData,
                duration: parseInt(formData.duration, 10),
                projectId: formData.projectId || undefined,
            });
            onClose();
        } catch (error: any) {
            Alert.alert('خطأ', error.message || 'فشل جدولة الاجتماع. يرجى المحاولة مرة أخرى.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleParticipantChange = (memberId: number) => {
        setFormData(prev => ({
            ...prev,
            members: prev.members.includes(memberId) 
                ? prev.members.filter(id => id !== memberId) 
                : [...prev.members, memberId]
        }));
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
                    <Text style={styles.modalTitle}>جدولة اجتماع جديد</Text>
                    <ScrollView>
                        <Text style={styles.label}>عنوان الاجتماع</Text>
                        <TextInput style={styles.input} value={formData.title} onChangeText={text => setFormData({...formData, title: text})} placeholder="عنوان الاجتماع" placeholderTextColor="#94a3b8" />
                        
                        <Text style={styles.label}>وقت البدء (YYYY-MM-DD HH:mm)</Text>
                        <TextInput style={styles.input} value={formData.startTime.replace('T', ' ')} onChangeText={text => setFormData({...formData, startTime: text.replace(' ', 'T')})} />

                        <Text style={styles.label}>المدة (بالدقائق)</Text>
                         <View style={styles.pickerContainer}>
                            <Picker selectedValue={formData.duration} onValueChange={itemValue => setFormData({...formData, duration: itemValue})}>
                                {[5, 15, 30, 45, 60, 90, 120].map(d => <Picker.Item key={d} label={`${d} دقيقة`} value={d.toString()} />)}
                            </Picker>
                        </View>
                        
                        <Text style={styles.label}>المشروع (اختياري)</Text>
                        <View style={styles.pickerContainer}>
                            <Picker selectedValue={formData.projectId} onValueChange={itemValue => setFormData({...formData, projectId: itemValue as string})}>
                                <Picker.Item label="اجتماع عام" value="" />
                                {projects.map(p => <Picker.Item key={p.id} label={p.name} value={p.id} />)}
                            </Picker>
                        </View>

                        <Text style={styles.label}>المشاركون</Text>
                        <View style={styles.participantsContainer}>
                            {teamMembers.map(member => (
                                <TouchableOpacity key={member.id} onPress={() => handleParticipantChange(member.id)} style={styles.participantItem}>
                                    <Text style={styles.checkbox}>{formData.members.includes(member.id) ? '☑' : '☐'}</Text>
                                    <Text style={styles.participantName}>{member.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.buttonCancel} onPress={onClose}><Text style={styles.buttonCancelText}>إلغاء</Text></TouchableOpacity>
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
        maxHeight: '90%',
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
        borderWidth: 1,
        borderColor: '#cbd5e1',
    },
    pickerContainer: {
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        justifyContent: 'center',
    },
    participantsContainer: {
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 8,
        padding: 8,
        maxHeight: 150,
    },
    participantItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 8,
    },
    checkbox: {
        marginLeft: 12,
        fontSize: 18,
    },
    participantName: {
        fontSize: 16,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0'
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

export default MeetingFormModal;
