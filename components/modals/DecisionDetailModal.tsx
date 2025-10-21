import React, { useState, useEffect } from 'react';
import { TeamMember, Task, PlanStatus, ApprovalStatus, Project, ContractStatus, OvertimeRequest, OvertimeStatus, LeaveRequest, LeaveStatus, WorkContractChangeRequest, WorkContractChangeStatus, Penalty, PenaltyStatus, DecisionItem, LeaveType } from '../../types';
import { useTeamContext } from '../../contexts/TeamContext';
import { useRequestsContext } from '../../contexts/RequestsContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { DAYS_OF_WEEK } from '../../constants';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { isTask, isProject, isOvertimeRequest, isLeaveRequest, isWorkContractChangeRequest, isPenalty, isTeamMember } from '../../utils/typeGuards';


interface DecisionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: DecisionItem | null;
}

export const DecisionDetailModal: React.FC<DecisionDetailModalProps> = ({ isOpen, onClose, item }) => {
  const { handleUpdatePlanStatus, teamMembers, hasPermission } = useTeamContext();
  const { handleUpdateOvertimeStatus, handleUpdateLeaveStatus, handleUpdateWorkContractChangeRequestStatus, handleUpdatePenaltyStatus } = useRequestsContext();
  const { currency } = useSettingsContext();
  const { handleUpdateTaskApproval, projects, handleUpdateProject } = useProjectContext();

  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isDeciding, setIsDeciding] = useState(false);
  const [modifiedValues, setModifiedValues] = useState<{ hours: string, salary: string }>({ hours: '', salary: '' });
  
  useEffect(() => {
    if (item) {
        setNotes((item as any).approvalNotes || (item as any).freelancerContract?.notes || (item as any).managerNotes || '');
        if (isWorkContractChangeRequest(item)) {
            setModifiedValues({
                hours: item.requestedWeeklyHours.toString(),
                salary: item.requestedSalary.toString(),
            });
        }
    } else {
        setNotes('');
    }
    setError('');
    setIsDeciding(false);
  }, [item, isOpen]);

  if (!isOpen || !item) {
    return null;
  }
  
  const handleDecision = async (status: PlanStatus | ApprovalStatus | ContractStatus | OvertimeStatus | LeaveStatus | WorkContractChangeStatus | PenaltyStatus) => {
    const requiresNotes = status === 'rejected' || status === 'needs-adjustment';
    
    if (requiresNotes && !notes.trim() && !isTeamMember(item)) {
        setError('حقل الملاحظات إلزامي عند الرفض أو طلب التعديل.');
        return;
    }

    setIsDeciding(true);
    try {
        if (isTask(item)) {
            await handleUpdateTaskApproval(item.id, status as ApprovalStatus, notes);
        } else if (isProject(item)) {
            const projectToUpdate = projects.find(p => p.id === item.id);
            if (projectToUpdate && projectToUpdate.freelancerContract) {
                const updatedContract = { ...projectToUpdate.freelancerContract, status: status as ContractStatus, notes };
                await handleUpdateProject({ ...projectToUpdate, freelancerContract: updatedContract });
            }
        } else if (isOvertimeRequest(item)) {
            await handleUpdateOvertimeStatus(item.id, status as OvertimeStatus, notes);
        } else if (isLeaveRequest(item)) {
            await handleUpdateLeaveStatus(item.id, status as LeaveStatus, notes);
        } else if (isPenalty(item)) {
            await handleUpdatePenaltyStatus(item.id, status as PenaltyStatus, notes);
        } else if (isWorkContractChangeRequest(item)) {
            const mods = {
                hours: parseFloat(modifiedValues.hours),
                salary: parseFloat(modifiedValues.salary)
            };
            const isModified = mods.hours !== item.requestedWeeklyHours || mods.salary !== item.requestedSalary;
            
            await handleUpdateWorkContractChangeRequestStatus(
                item.id,
                status as WorkContractChangeStatus,
                notes,
                status === 'approved' && isModified ? mods : undefined
            );
        } else if (isTeamMember(item)) {
            await handleUpdatePlanStatus(item.id, status as 'approved' | 'rejected' | 'needs-adjustment');
        }
        onClose();
    } catch (e) {
        console.error("Failed to make decision", e);
    } finally {
        setIsDeciding(false);
    }
  };

  const getPermission = () => {
      if (isTask(item)) return 'approve_task_submissions';
      if (isProject(item)) return 'approve_freelancer_contracts';
      if (isOvertimeRequest(item)) return 'approve_overtime';
      if (isLeaveRequest(item)) return 'approve_leave_requests';
      if (isWorkContractChangeRequest(item)) return 'approve_work_contract_changes';
      if (isPenalty(item)) return 'approve_penalties';
      if (isTeamMember(item)) return 'approve_weekly_plans';
      return null;
  }
  
  const canDecide = getPermission() ? hasPermission(getPermission()!) : false;

  const renderContent = () => {
    const member = teamMembers.find(m => m.id === (item as any).teamMemberId);
    if (isPenalty(item)) {
        return (
            <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">مراجعة جزاء</h3>
                <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    <p><strong>الموظف:</strong> {member?.name}</p>
                    <p><strong>التاريخ:</strong> {format(parseISO(item.date), 'd MMMM yyyy', { locale: arSA })}</p>
                    <p><strong>المبلغ:</strong> {item.amount} {currency}</p>
                    <p><strong>السبب:</strong> {item.reason}</p>
                </div>
                {item.appealReason && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 rounded">
                        <p className="font-bold text-sm text-blue-800 dark:text-blue-200">سبب الاستئناف من الموظف:</p>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{item.appealReason}</p>
                    </div>
                )}
            </div>
        )
    }
    if (isWorkContractChangeRequest(item)) {
        return (
            <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2 truncate">طلب تعديل عقد عمل: {member?.name}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 border-b pb-2"><strong>السبب:</strong> {item.reason}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                        <p className="font-semibold text-slate-500 dark:text-slate-300">الوضع الحالي</p>
                        <p><strong>الساعات:</strong> {item.currentWeeklyHours || 'N/A'}</p>
                        <p><strong>الراتب:</strong> {(item.currentSalary || 0).toLocaleString()} {currency}</p>
                    </div>
                     <div className="space-y-2 p-3 bg-sky-50 dark:bg-sky-900/50 rounded-md">
                        <p className="font-semibold text-sky-800 dark:text-sky-300">الوضع المطلوب</p>
                        <p><strong>الساعات:</strong> {item.requestedWeeklyHours}</p>
                        <p><strong>الراتب:</strong> {item.requestedSalary.toLocaleString()} {currency}</p>
                    </div>
                </div>
                 <div className="mt-4 space-y-2 border-t pt-4">
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">تعديل والموافقة (اختياري)</label>
                     <div className="grid grid-cols-2 gap-4">
                        <input type="number" value={modifiedValues.hours} onChange={e => setModifiedValues(prev => ({...prev, hours: e.target.value}))} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" placeholder="الساعات المعتمدة" />
                        <input type="number" value={modifiedValues.salary} onChange={e => setModifiedValues(prev => ({...prev, salary: e.target.value}))} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" placeholder="الراتب المعتمد" />
                    </div>
                 </div>
            </div>
        )
    }
    if (isLeaveRequest(item)) {
        const leaveTypeMap: Record<LeaveType, string> = {
            'regular': 'عادية',
            'emergency': 'طارئة',
            'work-from-home': 'عمل من المنزل'
        };

        return (
            <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2 truncate">طلب إجازة</h3>
                <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    <p><strong>الموظف:</strong> {member?.name}</p>
                    <p><strong>النوع:</strong> {leaveTypeMap[item.type] || item.type}</p>
                    <p><strong>من:</strong> {format(parseISO(item.startDate), 'd MMM yyyy', { locale: arSA })}</p>
                    <p><strong>إلى:</strong> {format(parseISO(item.endDate), 'd MMM yyyy', { locale: arSA })}</p>
                    <p><strong>السبب:</strong> {item.reason}</p>
                </div>
            </div>
        );
    }
    if (isProject(item) && item.freelancerContract) {
        const contract = item.freelancerContract;
        const freelancer = teamMembers.find(m => m.id === contract.freelancerId);
        let details = '';
        switch(contract.type) {
            case 'fixed': details = `مبلغ ثابت: ${contract.amount} ${currency}`; break;
            case 'hourly': details = `بالساعة: ${contract.hourlyRate} ${currency}/ساعة`; break;
            case 'per-task': details = `بالقطعة (لكل مهمة)`; break;
        }
        return (
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2 truncate">اقتراح عقد لمشروع: {item.name}</h3>
                <div className="space-y-1 text-sm text-slate-600">
                    <p><strong>المستقل:</strong> {freelancer?.name || 'غير معروف'}</p>
                    <p><strong>طريقة الدفع المقترحة:</strong> {details}</p>
                </div>
            </div>
        );
    }
    if (isOvertimeRequest(item)) {
        const weekDate = format(parseISO(item.weekStartDate), 'd MMMM yyyy', { locale: arSA });
        return (
             <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2 truncate">طلب ساعات إضافية</h3>
                <div className="space-y-1 text-sm text-slate-600">
                    <p><strong>الموظف:</strong> {member?.name}</p>
                    <p><strong>الأسبوع الذي يبدأ في:</strong> {weekDate}</p>
                    <p><strong>عدد الساعات المطلوبة:</strong> {item.requestedHours.toFixed(1)} ساعة</p>
                </div>
            </div>
        );
    }
    if (isTask(item)) {
        const project = projects.find(p => p.id === item.projectId);
        const assignedMember = teamMembers.find(m => m.id === item.assignedTo);
        return (
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2 truncate">{item.title}</h3>
                <div className="space-y-1 text-sm text-slate-600">
                    <p><strong>المشروع:</strong> {project?.name || 'غير محدد'}</p>
                    <p><strong>مسندة إلى:</strong> {assignedMember?.name || 'غير مسندة'}</p>
                    <p><strong>تاريخ الاستحقاق:</strong> {item.dueDate || 'غير محدد'}</p>
                </div>
            </div>
        );
    }
    if (isTeamMember(item)) {
        return (
             <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2 truncate">خطة العمل الأسبوعية لـ {item.name}</h3>
                <div className="grid grid-cols-4 gap-2 text-center">
                   {DAYS_OF_WEEK.map(day => (
                       <div key={day} className="p-2 bg-slate-100 dark:bg-slate-700 rounded">
                           <p className="text-xs text-slate-500">{day}</p>
                           <p className="font-semibold text-slate-700 dark:text-slate-200">{item.weeklyPlan.hours[day] || 0}</p>
                       </div>
                   ))}
                </div>
            </div>
        );
    }
    return null;
  };

  const showNotesField = !isTeamMember(item);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-end sm:items-center" dir="rtl">
      <div className="bg-white dark:bg-slate-800 rounded-t-lg sm:rounded-lg shadow-xl pt-8 p-6 w-full max-w-2xl max-h-[calc(var(--vh,1vh)*90)] overflow-y-auto relative">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full sm:hidden"></div>
        <h2 className="text-xl font-bold mb-4 border-b border-slate-200 dark:border-slate-700 pb-3 text-slate-800 dark:text-slate-200">مراجعة واتخاذ قرار</h2>
        <div className="space-y-4">
            {renderContent()}
            {showNotesField && (
              <div>
                   <label htmlFor="notes" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">الملاحظات</label>
                   <textarea 
                      id="notes" 
                      value={notes} 
                      onChange={e => {setNotes(e.target.value); setError('');}}
                      rows={2} 
                      className={`w-full p-2 border rounded-md text-sm ${error ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                   ></textarea>
                   {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
              </div>
            )}
        </div>
        <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
          <button onClick={() => handleDecision('approved')} disabled={isDeciding || !canDecide} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-slate-400">موافقة</button>
          {isTask(item) && <button onClick={() => handleDecision('needs-adjustment')} disabled={isDeciding || !canDecide} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-slate-400">طلب تعديل</button>}
          <button onClick={() => handleDecision('rejected')} disabled={isDeciding || !canDecide} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-slate-400">رفض</button>
          <button type="button" onClick={onClose} disabled={isDeciding} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200">إلغاء</button>
        </div>
      </div>
    </div>
  );
};