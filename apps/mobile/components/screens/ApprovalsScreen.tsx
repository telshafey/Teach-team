import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, SectionList } from 'react-native';
import { usePendingApprovals } from '@shared/hooks/usePendingApprovals';
import { DecisionItem, Project, TeamMember } from '@shared/types';
import { isTask, isProject, isOvertimeRequest, isLeaveRequest, isWorkContractChangeRequest, isPenalty, isTeamMember, isExpenseClaim } from '@shared/utils/typeGuards';
import ApprovalItemCard from '../approvals/ApprovalItemCard';
import DecisionDetailModal from '../modals/DecisionDetailModal';

type ApprovalCategory = 'tasks' | 'plans' | 'contracts' | 'overtime' | 'leave' | 'contractChanges' | 'penalties' | 'expenses';

const categoryMap: { [key in ApprovalCategory]: { title: string; check: (item: DecisionItem) => boolean } } = {
    tasks: { title: 'تسليمات المهام', check: isTask },
    plans: { title: 'خطط العمل الأسبوعية', check: isTeamMember },
    contracts: { title: 'عقود المستقلين', check: (item): item is Project => isProject(item) && !!item.freelancerContract },
    overtime: { title: 'طلبات الساعات الإضافية', check: isOvertimeRequest },
    leave: { title: 'طلبات الإجازات', check: isLeaveRequest },
    expenses: { title: 'طلبات الصرف', check: isExpenseClaim },
    contractChanges: { title: 'طلبات تعديل العقود', check: isWorkContractChangeRequest },
    penalties: { title: 'الجزاءات', check: isPenalty },
};

const groupOrder: ApprovalCategory[] = ['tasks', 'plans', 'leave', 'overtime', 'expenses', 'contractChanges', 'penalties', 'contracts'];

const ApprovalsScreen: React.FC = () => {
    const { pendingItems } = usePendingApprovals();
    const [reviewingItem, setReviewingItem] = useState<DecisionItem | null>(null);

    const approvalSections = useMemo(() => {
        const groups: Partial<Record<ApprovalCategory, DecisionItem[]>> = {};

        for (const item of pendingItems) {
            for (const key in categoryMap) {
                const categoryKey = key as ApprovalCategory;
                if (categoryMap[categoryKey].check(item)) {
                    if (!groups[categoryKey]) {
                        groups[categoryKey] = [];
                    }
                    groups[categoryKey]!.push(item);
                    break;
                }
            }
        }
        
        return groupOrder
            .map(key => ({
                title: categoryMap[key].title,
                data: groups[key] || [],
            }))
            .filter(section => section.data.length > 0);

    }, [pendingItems]);
    
    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.header}>الموافقات المعلقة</Text>
            <SectionList
                sections={approvalSections}
                keyExtractor={(item, index) => (item as any).id + index}
                renderItem={({ item }) => (
                    <ApprovalItemCard item={item} onReview={() => setReviewingItem(item)} />
                )}
                renderSectionHeader={({ section: { title, data } }) => (
                    <Text style={styles.sectionHeader}>{title} ({data.length})</Text>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>لا توجد طلبات معلقة بانتظار مراجعتك حاليًا.</Text>}
                contentContainerStyle={styles.list}
            />
            {reviewingItem && (
                 <DecisionDetailModal
                    isVisible={!!reviewingItem}
                    onClose={() => setReviewingItem(null)}
                    item={reviewingItem}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f1f5f9',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0f172a',
        paddingHorizontal: 16,
        paddingTop: 16,
        textAlign: 'right',
    },
    list: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
        textAlign: 'right',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 32,
        color: '#64748b',
        fontSize: 16,
    },
});

export default ApprovalsScreen;
