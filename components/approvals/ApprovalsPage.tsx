import React, { useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTeamContext } from '../../contexts/TeamContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useRequestsContext } from '../../contexts/RequestsContext';
import { Card } from '../ui/Card';
import { DecisionDetailModal } from '../modals/DecisionDetailModal';
import { EmptyState } from '../ui/EmptyState';
import { ClipboardDocumentListIcon } from '../ui/Icons';
import { DecisionItem, TeamMember, Task, Project, OvertimeRequest, LeaveRequest, WorkContractChangeRequest, Penalty } from '../../types';
import { isTask, isProject, isOvertimeRequest, isLeaveRequest, isWorkContractChangeRequest, isPenalty, isTeamMember } from '../../utils/typeGuards';

interface ApprovalSectionProps {
  title: string;
  items: DecisionItem[];
  onReview: (item: DecisionItem) => void;
  teamMembers: TeamMember[];
}

const ApprovalSection: React.FC<ApprovalSectionProps> = ({ title, items, onReview, teamMembers }) => {
  if (items.length === 0) {
    return null;
  }
  
  const getItemText = (item: DecisionItem) => {
    const member = teamMembers.find(m => m.id === (item as any).teamMemberId);
    if (isTask(item)) return `مهمة: ${item.title}`;
    if (isProject(item)) return `عقد: ${item.name}`;
    if (isOvertimeRequest(item)) return `ساعات إضافية: ${item.requestedHours.toFixed(1)} لـ ${member?.name}`;
    if (isLeaveRequest(item)) return `طلب إجازة: ${member?.name}`;
    if (isWorkContractChangeRequest(item)) return `تعديل عقد: ${member?.name}`;
    if (isPenalty(item)) return `جزاء: ${item.amount} على ${member?.name}`;
    if (isTeamMember(item)) return `خطة عمل: ${item.name}`;
    return 'طلب غير معروف';
  };

  return (
    <Card title={title}>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={`${(item as any).id}-${index}`} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md flex justify-between items-center">
            <p className="text-sm text-slate-700 dark:text-slate-300 truncate pr-2">{getItemText(item)}</p>
            <button onClick={() => onReview(item)} className="text-sm font-semibold text-sky-600 hover:text-sky-800 flex-shrink-0">مراجعة</button>
          </div>
        ))}
      </div>
    </Card>
  );
};


export const ApprovalsPage: React.FC = () => {
    const { currentUser, hasPermission } = useAuth();
    const { teamMembers } = useTeamContext();
    const { projects, tasks } = useProjectContext();
    const { leaveRequests, overtimeRequests, workContractChangeRequests, penalties } = useRequestsContext();
    const [reviewingItem, setReviewingItem] = useState<DecisionItem | null>(null);

    const { myTeamIds, isGM } = useMemo(() => {
        if (!currentUser) return { myTeamIds: [], isGM: false };
        const gm = currentUser.roleId === 'gm';
        const teamIds = gm ? teamMembers.map(m => m.id) : teamMembers.filter(m => m.reportsTo === currentUser.id).map(m => m.id);
        return { myTeamIds: teamIds, isGM: gm };
    }, [currentUser, teamMembers]);
    
    // Filter all pending items based on user's role (GM vs Manager)
    const pendingItems = useMemo(() => {
        const pendingTasks = hasPermission('approve_task_submissions') ? tasks.filter(t => t.approvalStatus === 'pending' && (isGM || myTeamIds.includes(t.assignedTo || -1))) : [];
        const pendingPlans = hasPermission('approve_weekly_plans') ? teamMembers.filter(m => m.weeklyPlan.status === 'pending' && (isGM || myTeamIds.includes(m.id))) : [];
        const pendingContracts = hasPermission('approve_freelancer_contracts') ? projects.filter(p => p.freelancerContract?.status === 'pending') : []; // GMs approve all contracts
        const pendingLeave = hasPermission('approve_leave_requests') ? leaveRequests.filter(r => r.status === 'pending' && (isGM || myTeamIds.includes(r.teamMemberId))) : [];
        const pendingOvertime = hasPermission('approve_overtime') ? overtimeRequests.filter(r => r.status === 'pending' && (isGM || myTeamIds.includes(r.teamMemberId))) : [];
        const pendingContractChanges = hasPermission('approve_work_contract_changes') ? workContractChangeRequests.filter(r => r.status === 'pending' && (isGM || myTeamIds.includes(r.teamMemberId))) : [];
        const pendingPenalties = hasPermission('approve_penalties') ? penalties.filter(p => p.status === 'pending' && (isGM || myTeamIds.includes(p.teamMemberId))) : [];
        
        const total = pendingTasks.length + pendingPlans.length + pendingContracts.length + pendingLeave.length + pendingOvertime.length + pendingContractChanges.length + pendingPenalties.length;
        
        return {
            pendingTasks,
            pendingPlans,
            pendingContracts,
            pendingLeave,
            pendingOvertime,
            pendingContractChanges,
            pendingPenalties,
            total
        };
    }, [tasks, teamMembers, projects, leaveRequests, overtimeRequests, workContractChangeRequests, penalties, hasPermission, myTeamIds, isGM]);

    return (
        <>
            <div className="p-6">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">الموافقات المعلقة</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">مراجعة واتخاذ قرار بشأن الطلبات المعلقة.</p>
                </div>

                {pendingItems.total > 0 ? (
                    <div className="space-y-6">
                        <ApprovalSection title="تسليم المهام" items={pendingItems.pendingTasks} onReview={setReviewingItem} teamMembers={teamMembers} />
                        <ApprovalSection title="خطط العمل الأسبوعية" items={pendingItems.pendingPlans} onReview={setReviewingItem} teamMembers={teamMembers} />
                        <ApprovalSection title="طلبات الإجازات" items={pendingItems.pendingLeave} onReview={setReviewingItem} teamMembers={teamMembers} />
                        <ApprovalSection title="طلبات الساعات الإضافية" items={pendingItems.pendingOvertime} onReview={setReviewingItem} teamMembers={teamMembers} />
                        <ApprovalSection title="تعديلات عقود العمل" items={pendingItems.pendingContractChanges} onReview={setReviewingItem} teamMembers={teamMembers} />
                        <ApprovalSection title="عقود المستقلين" items={pendingItems.pendingContracts} onReview={setReviewingItem} teamMembers={teamMembers} />
                        <ApprovalSection title="الجزاءات" items={pendingItems.pendingPenalties} onReview={setReviewingItem} teamMembers={teamMembers} />
                    </div>
                ) : (
                    <Card>
                        <EmptyState 
                            icon={<ClipboardDocumentListIcon className="w-12 h-12" />} 
                            title="لا توجد موافقات" 
                            message="لا توجد طلبات معلقة للمراجعة حاليًا." 
                        />
                    </Card>
                )}
            </div>
            {reviewingItem && (
                <DecisionDetailModal 
                    isOpen={!!reviewingItem}
                    onClose={() => setReviewingItem(null)}
                    item={reviewingItem}
                />
            )}
        </>
    );
};
