import React, { useState, useMemo, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { DecisionItem, Task, Project, TeamMember, OvertimeRequest, LeaveRequest, WorkContractChangeRequest, Penalty, ExpenseClaim } from '@shared/types';
import { isTask, isProject, isOvertimeRequest, isLeaveRequest, isWorkContractChangeRequest, isPenalty, isTeamMember, isExpenseClaim } from '@shared/utils/typeGuards';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { useProjectContext } from '@shared/contexts/ProjectContext';
import { useRequestsContext } from '@shared/contexts/RequestsContext';
import { useSettingsContext } from '@shared/contexts/SettingsContext';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface DecisionDetailModalProps {
    isVisible: boolean;
    onClose: () => void;
    item: DecisionItem | null;
}

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <View style={styles.detailRow}>
        <Text style={styles.detailValue}>{value}</Text>
        <Text style={styles.detailLabel}>{label}</Text>
    </View>
);

const DecisionDetailModal: React.FC<DecisionDetailModalProps> = ({ isVisible, onClose, item }) => {
    const { teamMembers } = useTeamContext();
    const { handleUpdateTask } = useProjectContext();
    const { handleUpdateLeaveStatus, handleUpdateOvertimeStatus, handleUpdateWorkContractChangeRequestStatus, handleUpdatePenaltyStatus, handleUpdateExpenseClaimStatus } = useRequestsContext();
    const { currency } = useSettingsContext();
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    const [approvedHours, setApprovedHours] = useState<number>(0);
    const [approvedSalary, setApprovedSalary] = useState<number>(0);

    useEffect(() => {
        if (item && isWorkContractChangeRequest(item)) {
            setApprovedHours(item.requestedWeeklyHours);
            setApprovedSalary(item.requestedSalary);
        } else {
            setNotes('');
        }
    }, [item]);

    const details = useMemo(() => {
        if (!item) return null;
        const member = teamMembers.find(m => m.id === (item as any).teamMemberId);
        
        if (isTask(item)) return <DetailRow label="المهمة" value={item.title} />;
        if (isTeamMember(item)) return <DetailRow label="الموظف" value={item.name} />;
        if (isOvertimeRequest(item)) return <><DetailRow label="الموظف" value={member?.name || ''} /><DetailRow label="الساعات" value={`${item.requestedHours} ساعة`} /></>;
        if (isLeaveRequest(item)) return <><DetailRow label="الموظف" value={member?.name || ''} /><DetailRow label="التاريخ" value={`${format(parseISO(item.startDate), 'd MMM')} - ${format(parseISO(item.endDate), 'd MMM')}`} /><DetailRow label="السبب" value={item.reason} /></>;
        if (isExpenseClaim(item)) return <><DetailRow label="الموظف" value={member?.name || ''} /><DetailRow label="المبلغ" value={`${item.amount} ${currency}`} /><DetailRow label="الوصف" value={item.description} /></>;
        if (isPenalty(item)) return <><DetailRow label="الموظف" value={member?.name || ''} /><DetailRow label="المبلغ" value={`${item.amount} ${currency}`} /><DetailRow label="السبب" value={item.reason} /></>;
        if (isWorkContractChangeRequest(item)) return (
            <>
                <DetailRow label="الموظف" value={member?.name || ''} />
                <DetailRow label="الحالي" value={`${item.currentWeeklyHours}س/أسبوع، ${item.currentSalary} ${currency}/شهر`} />
                <DetailRow label="المطلوب" value={`${item.requestedWeeklyHours}س/أسبوع، ${item.requestedSalary} ${currency}/شهر`} />
                 <DetailRow label="السبب" value={item.reason} />
            </>
        );
        return null;
    }, [item, teamMembers, currency]);

    const handleDecision = async (status: 'approved' | 'rejected' | 'needs-adjustment') => {
        if (!item) return;
        setIsSaving(true);
        try {
            if (isTask(item)) await handleUpdateTask({ id: item.id, approvalStatus: status, approvalNotes: notes });
            if (isLeaveRequest(item)) await handleUpdateLeaveStatus(item.id, status, notes);
            if (isOvertimeRequest(item)) await handleUpdateOvertimeStatus(item.id, status, notes);
            if (isExpenseClaim(item)) await handleUpdateExpenseClaimStatus(item.id, status);
            if (isPenalty(item)) await handleUpdatePenaltyStatus(item.id, status, notes);
            if (isWorkContractChangeRequest(item)) {
                const modifications = status === 'approved' ? { hours: approvedHours, salary: approvedSalary } : undefined;
                await handleUpdateWorkContractChangeRequestStatus(item.id, status, notes, modifications);
            }
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    if (!isVisible) return null;

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>مراجعة الطلب</Text>
                    <ScrollView>
                        <View style={styles.detailsContainer}>{details}</View>

                        {isWorkContractChangeRequest(item) && (
                            <View style={styles.modificationContainer}>
                                <Text style={styles.modificationTitle}>الموافقة مع تعديل (اختياري)</Text>
                                <View style={styles.modificationInputs}>
                                    <View style={{flex: 1}}>
                                        <Text style={styles.label}>الساعات المعتمدة</Text>
                                        <TextInput style={styles.input} value={approvedHours.toString()} onChangeText={(t) => setApprovedHours(Number(t))} keyboardType="numeric" />
                                    </View>
                                    <View style={{flex: 1, marginLeft: 8}}>
                                        <Text style={styles.label}>الراتب المعتمد</Text>
                                        <TextInput style={styles.input} value={approvedSalary.toString()} onChangeText={(t) => setApprovedSalary(Number(t))} keyboardType="numeric" />
                                    </View>
                                </View>
                            </View>
                        )}
                        
                        <Text style={styles.label}>ملاحظات (اختياري)</Text>
                        <TextInput
                            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                        />
                    </ScrollView>
                    
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity style={styles.buttonCancel} onPress={onClose} disabled={isSaving}><Text style={styles.buttonCancelText}>إغلاق</Text></TouchableOpacity>
                        {isTask(item) && <TouchableOpacity style={[styles.button, styles.buttonAdjust]} onPress={() => handleDecision('needs-adjustment')} disabled={isSaving}><Text style={styles.buttonText}>يحتاج تعديل</Text></TouchableOpacity>}
                        <TouchableOpacity style={[styles.button, styles.buttonReject]} onPress={() => handleDecision('rejected')} disabled={isSaving}><Text style={styles.buttonText}>رفض</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.button, styles.buttonApprove]} onPress={() => handleDecision('approved')} disabled={isSaving}>
                          {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>موافقة</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
  centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalView: { width: '90%', maxHeight: '80%', backgroundColor: 'white', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'right' },
  detailsContainer: { marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 },
  detailRow: { marginBottom: 10, alignItems: 'flex-end' },
  detailLabel: { fontSize: 14, color: '#64748b' },
  detailValue: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  modificationContainer: { backgroundColor: '#f1f5f9', padding: 10, borderRadius: 8, marginBottom: 15 },
  modificationTitle: { fontWeight: '600', textAlign: 'right', marginBottom: 8 },
  modificationInputs: { flexDirection: 'row-reverse' },
  label: { fontSize: 14, color: '#334155', marginBottom: 5, textAlign: 'right' },
  input: { backgroundColor: '#f1f5f9', padding: 10, borderRadius: 8, textAlign: 'right', marginBottom: 10 },
  actionsContainer: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingTop: 15, borderTopWidth: 1, borderTopColor: '#eee' },
  button: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', minWidth: 70 },
  buttonText: { color: 'white', fontWeight: 'bold' },
  buttonCancel: { backgroundColor: '#e2e8f0', padding: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  buttonCancelText: { color: '#334155', fontWeight: 'bold' },
  buttonAdjust: { backgroundColor: '#3b82f6' },
  buttonReject: { backgroundColor: '#ef4444' },
  buttonApprove: { backgroundColor: '#22c55e' },
});

export default DecisionDetailModal;
