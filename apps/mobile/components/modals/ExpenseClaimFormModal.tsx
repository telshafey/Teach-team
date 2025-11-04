import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { ExpenseClaim } from '@shared/types';
import { useAuth } from '@shared/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';
import { Project } from '@shared/types';
import { Picker } from '@react-native-picker/picker';
import { format } from 'date-fns';

interface ExpenseClaimFormModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (claimData: Omit<ExpenseClaim, 'id' | 'status'>) => Promise<void>;
}

const ExpenseClaimFormModal: React.FC<ExpenseClaimFormModalProps> = ({ isVisible, onClose, onSave }) => {
    const { currentUser } = useAuth();
    const { supabaseClient } = useSupabase();
    
    const [formData, setFormData] = useState({
        amount: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
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
            setFormData({
                amount: '',
                description: '',
                date: format(new Date(), 'yyyy-MM-dd'),
                projectId: '',
            });
        }
    }, [isVisible]);

    const handleSubmit = async () => {
        if (!formData.amount || !formData.description) {
            Alert.alert('خطأ', 'يرجى ملء جميع الحقول المطلوبة.');
            return;
        }
        if (!currentUser) return;

        setIsSaving(true);
        try {
            await onSave({
                teamMemberId: currentUser.id,
                amount: parseFloat(formData.amount) || 0,
                description: formData.description,
                date: formData.date,
                projectId: formData.projectId || undefined,
            });
        } catch (error) {
            console.error(error);
            Alert.alert('خطأ', 'فشل تقديم طلب الصرف.');
        } finally {
            setIsSaving(false);
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
                    <Text style={styles.modalTitle}>تقديم طلب صرف</Text>
                    
                    <ScrollView>
                        <Text style={styles.label}>المبلغ</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.amount}
                            onChangeText={(text) => setFormData({...formData, amount: text})}
                            keyboardType="numeric"
                            placeholder="0.00"
                        />
                        
                        <Text style={styles.label}>التاريخ</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.date}
                            onChangeText={(text) => setFormData({...formData, date: text})}
                            placeholder="YYYY-MM-DD"
                        />

                        <Text style={styles.label}>المشروع (اختياري)</Text>
                         <View style={styles.pickerContainer}>
                           <Picker
                                selectedValue={formData.projectId}
                                onValueChange={(itemValue) => setFormData({...formData, projectId: itemValue as string})}
                            >
                                <Picker.Item label="غير مرتبط بمشروع" value="" />
                                {projects.map(project => (
                                     <Picker.Item key={project.id} label={project.name} value={project.id} />
                                ))}
                            </Picker>
                        </View>

                        <Text style={styles.label}>الوصف</Text>
                        <TextInput
                            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                            value={formData.description}
                            onChangeText={(text) => setFormData({...formData, description: text})}
                            multiline
                            placeholder="تفاصيل المصروف..."
                        />
                    </ScrollView>
                    
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.buttonCancel} onPress={onClose}>
                            <Text style={styles.buttonCancelText}>إلغاء</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.buttonSave} onPress={handleSubmit} disabled={isSaving}>
                            {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonSaveText}>إرسال</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 },
    modalView: { backgroundColor: 'white', borderRadius: 20, padding: 24, maxHeight: '80%' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'right', marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '500', textAlign: 'right', marginBottom: 8, color: '#334155' },
    input: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, fontSize: 16, marginBottom: 16, textAlign: 'right', borderWidth: 1, borderColor: '#cbd5e1' },
    pickerContainer: { backgroundColor: '#f1f5f9', borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#cbd5e1', justifyContent: 'center' },
    buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
    buttonCancel: { backgroundColor: '#e2e8f0', borderRadius: 8, padding: 14, flex: 1, alignItems: 'center', marginRight: 8 },
    buttonCancelText: { color: '#1e293b', fontWeight: 'bold', fontSize: 16 },
    buttonSave: { backgroundColor: '#0ea5e9', borderRadius: 8, padding: 14, flex: 1, alignItems: 'center', marginLeft: 8 },
    buttonSaveText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});

export default ExpenseClaimFormModal;
