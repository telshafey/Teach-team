import React, { useMemo, useState } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
// FIX: Corrected import paths.
import { useProjectContext } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { UsersIcon, CheckCircleIcon, ClockIcon, XCircleIcon } from '../ui/Icons';
import { TeamMember, Task, Project, ApprovalStatus } from '../../types';
import { DecisionDetailModal } from '../modals/DecisionDetailModal';
import { EmptyState } from '../ui/EmptyState';

interface ManagerDashboardProps {
  onViewMemberDetail: (memberId: number) => void;
  onSelectMember: (memberId: number) => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ onViewMemberDetail, onSelectMember }) => {
  const { teamMembers, handleBulkUpdatePlanStatus } = useAppDataContext();
  const { tasks, projects, handleBulkUpdateTaskApproval } = useProjectContext();
  const { currentUser } = useAuth();
  const [decisionItem, setDecisionItem] = useState<TeamMember | Task | Project | null>(null);
  
  const [selectedPlans, setSelectedPlans] = useState<Set<number>>(new Set());
  const [isSubmittingPlans, setIsSubmittingPlans] = useState(false);

  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [isSubmittingTasks, setIsSubmittingTasks] = useState(false);

  const directReports = useMemo(() => {
    if (!currentUser) return [];
    return teamMembers.filter(m => m.reportsTo === currentUser.id);
  }, [currentUser, teamMembers]);
  
  const pendingPlanApprovals = useMemo(() => {
    return directReports.filter(m => m.weeklyPlan.status === 'pending');
  }, [directReports]);

  const pendingTaskApprovals = useMemo(() => {
    const managedMemberIds = directReports.map(m => m.id);
    return tasks.filter(t => t.assignedTo && managedMemberIds.includes(t.assignedTo) && t.approvalStatus !== 'approved');
  }, [directReports, tasks]);
  

  const openDecisionModal = (item: TeamMember | Task | Project) => {
    setDecisionItem(item);
  };
  
  // Plan Selection Handlers
  const handleSelectPlan = (memberId: number) => {
    setSelectedPlans(prev => {
      const newSelection = new Set(prev);
      newSelection.has(memberId) ? newSelection.delete(memberId) : newSelection.add(memberId);
      return newSelection;
    });
  };

  const handleSelectAllPlans = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedPlans(e.target.checked ? new Set(pendingPlanApprovals.map(m => m.id)) : new Set());
  };

  const handleBulkPlanAction = async (status: 'approved' | 'rejected') => {
    setIsSubmittingPlans(true);
    await handleBulkUpdatePlanStatus(Array.from(selectedPlans), status);
    setSelectedPlans(new Set());
    setIsSubmittingPlans(false);
  };

  // Task Selection Handlers
  const handleSelectTask = (taskId: string) => {
    setSelectedTasks(prev => {
      const newSelection = new Set(prev);
      newSelection.has(taskId) ? newSelection.delete(taskId) : newSelection.add(taskId);
      return newSelection;
    });
  };

  const handleSelectAllTasks = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedTasks(e.target.checked ? new Set(pendingTaskApprovals.map(t => t.id)) : new Set());
  };

  const handleBulkTaskAction = async (status: ApprovalStatus) => {
    setIsSubmittingTasks(true);
    await handleBulkUpdateTaskApproval(Array.from(selectedTasks), status);
    setSelectedTasks(new Set());
    setIsSubmittingTasks(false);
  };
  
  const renderPlanApprovals = () => {
    if (pendingPlanApprovals.length === 0) return null;
    const allSelected = pendingPlanApprovals.length > 0 && selectedPlans.size === pendingPlanApprovals.length;

    return (
      <div className="space-y-2">
        <h4 className="font-semibold text-slate-600 dark:text-slate-300 text-sm mb-2 px-1">مراجعة خطط العمل</h4>
        <div className="flex justify-between items-center p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 rounded-t-md">
          <label className="flex items-center text-xs font-medium text-slate-600 dark:text-slate-300">
            <input type="checkbox" onChange={handleSelectAllPlans} checked={allSelected} className="ml-2 rtl:ml-0 rtl:mr-2 h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"/>
            تحديد الكل
          </label>
          <div className="flex space-x-2 rtl:space-x-reverse">
            <button onClick={() => handleBulkPlanAction('approved')} disabled={selectedPlans.size === 0 || isSubmittingPlans} className="flex items-center space-x-1 rtl:space-x-reverse px-2 py-1 text-xs font-semibold text-white bg-green-500 rounded-md hover:bg-green-600 disabled:bg-slate-400 disabled:cursor-not-allowed">
              <CheckCircleIcon className="w-4 h-4" /><span>موافقة</span>
            </button>
            <button onClick={() => handleBulkPlanAction('rejected')} disabled={selectedPlans.size === 0 || isSubmittingPlans} className="flex items-center space-x-1 rtl:space-x-reverse px-2 py-1 text-xs font-semibold text-white bg-red-500 rounded-md hover:bg-red-600 disabled:bg-slate-400 disabled:cursor-not-allowed">
              <XCircleIcon className="w-4 h-4" /><span>رفض</span>
            </button>
          </div>
        </div>
        {pendingPlanApprovals.map(member => (
          <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-b-md hover:bg-slate-100 dark:hover:bg-slate-700">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <input type="checkbox" checked={selectedPlans.has(member.id)} onChange={() => handleSelectPlan(member.id)} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"/>
                <p className="text-sm text-slate-700 dark:text-slate-300">خطة العمل الأسبوعية لـ <span className="font-semibold">{member.name}</span>.</p>
            </div>
            <button onClick={() => openDecisionModal(member)} className="text-sm font-semibold text-sky-600 dark:text-sky-400">عرض التفاصيل</button>
          </div>
        ))}
      </div>
    );
  };

  const renderTaskApprovals = () => {
    if (pendingTaskApprovals.length === 0) return null;
    const allSelected = pendingTaskApprovals.length > 0 && selectedTasks.size === pendingTaskApprovals.length;

    return (
       <div className="space-y-2 pt-4">
          <h4 className="font-semibold text-slate-600 dark:text-slate-300 text-sm mb-2 px-1">مراجعة المهام</h4>
          <div className="flex justify-between items-center p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 rounded-t-md">
            <label className="flex items-center text-xs font-medium text-slate-600 dark:text-slate-300">
                <input type="checkbox" onChange={handleSelectAllTasks} checked={allSelected} className="ml-2 rtl:ml-0 rtl:mr-2 h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"/>
                تحديد الكل
            </label>
            <div className="flex space-x-2 rtl:space-x-reverse">
                <button onClick={() => handleBulkTaskAction('approved')} disabled={selectedTasks.size === 0 || isSubmittingTasks} className="flex items-center space-x-1 rtl:space-x-reverse px-2 py-1 text-xs font-semibold text-white bg-green-500 rounded-md hover:bg-green-600 disabled:bg-slate-400 disabled:cursor-not-allowed">
                  <CheckCircleIcon className="w-4 h-4" /><span>موافقة</span>
                </button>
            </div>
          </div>
          {pendingTaskApprovals.map(task => (
            <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-b-md hover:bg-slate-100 dark:hover:bg-slate-700">
               <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <input type="checkbox" checked={selectedTasks.has(task.id)} onChange={() => handleSelectTask(task.id)} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"/>
                  <p className="text-sm text-slate-700 dark:text-slate-300">مهمة "<span className="font-semibold">{task.title}</span>" تحتاج إلى مراجعة.</p>
               </div>
              <button onClick={() => openDecisionModal(task)} className="text-sm font-semibold text-sky-600 dark:text-sky-400">اتخاذ قرار</button>
            </div>
          ))}
       </div>
    );
  };
  

  return (
    <div className="p-6" dir="rtl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">لوحة تحكم المدير</h2>
        <p className="text-md text-slate-500 dark:text-slate-400">مرحباً {currentUser?.name}، إليك نظرة على فريقك.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="md:col-span-1 lg:col-span-1 space-y-6">
            <Card title="أعضاء فريقك" icon={<UsersIcon className="w-5 h-5"/>}>
                {directReports.length > 0 ? (
                  <div className="space-y-3">
                      {directReports.map(member => (
                          <div key={member.id} onClick={() => onViewMemberDetail(member.id)} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                                  <img src={member.avatarUrl} alt={member.name} className="w-10 h-10 rounded-full" />
                                  <div>
                                      <p className="font-semibold text-slate-800 dark:text-slate-200">{member.name}</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400">{member.weeklyPlan.status === 'pending' ? 'خطة بانتظار المراجعة' : 'الخطة معتمدة'}</p>
                                  </div>
                              </div>
                              {member.weeklyPlan.status === 'pending' && <span className="text-xs font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-300 px-2 py-1 rounded-full">مراجعة</span>}
                          </div>
                      ))}
                  </div>
                ) : (
                  <EmptyState icon={<UsersIcon className="w-8 h-8"/>} title="لا يوجد أعضاء في فريقك" message="عند إضافة أعضاء يتبعون لك، سيظهرون هنا." />
                )}
            </Card>
        </div>

        <div className="md:col-span-1 lg:col-span-2 space-y-6">
            <Card title="مركز اتخاذ القرار" icon={<ClockIcon className="w-5 h-5"/>}>
                <div className="space-y-4">
                  {pendingPlanApprovals.length === 0 && pendingTaskApprovals.length === 0 ? (
                     <EmptyState icon={<CheckCircleIcon className="w-8 h-8"/>} title="لا توجد موافقات معلقة" message="عمل رائع! لقد قمت بمراجعة جميع الطلبات." />
                  ) : (
                    <>
                      {renderPlanApprovals()}
                      {renderTaskApprovals()}
                    </>
                  )}
                </div>
            </Card>
        </div>

      </div>
        {decisionItem && (
            <DecisionDetailModal
                isOpen={!!decisionItem}
                onClose={() => setDecisionItem(null)}
                item={decisionItem}
            />
        )}
    </div>
  );
};