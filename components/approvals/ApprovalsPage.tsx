import React, { useState, useMemo } from 'react';
import { usePendingApprovals } from '../../hooks/usePendingApprovals';
import { DecisionItem, Project } from '../../types';
import { DecisionDetailModal } from '../modals/DecisionDetailModal';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { ClipboardDocumentListIcon } from '../ui/Icons';
import { ApprovalItemCard } from './ApprovalItemCard';
import { isTask, isProject, isOvertimeRequest, isLeaveRequest, isWorkContractChangeRequest, isPenalty, isTeamMember, isExpenseClaim } from '../../utils/typeGuards';
import { ApprovalGroup } from './ApprovalGroup';

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

export const ApprovalsPage: React.FC = () => {
    const { pendingItems } = usePendingApprovals();
    const [reviewingItem, setReviewingItem] = useState<DecisionItem | null>(null);

    const groupedApprovals = useMemo(() => {
        const groups: Partial<Record<ApprovalCategory, DecisionItem[]>> = {};

        for (const item of pendingItems) {
            for (const key in categoryMap) {
                const categoryKey = key as ApprovalCategory;
                if (categoryMap[categoryKey].check(item)) {
                    if (!groups[categoryKey]) {
                        groups[categoryKey] = [];
                    }
                    groups[categoryKey]!.push(item);
                    break; // Move to next item once categorized
                }
            }
        }
        return groups;
    }, [pendingItems]);

    const groupOrder: ApprovalCategory[] = ['tasks', 'plans', 'leave', 'overtime', 'expenses', 'contractChanges', 'penalties', 'contracts'];
    const hasPendingItems = pendingItems.length > 0;
    const firstGroupWithItems = hasPendingItems ? groupOrder.find(key => groupedApprovals[key] && groupedApprovals[key]!.length > 0) : undefined;


    return (
        <>
            <div className="p-6">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">الموافقات المعلقة</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">جميع الطلبات التي تحتاج إلى مراجعتك.</p>
                </div>

                {hasPendingItems ? (
                    <div className="space-y-4">
                        {groupOrder.map((key) => {
                            const groupItems = groupedApprovals[key];
                            if (!groupItems || groupItems.length === 0) {
                                return null;
                            }
                            return (
                                <ApprovalGroup
                                    key={key}
                                    title={categoryMap[key].title}
                                    count={groupItems.length}
                                    defaultOpen={key === firstGroupWithItems}
                                >
                                    {groupItems.map((item, itemIndex) => (
                                        <ApprovalItemCard key={(item as any).id ?? `${key}-${itemIndex}`} item={item} onReview={setReviewingItem} />
                                    ))}
                                </ApprovalGroup>
                            );
                        })}
                    </div>
                ) : (
                    <Card>
                        <EmptyState 
                            icon={<ClipboardDocumentListIcon className="w-12 h-12" />}
                            title="لا توجد موافقات"
                            message="لا توجد طلبات معلقة بانتظار مراجعتك حاليًا."
                        />
                    </Card>
                )}
            </div>
            
            <DecisionDetailModal 
                isOpen={!!reviewingItem}
                onClose={() => setReviewingItem(null)}
                item={reviewingItem}
            />
        </>
    );
};