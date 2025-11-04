import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DecisionItem } from '@shared/types';
import { isTask, isProject, isOvertimeRequest, isLeaveRequest, isWorkContractChangeRequest, isPenalty, isTeamMember, isExpenseClaim } from '@shared/utils/typeGuards';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { useSettingsContext } from '@shared/contexts/SettingsContext';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface ApprovalItemCardProps {
    item: DecisionItem;
    onReview: (item: DecisionItem) => void;
}

const ApprovalItemCard: React.FC<ApprovalItemCardProps> = ({ item, onReview }) => {
    const { teamMembers } = useTeamContext();
    const { currency } = useSettingsContext();
    
    let title = 'طلب غير معروف';
    let details = '';

    if (isTask(item)) {
        const member = teamMembers.find(m => m.id === item.assignedTo);
        title = `تسليم مهمة: ${item.title}`;
        details = `بواسطة ${member?.name || 'غير معروف'}`;
    } else if (isProject(item) && item.freelancerContract) {
        const member = teamMembers.find(m => m.id === item.freelancerContract?.freelancerId);
        title = `عقد مستقل لمشروع: ${item.name}`;
        details = `المستقل: ${member?.name || 'غير معروف'}`;
    } else if (isTeamMember(item)) {
        title = `خطة عمل أسبوعية لـ ${item.name}`;
        details = `الحالة: ${item.weeklyPlan.status}`;
    } else if (isOvertimeRequest(item)) {
        const member = teamMembers.find(m => m.id === item.teamMemberId);
        title = `طلب ساعات إضافية`;
        details = `بواسطة ${member?.name || 'غير معروف'}, ${item.requestedHours} ساعة`;
    } else if (isLeaveRequest(item)) {
        const member = teamMembers.find(m => m.id === item.teamMemberId);
        title = `طلب إجازة`;
        details = `بواسطة ${member?.name || 'غير معروف'}, من ${format(parseISO(item.startDate), 'd MMM', { locale: arSA })} إلى ${format(parseISO(item.endDate), 'd MMM', { locale: arSA })}`;
    } else if (isExpenseClaim(item)) {
        const member = teamMembers.find(m => m.id === item.teamMemberId);
        title = `طلب صرف`;
        details = `بواسطة ${member?.name || 'غير معروف'}, مبلغ ${item.amount} ${currency}`;
    } else if (isWorkContractChangeRequest(item)) {
        const member = teamMembers.find(m => m.id === item.teamMemberId);
        title = `طلب تعديل عقد عمل`;
        details = `بواسطة ${member?.name || 'غير معروف'}`;
    } else if (isPenalty(item)) {
        const member = teamMembers.find(m => m.id === item.teamMemberId);
        title = `مراجعة جزاء`;
        details = `للموظف ${member?.name || 'غير معروف'}`;
    }

    return (
        <View style={styles.card}>
            <View style={styles.content}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.details}>{details}</Text>
            </View>
            <TouchableOpacity onPress={() => onReview(item)}>
                <Text style={styles.reviewButton}>مراجعة</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        marginRight: 12,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1e293b',
        textAlign: 'right',
    },
    details: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 4,
        textAlign: 'right',
    },
    reviewButton: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0ea5e9',
    },
});

export default ApprovalItemCard;
