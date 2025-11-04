import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type StatusType = 'project' | 'task' | 'approval' | 'request' | 'penalty' | 'contract' | 'plan' | 'support_ticket_status' | 'support_ticket_priority';
type StatusValue = string;

interface StatusBadgeProps {
  status: StatusValue;
  type: StatusType;
}

const statusMaps: Record<StatusType, Record<StatusValue, { text: string, containerStyle: object, textStyle: object }>> = {
  project: {
    'نشط': { text: 'نشط', containerStyle: { backgroundColor: '#e0f2fe' }, textStyle: { color: '#0369a1' } },
    'مكتمل': { text: 'مكتمل', containerStyle: { backgroundColor: '#dcfce7' }, textStyle: { color: '#166534' } },
    'معلق': { text: 'معلق', containerStyle: { backgroundColor: '#fef3c7' }, textStyle: { color: '#92400e' } },
  },
  task: {
    todo: { text: 'لم تبدأ', containerStyle: { backgroundColor: '#e2e8f0' }, textStyle: { color: '#1e293b' } },
    inprogress: { text: 'قيد التنفيذ', containerStyle: { backgroundColor: '#e0f2fe' }, textStyle: { color: '#0369a1' } },
    done: { text: 'مكتملة', containerStyle: { backgroundColor: '#dcfce7' }, textStyle: { color: '#166534' } },
  },
  approval: {
    pending: { text: 'قيد المراجعة', containerStyle: { backgroundColor: '#fef3c7' }, textStyle: { color: '#92400e' } },
    approved: { text: 'معتمدة', containerStyle: { backgroundColor: '#dcfce7' }, textStyle: { color: '#166534' } },
    rejected: { text: 'مرفوضة', containerStyle: { backgroundColor: '#fee2e2' }, textStyle: { color: '#991b1b' } },
    'needs-adjustment': { text: 'تحتاج تعديل', containerStyle: { backgroundColor: '#dbeafe' }, textStyle: { color: '#1d4ed8' } }
  },
  request: {
    pending: { text: 'قيد المراجعة', containerStyle: { backgroundColor: '#fef3c7' }, textStyle: { color: '#92400e' } },
    approved: { text: 'معتمد', containerStyle: { backgroundColor: '#dcfce7' }, textStyle: { color: '#166534' } },
    rejected: { text: 'مرفوض', containerStyle: { backgroundColor: '#fee2e2' }, textStyle: { color: '#991b1b' } },
  },
  penalty: {
    pending: { text: 'قيد المراجعة', containerStyle: { backgroundColor: '#fef3c7' }, textStyle: { color: '#92400e' } },
    approved: { text: 'معتمدة', containerStyle: { backgroundColor: '#dcfce7' }, textStyle: { color: '#166534' } },
    appealed: { text: 'تم الاستئناف', containerStyle: { backgroundColor: '#dbeafe' }, textStyle: { color: '#1d4ed8' } },
    rejected: { text: 'مرفوضة', containerStyle: { backgroundColor: '#fee2e2' }, textStyle: { color: '#991b1b' } },
  },
  contract: {
    pending: { text: 'قيد المراجعة', containerStyle: { backgroundColor: '#fef3c7' }, textStyle: { color: '#92400e' } },
    approved: { text: 'معتمد', containerStyle: { backgroundColor: '#dcfce7' }, textStyle: { color: '#166534' } },
    rejected: { text: 'مرفوض', containerStyle: { backgroundColor: '#fee2e2' }, textStyle: { color: '#991b1b' } },
  },
  plan: {
    pending: { text: 'قيد المراجعة', containerStyle: { backgroundColor: '#fef3c7' }, textStyle: { color: '#92400e' } },
    approved: { text: 'معتمدة', containerStyle: { backgroundColor: '#dcfce7' }, textStyle: { color: '#166534' } },
    rejected: { text: 'مرفوضة', containerStyle: { backgroundColor: '#fee2e2' }, textStyle: { color: '#991b1b' } },
    'needs-adjustment': { text: 'تحتاج تعديل', containerStyle: { backgroundColor: '#dbeafe' }, textStyle: { color: '#1d4ed8' } },
  },
  support_ticket_status: {
    open: { text: 'مفتوحة', containerStyle: { backgroundColor: '#dcfce7' }, textStyle: { color: '#166534' } },
    'in-progress': { text: 'قيد المعالجة', containerStyle: { backgroundColor: '#e0f2fe' }, textStyle: { color: '#0369a1' } },
    closed: { text: 'مغلقة', containerStyle: { backgroundColor: '#e2e8f0' }, textStyle: { color: '#1e293b' } },
  },
  support_ticket_priority: {
    low: { text: 'منخفضة', containerStyle: { backgroundColor: '#e2e8f0' }, textStyle: { color: '#1e293b' } },
    medium: { text: 'متوسطة', containerStyle: { backgroundColor: '#e0f2fe' }, textStyle: { color: '#0369a1' } },
    high: { text: 'عالية', containerStyle: { backgroundColor: '#fef3c7' }, textStyle: { color: '#92400e' } },
    urgent: { text: 'عاجلة', containerStyle: { backgroundColor: '#fee2e2' }, textStyle: { color: '#991b1b' } },
  },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type }) => {
  const statusInfo = statusMaps[type]?.[status];

  if (!statusInfo) {
    return (
        <View style={[styles.badge, { backgroundColor: '#e2e8f0' }]}>
            <Text style={[styles.text, { color: '#1e293b' }]}>{status}</Text>
        </View>
    );
  }

  return (
    <View style={[styles.badge, statusInfo.containerStyle]}>
      <Text style={[styles.text, statusInfo.textStyle]}>
        {statusInfo.text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 9999,
    },
    text: {
        fontSize: 12,
        fontWeight: '500',
    }
});

export default StatusBadge;
