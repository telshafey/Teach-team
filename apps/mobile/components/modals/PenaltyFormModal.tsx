import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { PenaltyFormData } from '@shared/types';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { format } from 'date-fns';
import { Picker } from '@react-native-picker/picker';

interface PenaltyFormModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (formData: PenaltyFormData) => Promise<void>;
}

const PenaltyFormModal: React.FC<PenaltyFormModalProps> = ({ isVisible, onClose, onSave }) => {
    const { teamMembers } = useTeamContext();
    const [formData, setFormData] = useState({
        teamMemberId: '',
        amount: '',
        reason: '',
        date: format(new Date(), 'yyyy-MM-dd'),
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setFormData({ teamMemberId: '', amount: '', reason: '', date: format(new Date(), 'yyyy-MM-dd') });
        }
    }, [isVisible]);

    const handleSubmit = async () => {
        if (!formData.teamMemberId || !formData.amount || !formData.reason) {
            Alert.alert('خطأ', 'يرجى ملء جميع الحقول.');
            return;
        }

        setIsSaving(true);
        try {
            await onSave({
                ...formData,
                teamMemberId: Number(formData.teamMemberId),
                amount: Number(formData.amount),
            });
        } catch (error) {
            Alert.alert('خطأ', 'فشل إصدار الجزاء.');
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
                    <Text style={styles.modalTitle}>إصدار جزاء جديد</Text>
                    <ScrollView>
                        <Text style={styles.label}>الموظف</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={formData.teamMemberId}
                                onValueChange={(itemValue) => setFormData({ ...formData, teamMemberId: itemValue as string })}
                            >
                                <Picker.Item label="-- اختر موظف --" value="" />
                                {teamMembers.map(m => <Picker.Item key={m.id} label={m.name} value={m.id.toString()} />)}
                            </Picker>
                        </View>
                        
                        <Text style={styles.label}>مبلغ الخصم</Text>
                        <TextInput style={styles.input} value={formData.amount} onChangeText={text => setFormData({...formData, amount: text})} keyboardType="numeric" />
                        
                        <Text style={styles.label}>تاريخ الواقعة</Text>
                        <TextInput style={styles.input} value={formData.date} onChangeText={text => setFormData({...formData, date: text})} placeholder="YYYY-MM-DD" />
                        
                        <Text style={styles.label}>السبب</Text>
                        <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} value={formData.reason} onChangeText={text => setFormData({...formData, reason: text})} multiline />
                    </ScrollView>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.buttonCancel} onPress={onClose}><Text style={styles.buttonCancelText}>إلغاء</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.buttonSave, {backgroundColor: '#dc2626'}]} onPress={handleSubmit} disabled={isSaving}>
                            {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonSaveText}>إصدار</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 },
    modalView: { backgroundColor: 'white', borderRadius: 20, padding: 24, maxHeight: '90%' },
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

export default PenaltyFormModal;
