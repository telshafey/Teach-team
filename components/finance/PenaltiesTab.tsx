import React, { useMemo, useState } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Penalty, PenaltyStatus } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { PlusIcon } from '../ui/Icons';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface PenaltiesTabProps {
    penalties: Penalty[];
    onReview: (penalty: Penalty) => void;
    onNew: () => void;
}

export const PenaltiesTab: React.FC<PenaltiesTabProps> = ({ penalties, onReview, onNew }) => {
    const { teamMembers, currency } = useAppDataContext();
    const { hasPermission } = useAuth();
    const [statusFilter, setStatusFilter] = useState<'all' | PenaltyStatus>('all');

    const filteredPenalties = useMemo(() => {
        if (statusFilter === 'all') return penalties;
        return penalties.filter(p => p.status === statusFilter);
    }, [penalties, statusFilter]);

    const getStatusBadge = (status: PenaltyStatus) => {
        const styles: Record<PenaltyStatus, string> = {
            pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
            approved: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
            rejected: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
            appealed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
        };
        const text: Record<PenaltyStatus, string> = { pending: 'قيد المراجعة', approved: 'معتمد', rejected: 'مرفوض', appealed: 'مستأنف' };
        return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${styles[status]}`}>{text[status]}</span>;
    };

    const filterOptions: { label: string; value: 'all' | PenaltyStatus }[] = [
        { label: 'الكل', value: 'all' },
        { label: 'قيد المراجعة', value: 'pending' },
        { label: 'معتمدة', value: 'approved' },
        { label: 'مرفوضة', value: 'rejected' },
    ];

    return (
        <Card>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    {filterOptions.map(opt => (
                        <button key={opt.value} onClick={() => setStatusFilter(opt.value)} className={`px-3 py-1.5 text-sm rounded-full ${statusFilter === opt.value ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{opt.label}</button>
                    ))}
                </div>
                {hasPermission('issue_penalties') && (
                    <button onClick={onNew} className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-1.5 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 w-full sm:w-auto">
                        <PlusIcon className="w-4 h-4" /><span>إصدار جزاء جديد</span>
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
                            <th className="px-4 py-2">السبب</th>
                            <th className="px-4 py-2">الحالة</th>
                            {hasPermission('approve_penalties') && <th className="px-4 py-2">الإجراء</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPenalties.map(penalty => {
                            const member = teamMembers.find(m => m.id === penalty.teamMemberId);
                            return (
                                <tr key={penalty.id} className="border-b dark:border-slate-700">
                                    <td className="px-4 py-2 font-medium">{member?.name}</td>
                                    <td className="px-4 py-2">{penalty.amount}</td>
                                    <td className="px-4 py-2">{format(parseISO(penalty.date), 'd MMM yyyy', { locale: arSA })}</td>
                                    <td className="px-4 py-2 truncate max-w-xs">{penalty.reason}</td>
                                    <td className="px-4 py-2">{getStatusBadge(penalty.status)}</td>
                                    {hasPermission('approve_penalties') && (
                                        <td className="px-4 py-2">
                                            {penalty.status === 'pending' && (
                                                <button onClick={() => onReview(penalty)} className="text-xs font-semibold text-sky-600 hover:text-sky-800">مراجعة</button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                {filteredPenalties.length === 0 && <p className="text-center text-slate-500 py-8">لا توجد جزاءات تطابق هذه الفئة.</p>}
            </div>
        </Card>
    );
};