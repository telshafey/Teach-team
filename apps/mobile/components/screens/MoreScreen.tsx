import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useAuth } from '@shared/contexts/AuthContext';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { usePendingApprovals } from '@shared/hooks/usePendingApprovals';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

type IconName = keyof typeof Ionicons.glyphMap;

interface MenuItemProps {
    label: string;
    icon: IconName;
    badgeCount?: number;
    onPress: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ label, icon, badgeCount, onPress }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
        <View style={styles.menuItemContent}>
            <Ionicons name={icon} size={22} color="#475569" style={styles.icon} />
            <Text style={styles.menuItemText}>{label}</Text>
            {badgeCount && badgeCount > 0 ? (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badgeCount}</Text>
                </View>
            ) : null}
        </View>
        <Ionicons name="chevron-back" size={22} color="#9ca3af" />
    </TouchableOpacity>
);


const MoreScreen: React.FC = () => {
    const { currentUser, handleLogout } = useAuth();
    const { hasPermission } = useTeamContext();
    const { count: pendingApprovalsCount } = usePendingApprovals();
    const navigation = useNavigation<any>();

    if (!currentUser) {
        return null;
    }
    
    const menuItems = [
        { label: 'الملف الشخصي', icon: 'person-outline' as IconName, screen: 'Profile', permission: true },
        { label: 'الموافقات', icon: 'checkbox-outline' as IconName, screen: 'Approvals', permission: true, badge: pendingApprovalsCount },
        { label: 'المالية', icon: 'cash-outline' as IconName, screen: 'Finance', permission: hasPermission('view_finances') },
        { label: 'التقارير', icon: 'document-text-outline' as IconName, screen: 'Reports', permission: hasPermission('view_reports') },
        { label: 'التحليلات', icon: 'bar-chart-outline' as IconName, screen: 'Analytics', permission: hasPermission('view_analytics') },
        { label: 'الدعم الفني', icon: 'ticket-outline' as IconName, screen: 'Support', permission: true },
        { label: 'الإعدادات', icon: 'settings-outline' as IconName, screen: 'Settings', permission: true },
    ].filter(item => item.permission);


    return (
        <SafeAreaView style={styles.container}>
             <View style={styles.headerContainer}>
                 <Text style={styles.header}>المزيد</Text>
             </View>
            <ScrollView>
                <TouchableOpacity style={styles.profileHeader} onPress={() => navigation.navigate('Profile')}>
                    <Image source={{ uri: currentUser.avatarUrl }} style={styles.avatar} />
                    <View>
                        <Text style={styles.name}>{currentUser.name}</Text>
                        <Text style={styles.email}>{currentUser.email}</Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.menuContainer}>
                    {menuItems.map(item => (
                         <MenuItem 
                            key={item.screen}
                            label={item.label}
                            icon={item.icon}
                            badgeCount={item.badge}
                            onPress={() => navigation.navigate(item.screen)}
                        />
                    ))}
                </View>

                 <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={22} color="#b91c1c" />
                    <Text style={styles.logoutText}>تسجيل الخروج</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f1f5f9',
    },
    headerContainer: {
        padding: 16,
        paddingBottom: 8,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0f172a',
        textAlign: 'right',
    },
    profileHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 24,
        backgroundColor: 'white',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginLeft: 16,
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
        textAlign: 'right',
    },
    email: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 4,
        textAlign: 'right',
    },
    menuContainer: {
        marginTop: 24,
        paddingHorizontal: 16,
    },
    menuItem: {
        backgroundColor: 'white',
        borderRadius: 8,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    menuItemContent: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
    icon: {
        marginRight: 0,
        marginLeft: 12,
    },
    menuItemText: {
        fontSize: 16,
        color: '#334155'
    },
    badge: {
        backgroundColor: '#ef4444',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold'
    },
    logoutButton: {
        margin: 16,
        backgroundColor: '#fee2e2',
        borderRadius: 8,
        paddingVertical: 14,
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    logoutText: {
        color: '#b91c1c',
        fontWeight: '600',
        fontSize: 16,
        marginRight: 8,
    }
});

export default MoreScreen;
