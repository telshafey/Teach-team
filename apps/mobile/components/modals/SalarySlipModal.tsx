import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SalarySlipData } from '@shared/types';
import { useSettingsContext } from '@shared/contexts/SettingsContext';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';

interface SalarySlipModalProps {
    isVisible: boolean;
    onClose: () => void;
    slipData: SalarySlipData | null;
}

const SlipRow: React.FC<{ label: string; value: number; isDeduction?: boolean; currency: string }> = ({ label, value, isDeduction, currency }) => {
    if (value === 0) return null;
    return (
        <View style={styles.slipRow}>
            <Text style={[styles.slipValue, { color: isDeduction ? '#dc2626' : '#16a34a' }]}>
                {isDeduction ? '-' : '+'} {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
            </Text>
            <Text style={styles.slipLabel}>{label}</Text>
        </View>
    );
};

const SalarySlipModal: React.FC<SalarySlipModalProps> = ({ isVisible, onClose, slipData }) => {
    const { currency } = useSettingsContext();

    if (!isVisible || !slipData) return null;

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
                        <Text style={styles.title}>قسيمة راتب</Text>
                        <Text style={styles.subtitle}>لشهر {format(slipData.month, 'MMMM yyyy', { locale: arSA })}</Text>
                    </View>
                    
                    <ScrollView style={{maxHeight: 400}}>
                        <View style={styles.employeeInfo}>
                            <Text style={styles.infoLabel}>اسم الموظف: <Text style={styles.infoValue}>{slipData.member.name}</Text></Text>
                        </View>

                        <View style={styles.detailsContainer}>
                             <View style={styles.slipRow}>
                                <Text style={styles.slipValueBase}>{slipData.baseSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</Text>
                                <Text style={styles.slipLabel}>الراتب الأساسي</Text>
                            </View>
                            <SlipRow label="مستحقات ساعات إضافية" value={slipData.overtimePay} currency={currency} />
                            <SlipRow label="تعويض مصروفات" value={slipData.expensesReimbursed} currency={currency} />
                            <SlipRow label="خصم جزاءات" value={slipData.penaltiesDeducted} isDeduction currency={currency} />
                        </View>
                    </ScrollView>

                    <View style={styles.totalContainer}>
                        <Text style={styles.totalValue}>{slipData.netSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</Text>
                        <Text style={styles.totalLabel}>صافي الراتب</Text>
                    </View>

                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>إغلاق</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalView: { width: '90%', backgroundColor: 'white', borderRadius: 20, padding: 20 },
    header: { alignItems: 'flex-end', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginBottom: 15 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
    subtitle: { fontSize: 16, color: '#64748b' },
    employeeInfo: { marginBottom: 15 },
    infoLabel: { fontSize: 14, color: '#64748b', textAlign: 'right' },
    infoValue: { fontWeight: 'bold', color: '#1e293b' },
    detailsContainer: { marginBottom: 15 },
    slipRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    slipLabel: { fontSize: 14, color: '#475569' },
    slipValue: { fontSize: 14, fontWeight: '600' },
    slipValueBase: { fontSize: 14, fontWeight: '600', color: '#334155'},
    totalContainer: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, paddingTop: 15, borderTopWidth: 2, borderTopColor: '#cbd5e1' },
    totalLabel: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    totalValue: { fontSize: 22, fontWeight: 'bold', color: '#0ea5e9' },
    closeButton: { backgroundColor: '#e2e8f0', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
    closeButtonText: { color: '#1e293b', fontWeight: 'bold', fontSize: 16 },
});

export default SalarySlipModal;
