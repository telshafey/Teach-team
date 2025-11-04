import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTimeManagement } from '@shared/contexts/TimeManagementContext';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import Card from '../ui/Card';
import { Ionicons } from '@expo/vector-icons';

const PunchClockCard: React.FC = () => {
    const { activePunchIn, handlePunchIn } = useTimeManagement();
    const isCheckedIn = !!activePunchIn;

    return (
        <Card title="تسجيل الحضور والانصراف">
            <View style={styles.container}>
                {isCheckedIn ? (
                    <View style={styles.checkedInContainer}>
                        <Ionicons name="checkmark-circle" size={32} color="#16a34a" />
                        <Text style={styles.statusText}>أنت مسجل حضورك حاليًا.</Text>
                        <Text style={styles.timeText}>
                            بدأ في: {format(new Date(activePunchIn.startTime), 'p', { locale: arSA })}
                        </Text>
                        <Text style={styles.infoText}>يمكنك تسجيل الخروج من الشريط العلوي.</Text>
                    </View>
                ) : (
                    <View style={styles.checkedOutContainer}>
                         <Ionicons name="log-in-outline" size={32} color="#64748b" />
                        <Text style={[styles.statusText, {color: '#334155'}]}>أنت غير مسجل حضورك حاليًا.</Text>
                        <TouchableOpacity 
                            onPress={handlePunchIn}
                            style={styles.button}
                        >
                            <Text style={styles.buttonText}>تسجيل الحضور</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </Card>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        padding: 16,
    },
    checkedInContainer: {
        alignItems: 'center',
    },
    checkedOutContainer: {
        alignItems: 'center',
    },
    statusText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#15803d',
        marginTop: 8,
    },
    timeText: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 4,
    },
    infoText: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 16,
    },
    button: {
        backgroundColor: '#16a34a',
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 8,
        marginTop: 16,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default PunchClockCard;
