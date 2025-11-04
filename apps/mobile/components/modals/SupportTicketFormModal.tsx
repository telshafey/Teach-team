import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSupportContext } from '@shared/contexts/SupportContext';
import { TicketCategory, TicketPriority } from '@shared/types';
import { Picker } from '@react-native-picker/picker';

interface SupportTicketFormModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const SupportTicketFormModal: React.FC<SupportTicketFormModalProps> = ({ isVisible, onClose }) => {
    const { createTicket } = useSupportContext();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        subject: '',
        description: '',
        category: 'technical' as TicketCategory,
        priority: 'medium' as TicketPriority,
    });
    
    useEffect(() => {
        if(isVisible) {
            setFormData({ subject: '', description: '', category: 'technical', priority: 'medium' });
        }
    }, [isVisible]);

    const handleSubmit = async () => {
        if (!formData.subject.trim() || !formData.description.trim()) {
            Alert.alert('خطأ', 'يرجى ملء جميع الحقول.');
            return;
        }
        setIsSaving(true);
        try {
            await createTicket(formData);
            onClose();
        } catch (error) {
            // Error toast is handled in context
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
                    <Text style={styles.modalTitle}>فتح تذكرة دعم جديدة</Text>
                    <ScrollView>
                        <Text style={styles.label}>الموضوع</Text>
                        <TextInput style={styles.input} value={formData.subject} onChangeText={text => setFormData({ ...formData, subject: text })} />
                        
                        <Text style={styles.label}>الفئة</Text>
                        <View style={styles.pickerContainer}>
                            <Picker selectedValue={formData.category} onValueChange={itemValue => setFormData({ ...formData, category: itemValue as TicketCategory })}>
                                <Picker.Item label="مشكلة تقنية" value="technical" />
                                <Picker.Item label="الفواتير والدفع" value="billing" />
                                <Picker.Item label="استفسار عام" value="general" />
                            </Picker>
                        </View>
                        
                        <Text style={styles.label}>الأولوية</Text>
                        <View style={styles.pickerContainer}>
                            <Picker selectedValue={formData.priority} onValueChange={itemValue => setFormData({ ...formData, priority: itemValue as TicketPriority })}>
                                <Picker.Item label="منخفضة" value="low" />
                                <Picker.Item label="متوسطة" value="medium" />
                                <Picker.Item label="عالية" value="high" />
                                <Picker.Item label="عاجلة" value="urgent" />
                            </Picker>
                        </View>
                        
                        <Text style={styles.label}>وصف المشكلة</Text>
                        <TextInput style={[styles.input, { height: 120, textAlignVertical: 'top' }]} value={formData.description} onChangeText={text => setFormData({ ...formData, description: text })} multiline />
                    </ScrollView>
                    
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.buttonCancel} onPress={onClose}><Text style={styles.buttonCancelText}>إلغاء</Text></TouchableOpacity>
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
    modalView: { backgroundColor: 'white', borderRadius: 20, padding: 24, maxHeight: '90%' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'right', marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '500', textAlign: 'right', marginBottom: 8, color: '#334155' },
    input: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, fontSize: 16, marginBottom: 16, textAlign: 'right', borderWidth: 1, borderColor: '#cbd5e1' },
    pickerContainer: { backgroundColor: '#f1f5f9', borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#cbd5e1', justifyContent: 'center' },
    buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
    buttonCancel: { backgroundColor: '#e2e8f0', borderRadius: 8, padding: 14, flex: 1, alignItems: 'center', marginRight: 8 },
    buttonCancelText: { color: '#1e293b', fontWeight: 'bold', fontSize: 16 },
    buttonSave: { backgroundColor: '#0ea5e9', borderRadius: 8, padding: 14, flex: 1, alignItems: 'center', marginLeft: 8 },
    buttonSaveText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});

export default SupportTicketFormModal;
