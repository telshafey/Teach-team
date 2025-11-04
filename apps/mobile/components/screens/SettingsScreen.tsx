import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '@shared/contexts/AuthContext';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const SettingsScreen: React.FC = () => {
    const { supabaseClient } = useSupabase();
    const navigation = useNavigation();
    
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

     const handlePasswordChange = async () => {
        if (newPassword !== confirmPassword) {
            Alert.alert('خطأ', 'كلمتا المرور الجديدتان غير متطابقتين.'); return;
        }
        if (newPassword.length < 6) {
            Alert.alert('خطأ', 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.'); return;
        }
        if (!supabaseClient) return;

        setIsChangingPassword(true);
        try {
            const { error: updateError } = await supabaseClient.auth.updateUser({ password: newPassword });
            if (updateError) throw updateError;
            
            Alert.alert('نجاح', 'تم إرسال طلب تغيير كلمة المرور. يرجى مراجعة بريدك الإلكتروني للتأكيد.');
            setNewPassword(''); 
            setConfirmPassword('');
        } catch (error: any) {
             Alert.alert('خطأ', `فشل تغيير كلمة المرور: ${error.message}`);
        } finally {
            setIsChangingPassword(false);
        }
    };


    return (
        <SafeAreaView style={styles.container}>
             <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-forward-outline" size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.header}>الإعدادات</Text>
            </View>
            <View style={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>تغيير كلمة المرور</Text>
                     <Text style={styles.label}>كلمة المرور الجديدة</Text>
                    <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
                    
                     <Text style={styles.label}>تأكيد كلمة المرور</Text>
                    <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

                    <TouchableOpacity style={styles.button} onPress={handlePasswordChange} disabled={isChangingPassword}>
                        {isChangingPassword ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>تغيير كلمة المرور</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f1f5f9',
    },
    headerContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    header: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0f172a',
        textAlign: 'right',
        flex: 1,
    },
    backButton: {
        padding: 8,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'right',
        marginBottom: 16
    },
    label: {
        textAlign: 'right',
        marginBottom: 8,
        fontSize: 14,
        color: '#334155'
    },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        padding: 12,
        textAlign: 'right',
        marginBottom: 16,
    },
    button: {
        backgroundColor: '#0ea5e9',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    }
});

export default SettingsScreen;
