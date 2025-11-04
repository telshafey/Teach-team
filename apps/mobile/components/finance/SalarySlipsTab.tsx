import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { useRequestsContext } from '@shared/contexts/RequestsContext';
import { useSettingsContext } from '@shared/contexts/SettingsContext';
import { SalarySlipData } from '@shared/types';
import { generateSalarySlipData } from '@shared/utils/salarySlip';
import { format } from 'date-fns';
import { Picker } from '@react-native-picker/picker';
import SalarySlipModal from '../modals/SalarySlipModal';

const SalarySlipsTab: React.FC = () => {
    const { teamMembers, hasPermission } = useTeamContext();
    const { overtimeRequests, expenseClaims, penalties } = useRequestsContext();
    const { siteSettings } = useSettingsContext();

    const [selectedMemberId, setSelectedMemberId] = useState<string>('');
    const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
    const [slipData, setSlipData] = useState<SalarySlipData | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const handleGenerate = () => {
        if (!selectedMemberId || !selectedMonth) return;

        const member = teamMembers.find(m => m.id === parseInt(selectedMemberId));
        if (!member) {
            Alert.alert("خطأ", "الموظف المحدد غير موجود.");
            return;
        }

        const monthDate = new Date(selectedMonth + '-02'); // Use day 2 to avoid timezone issues with day 1

        const data = generateSalarySlipData(member, monthDate, overtimeRequests, expenseClaims, penalties, siteSettings);
        setSlipData(data);
        setIsModalVisible(true);
    };
    
    const membersWithSalary = teamMembers.filter(m => m.salary);

    if (!hasPermission('view_all_salaries')) {
        return <View style={styles.container}><Text style={styles.emptyText}>ليس لديك الصلاحية لعرض هذه المعلومات.</Text></View>;
    }

    return (
        <>
            <View style={styles.container}>
                <Text style={styles.title}>إنشاء قسيمة راتب</Text>
                
                <Text style={styles.label}>الموظف</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={selectedMemberId}
                        onValueChange={(itemValue) => setSelectedMemberId(itemValue as string)}
                    >
                        <Picker.Item label="-- اختر موظف --" value="" />
                        {membersWithSalary.map(m => (
                            <Picker.Item key={m.id} label={m.name} value={m.id.toString()} />
                        ))}
                    </Picker>
                </View>

                <Text style={styles.label}>الشهر</Text>
                <Text style={styles.infoText}>(الشهر والسنة فقط، لا يمكن إنشاء قسائم مستقبلية)</Text>
                
                <TouchableOpacity onPress={handleGenerate} disabled={!selectedMemberId || !selectedMonth} style={[styles.button, (!selectedMemberId || !selectedMonth) && styles.buttonDisabled]}>
                    <Text style={styles.buttonText}>إنشاء القسيمة</Text>
                </TouchableOpacity>
            </View>

            <SalarySlipModal
                isVisible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
                slipData={slipData}
            />
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'right',
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        textAlign: 'right',
        marginBottom: 8,
        color: '#334155',
    },
    infoText: {
        fontSize: 12,
        textAlign: 'right',
        marginBottom: 8,
        color: '#64748b',
    },
    pickerContainer: {
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        justifyContent: 'center',
    },
    button: {
        backgroundColor: '#0ea5e9',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
    },
    buttonDisabled: {
        backgroundColor: '#94a3b8',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 32,
        color: '#64748b',
    },
});

export default SalarySlipsTab;
