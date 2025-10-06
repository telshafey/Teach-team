import React, { useState, useEffect } from 'react';
import { TeamMember, Task, PlanStatus, ApprovalStatus, Project, ContractStatus } from '../../types';
import { useAppDataContext } from '../../contexts/DataContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { DAYS_OF_WEEK } from '../../constants';

interface DecisionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: TeamMember | Task | Project | null;
}

// Type guards
function isTask(item: unknown): item is Task {
  const task = item as Task;
  return task && typeof task.title === 'string' && typeof task.projectId === 'string';
}

function isTeamMember(item: unknown): item is TeamMember {
  const member = item as TeamMember;
  return member && typeof member.name === 'string' && typeof member.roleId === 'string' && !isTask(item) && !isProject(item);
}

function isProject(item: unknown): item is Project {
    const project = item as Project;
    return project && typeof project.name === 'string' && typeof project.status === 'string' && !isTask(item) && !isTeamMember(item);
}


export const DecisionDetailModal: React.FC<DecisionDetailModalProps> = ({ isOpen, onClose, item }) => {
  const { handleUpdatePlanStatus, teamMembers } = useAppDataContext();
  const { handleUpdateTaskApproval, projects, handleUpdateProject } = useProjectContext();
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isDeciding, setIsDeciding] = useState(false);
  
  useEffect(() => {
    if (item && (isTask(item) || isProject(item))) {
        setNotes((item as any).approvalNotes || (item as any).freelancerContract?.notes || '');
    } else {
        setNotes('');
    }
    setError('');
    setIsDeciding(false);
  }, [item, isOpen]);

  if (!isOpen || !item) {
    return null;
  }
  
  const handleDecision = async (status: PlanStatus | ApprovalStatus | ContractStatus) => {
    const requiresNotes = status === 'rejected' || status === 'needs-adjustment';
    
    if ((isTask(item) || isProject(item)) && requiresNotes && !notes.trim()) {
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
        } else if (isTeamMember(item)) {
            await handleUpdatePlanStatus(item.id, status as PlanStatus);
        }
        onClose();
    } catch (e) {
        console.error("Failed to make decision", e);
    } finally {
        setIsDeciding(false);
    }
  };

  const renderBillingDetails = (project: Project) => {
    const contract = project.freelancerContract;
    if (!contract) return <p>لا توجد تفاصيل عقد.</p>;
    const freelancer = teamMembers.find(m => m.id === contract.freelancerId);
    let details = '';
    switch(contract.type) {
        case 'fixed': details = `مبلغ ثابت: ${contract.amount} ريال`; break;
        case 'hourly': details = `بالساعة: ${contract.hourlyRate} ريال/ساعة`; break;
        case 'per-task': details = `بالقطعة (لكل مهمة)`; break;
    }
    return (
        <div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">اقتراح عقد لمشروع: {project.name}</h3>
            <div className="space-y-1 text-sm text-slate-600">
                <p><strong>المستقل:</strong> {freelancer?.name || 'غير معروف'}</p>
                <p><strong>طريقة الدفع المقترحة:</strong> {details}</p>
            </div>
        </div>
    );
  };
  
  const renderContent = () => {
    if (isProject(item) && item.freelancerContract) {
        return renderBillingDetails(item);
    }
    if (isTask(item)) {
        const project = projects.find(p => p.id === item.projectId);
        const assignedMember = teamMembers.find(m => m.id === item.assignedTo);
        return (
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{item.title}</h3>
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
                <h3 className="text-lg font-bold text-slate-800 mb-2">خطة العمل الأسبوعية لـ {item.name}</h3>
                <div className="grid grid-cols-4 gap-2 text-center">
                   {DAYS_OF_WEEK.map(day => (
                       <div key={day} className="p-2 bg-slate-100 rounded">
                           <p className="text-xs text-slate-500">{day}</p>
                           <p className="font-semibold text-slate-700">{item.weeklyPlan.hours[day] || 0}</p>
                       </div>
                   ))}
                </div>
            </div>
        );
    }
    return null;
  };

  const showNotesField = isTask(item) || isProject(item);
  const showNeedsAdjustment = isTask(item) || isTeamMember(item);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-xl">
        <h2 className="text-xl font-bold mb-4 border-b pb-3 text-slate-800">مراجعة واتخاذ قرار</h2>
        <div className="space-y-4">
            {renderContent()}
            {showNotesField && (
              <div>
                   <label htmlFor="notes" className="block text-sm font-medium text-slate-600 mb-1">الملاحظات (إلزامية عند الرفض)</label>
                   <textarea 
                      id="notes" 
                      value={notes} 
                      onChange={e => {setNotes(e.target.value); setError('');}}
                      rows={3} 
                      className={`w-full p-2 border rounded-md text-sm ${error ? 'border-red-500' : 'border-slate-300'}`}
                   ></textarea>
                   {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
              </div>
            )}
        </div>
        <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4 mt-4 border-t border-slate-200">
          <button onClick={() => handleDecision('approved')} disabled={isDeciding} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-slate-400">موافقة</button>
          {showNeedsAdjustment && <button onClick={() => handleDecision('needs-adjustment')} disabled={isDeciding} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-slate-400">طلب تعديل</button>}
          <button onClick={() => handleDecision('rejected')} disabled={isDeciding} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-slate-400">رفض</button>
          <button type="button" onClick={onClose} disabled={isDeciding} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200">إلغاء</button>
        </div>
      </div>
    </div>
  );
};
