import React, { useMemo, useState } from 'react';
import { useRequestsContext } from '../../contexts/RequestsContext';
import { useTeamContext } from '../../contexts/TeamContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { Card } from '../ui/Card';
import { ExpenseClaim, ExpenseClaimStatus } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { PlusIcon, CheckIcon, NoSymbolIcon } from '../ui/Icons';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { StatusBadge } from '../ui/StatusBadge';

interface ExpenseClaimsTabProps {
    onNewClaim: () => void;
}

export const ExpenseClaimsTab: React.FC<ExpenseClaimsTabProps> = ({ onNewClaim }) => {
    const { expenseClaims, handleUpdateExpenseClaimStatus } = useRequestsContext();
    const { teamMembers, hasPermission } = useTeamContext();
    const { projects } = useProjectContext();
    const { currency } = useSettingsContext();
    const { currentUser } = useAuth();
    const [statusFilter, setStatusFilter] = useState<'all' | ExpenseClaimStatus>('all');

    const claimsToDisplay = useMemo(() => {
        let claims = expenseClaims;
        if (!hasPermission('approve_expense_claims')) {
            claims = claims.filter(c => c.teamMemberId === currentUser?.id);
        }
        if (statusFilter === 'all') return claims;
        return claims.filter(c => c.status === statusFilter);
    }, [expenseClaims, statusFilter, currentUser, hasPermission]);
    
    const filterOptions: {label: string, value: 'all' | ExpenseClaimStatus}[] = [
        {label: 'الكل', value: 'all'},
        {label: 'قيد المراجعة', value: 'pending'},
        {label: 'معتمدة', value: 'approved'},
        {label: 'مرفوضة', value: 'rejected'},
    ];

    return (
        <Card>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    {filterOptions.map(opt => (
                        <button key={opt.value} onClick={() => setStatusFilter(opt.value)} className={`px-3 py-1.5 text-sm rounded-full ${statusFilter === opt.value ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{opt.label}</button>
                    ))}
                </div>
                {hasPermission('submit_expenses') && (
                    <button onClick={onNewClaim} className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-1.5 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 w-full sm:w-auto">
                        <PlusIcon className="w-4 h-4"/><span>تقديم طلب صرف</span>
                    </button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                     <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-300">
                        <tr>
                            <th className="px-4 py-2">الموظف</th>
                            <th className="px-4 py-2">المبلغ ({currency})</th>
                            <th className="px-4 py-2">التاريخ</th>
                            <th className="px-4 py-2">المشروع</th>
                            <th className="px-4 py-2">الوصف</th>
                            <th className="px-4 py-2">الحالة</th>
                            {hasPermission('approve_expense_claims') && <th className="px-4 py-2">الإجراء</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {claimsToDisplay.map(claim => {
                            const member = teamMembers.find(m => m.id === claim.teamMemberId);
                            const project = projects.find(p => p.id === claim.projectId);
                            return (
                            <tr key={claim.id} className="border-b dark:border-slate-700">
                                <td className="px-4 py-2 font-medium">{member?.name}</td>
                                <td className="px-4 py-2">{claim.amount}</td>
                                <td className="px-4 py-2">{format(parseISO(claim.date), 'd MMM yyyy', { locale: arSA })}</td>
                                <td className="px-4 py-2">{project?.name || '-'}</td>
                                <td className="px-4 py-2 truncate max-w-xs">{claim.description}</td>
                                <td className="px-4 py-2"><StatusBadge status={claim.status} type="request" /></td>
                                {hasPermission('approve_expense_claims') && (
                                    <td className="px-4 py-2">
                                        {claim.status === 'pending' && (
                                            <div className="flex space-x-2 rtl:space-x-reverse">
                                                <button onClick={() => handleUpdateExpenseClaimStatus(claim.id, 'approved')} className="p-1.5 text-green-500 hover:bg-green-100 rounded-full"><CheckIcon className="w-4 h-4"/></button>
                                                <button onClick={() => handleUpdateExpenseClaimStatus(claim.id, 'rejected')} className="p-1.5 text-red-500 hover:bg-red-100 rounded-full"><NoSymbolIcon className="w-4 h-4"/></button>
                                            </div>
                                        )}
                                    </td>
                                )}
                            </tr>
                        )})}
                    </tbody>
                </table>
                 {claimsToDisplay.length === 0 && <p className="text-center text-slate-500 py-8">لا توجد طلبات صرف تطابق هذه الفئة.</p>}
            </div>
        </Card>
    );
};