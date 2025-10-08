import React, { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppDataContext } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { NoSymbolIcon } from '../ui/Icons';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { PenaltyStatus } from '../../types';

export const ProfilePenalties: React.FC = () => {
    const { currentUser } = useAuth();
    const { penalties, currency } = useAppDataContext();
    
    const myPenalties = useMemo(() => {
        if (!currentUser) return [];
        return penalties
            .filter(p => p.teamMemberId === currentUser.id)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [penalties, currentUser]);

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

    return (
        <Card title="سجل الجزاءات" icon={<NoSymbolIcon className="w-5 h-5" />}>
           <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-300">
                        <tr>
                            <th className="px-4 py-2">التاريخ</th>
                            <th className="px-4 py-2">المبلغ ({currency})</th>
                            <th className="px-4 py-2">السبب</th>
                            <th className="px-4 py-2">الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
                        {myPenalties.map(p => (
                            <tr key={p.id} className="border-b dark:border-slate-700">
                                <td className="px-4 py-2">{format(parseISO(p.date), 'd MMM yyyy', { locale: arSA })}</td>
                                <td className="px-4 py-2">{p.amount}</td>
                                <td className="px-4 py-2">{p.reason}</td>
                                <td className="px-4 py-2">{getStatusBadge(p.status)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {myPenalties.length === 0 && <p className="text-center text-slate-500 py-4">لا توجد جزاءات مسجلة.</p>}
            </div>
        </Card>
    );
};