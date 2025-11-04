import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { useSettingsContext } from '@shared/contexts/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { TeamMember } from '@shared/types';

const SalaryRow: React.FC<{ member: TeamMember, currency: string }> = ({ member, currency }) => (
    <View style={styles.row}>
        <Text style={styles.name}>{member.name}</Text>
        <Text style={styles.rate}>{member.salary ? `${member.salary.toLocaleString()} ${currency}` : (member.hourlyRate ? `${member.hourlyRate.toLocaleString()} ${currency}/ساعة` : 'N/A')}</Text>
        <TouchableOpacity style={styles.editButton} disabled>
             <Ionicons name="pencil" size={18} color="#9ca3af" />
        </TouchableOpacity>
    </View>
);

const SalariesTab: React.FC = () => {
    const { teamMembers, hasPermission } = useTeamContext();
    const { currency } = useSettingsContext();
    
    if (!hasPermission('view_all_salaries')) {
        return <View style={styles.container}><Text style={styles.emptyText}>ليس لديك الصلاحية لعرض هذه المعلومات.</Text></View>;
    }

    return (
        <FlatList
            data={teamMembers}
            renderItem={({ item }) => <SalaryRow member={item} currency={currency} />}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.container}
            ListEmptyComponent={<Text style={styles.emptyText}>لا يوجد موظفين لعرض رواتبهم.</Text>}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    row: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        textAlign: 'right',
    },
    rate: {
        fontSize: 14,
        color: '#475569',
        minWidth: 120,
        textAlign: 'left',
    },
    editButton: {
        padding: 8,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 32,
        color: '#64748b',
    },
});

export default SalariesTab;
