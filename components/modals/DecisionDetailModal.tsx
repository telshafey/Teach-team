import React, { useState, useMemo } from 'react';
import { DecisionItem, Task, Project, TeamMember, OvertimeRequest, LeaveRequest, WorkContractChangeRequest, Penalty, ExpenseClaim } from '@shared/types';
import { isTask, isProject, isOvertimeRequest, isLeaveRequest, isWorkContractChangeRequest, isPenalty, isTeamMember, isExpenseClaim } from '@shared/utils/typeGuards';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { useProjectContext } from '@shared/contexts/ProjectContext';
import { useRequestsContext } from '@shared/contexts/RequestsContext';
import { useSettingsContext } from '@shared/contexts/SettingsContext';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface DecisionDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: DecisionItem | null;
}

const DetailRow: React.FC<{ label: string, value: React.ReactNode }> = ({ label, value }) => (
    <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-md font-semibold text-slate-800 dark:text-slate-200">{value}</p>
    </div>
);

export const DecisionDetailModal: React.FC<DecisionDetailModalProps> = ({ isOpen, onClose, item }) => {
    const { teamMembers } = useTeamContext();
    const { handleUpdateTask } = useProjectContext();
    const { handleUpdateLeaveStatus, handleUpdateOvertimeStatus, handleUpdateWorkContractChangeRequestStatus, handleUpdatePenaltyStatus, handleUpdateExpenseClaimStatus } = useRequestsContext();
    const { currency } = useSettingsContext();
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    // For contract changes
    const [approvedHours, setApprovedHours] = useState<number>(0);
    const [approvedSalary, setApprovedSalary] = useState<number>(0);

    React.useEffect(() => {
        if (item && isWorkContractChangeRequest(item)) {
            setApprovedHours(item.requestedWeeklyHours);
            setApprovedSalary(item.requestedSalary);
        }
    }, [item]);


    const details = useMemo(() => {
        if (!item) return null;
        const member = teamMembers.find(m => m.id === (item as any).teamMemberId);
        
        if (isTask(item)) return <DetailRow label="Task" value={item.title} />;
        if (isTeamMember(item)) return <DetailRow label="Employee" value={item.name} />;
        if (isOvertimeRequest(item)) return <><DetailRow label="Employee" value={member?.name || ''} /><DetailRow label="Hours" value={`${item.requestedHours} hours`} /></>;
        if (isLeaveRequest(item)) return <><DetailRow label="Employee" value={member?.name || ''} /><DetailRow label="Dates" value={`${format(parseISO(item.startDate), 'd MMM')} - ${format(parseISO(item.endDate), 'd MMM')}`} /><DetailRow label="Reason" value={item.reason} /></>;
        if (isExpenseClaim(item)) return <><DetailRow label="Employee" value={member?.name || ''} /><DetailRow label="Amount" value={`${item.amount} ${currency}`} /><DetailRow label="Description" value={item.description} /></>;
        if (isPenalty(item)) return <><DetailRow label="Employee" value={member?.name || ''} /><DetailRow label="Amount" value={`${item.amount} ${currency}`} /><DetailRow label="Reason" value={item.reason} /></>;
        if (isWorkContractChangeRequest(item)) return (
            <>
                <DetailRow label="Employee" value={member?.name || ''} />
                <DetailRow label="Current" value={`${item.currentWeeklyHours}h/week, ${item.currentSalary} ${currency}/month`} />
                <DetailRow label="Requested" value={`${item.requestedWeeklyHours}h/week, ${item.requestedSalary} ${currency}/month`} />
                 <DetailRow label="Reason" value={item.reason} />
            </>
        );
        return null;

    }, [item, teamMembers, currency]);

    const handleDecision = async (status: 'approved' | 'rejected' | 'needs-adjustment') => {
        if (!item) return;
        setIsSaving(true);
        try {
            if (isTask(item)) await handleUpdateTask({ id: item.id, approvalStatus: status, approvalNotes: notes });
            if (isLeaveRequest(item)) await handleUpdateLeaveStatus(item.id, status, notes);
            if (isOvertimeRequest(item)) await handleUpdateOvertimeStatus(item.id, status, notes);
            if (isExpenseClaim(item)) await handleUpdateExpenseClaimStatus(item.id, status);
            if (isPenalty(item)) await handleUpdatePenaltyStatus(item.id, status, notes);
            if (isWorkContractChangeRequest(item)) {
                const modifications = status === 'approved' ? { hours: approvedHours, salary: approvedSalary } : undefined;
                await handleUpdateWorkContractChangeRequestStatus(item.id, status, notes, modifications);
            }
            onClose();
        } finally {
            setIsSaving(false);
            setNotes('');
        }
    };

    if (!isOpen || !item) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-lg">
                <h2 className="text-xl font-bold mb-4">Review Request</h2>
                <div className="space-y-4 mb-4">{details}</div>
                
                {isWorkContractChangeRequest(item) && (
                    <div className="p-3 bg-slate-100 rounded-md space-y-2 mb-4">
                        <h4 className="font-semibold text-sm">Approve with Modifications (Optional)</h4>
                        <div className="grid grid-cols-2 gap-2">
                             <div><label className="text-xs">Approved Hours</label><input type="number" value={approvedHours} onChange={e => setApprovedHours(Number(e.target.value))} className="w-full p-1 border rounded" /></div>
                             <div><label className="text-xs">Approved Salary</label><input type="number" value={approvedSalary} onChange={e => setApprovedSalary(Number(e.target.value))} className="w-full p-1 border rounded" /></div>
                        </div>
                    </div>
                )}
                
                <div>
                    <label htmlFor="managerNotes" className="text-sm font-medium">Notes (Optional)</label>
                    <textarea id="managerNotes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full p-2 border rounded-md mt-1" />
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 rounded-md">Cancel</button>
                    {isTask(item) && <button onClick={() => handleDecision('needs-adjustment')} className="px-4 py-2 bg-blue-500 text-white rounded-md">Needs Adjustment</button>}
                    <button onClick={() => handleDecision('rejected')} className="px-4 py-2 bg-red-500 text-white rounded-md">Reject</button>
                    <button onClick={() => handleDecision('approved')} className="px-4 py-2 bg-green-500 text-white rounded-md">Approve</button>
                </div>
            </div>
        </div>
    );
};