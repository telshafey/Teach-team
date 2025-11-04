import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useAuth } from '@shared/contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useSettingsContext } from '@shared/contexts/SettingsContext';

const InfoRow: React.FC<{ label: string, value: string | number | undefined }> = ({ label, value }) => (
    <View style={styles.infoRow}>
        <Text style={styles.infoValue}>{value || '-'}</Text>
        <Text style={styles.infoLabel}>{label}</Text>
    </View>
);

const ProfileScreen: React.FC = () => {
    const { currentUser } = useAuth();
    const { currency } = useSettingsContext();
    const navigation = useNavigation<any>();

    if (!currentUser) {
        return null;
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                <View style={styles.profileHeader}>
                    <Image source={{ uri: currentUser.avatarUrl }} style={styles.avatar} />
                    <Text style={styles.name}>{currentUser.name}</Text>
                    <Text style={styles.email}>{currentUser.email}</Text>
                </View>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>معلومات العمل</Text>
                     <InfoRow label="الدور" value={currentUser.roleId} />
                     <InfoRow label="نوع الدوام" value={currentUser.employmentType} />
                     {currentUser.salary && <InfoRow label={`الراتب (${currency})`} value={currentUser.salary.toLocaleString()} />}
                     {currentUser.hourlyRate && <InfoRow label={`سعر الساعة (${currency})`} value={currentUser.hourlyRate} />}
                     {currentUser.weeklyHoursRequirement && <InfoRow label="ساعات العمل الأسبوعية" value={currentUser.weeklyHoursRequirement} />}
                </View>

                 <View style={styles.card}>
                    <Text style={styles.cardTitle}>الإعدادات</Text>
                    <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Settings')}>
                        <Text style={styles.menuItemText}>تغيير كلمة المرور</Text>
                    </TouchableOpacity>
                 </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f1f5f9',
    },
    profileHeader: {
        alignItems: 'center',
        padding: 24,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 12,
    },
    name: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    email: {
        fontSize: 16,
        color: '#64748b',
        marginTop: 4,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        margin: 16,
        marginBottom: 0,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'right',
        color: '#334155',
    },
    infoRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    infoLabel: {
        fontSize: 14,
        color: '#64748b',
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1e293b',
    },
     menuItem: {
        paddingVertical: 10,
    },
    menuItemText: {
        fontSize: 16,
        color: '#334155',
        textAlign: 'right',
    },
});

export default ProfileScreen;
