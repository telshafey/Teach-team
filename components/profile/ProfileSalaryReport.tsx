import React, { useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppDataContext } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { CurrencyDollarIcon, ChevronLeftIcon, ChevronRightIcon } from '../ui/Icons';
import { format, startOfMonth, endOfMonth, isWithinInterval, addMonths, subMonths, isSameMonth, isAfter } from 'date-fns';
import { arSA } from 'date-fns/locale';

export const ProfileSalaryReport: React.FC = () => {
    const { currentUser } = useAuth();
    const { overtimeRequests, expenseClaims, penalties, currency, siteSettings } = useAppDataContext();
    const [viewedMonth, setViewedMonth] = useState(new Date());

    const salaryReportData = useMemo(() => {
        if (!currentUser?.salary) return null;

        const startOfMonthForView = startOfMonth(viewedMonth);
        const endOfMonthForView = endOfMonth(viewedMonth);

        const myOvertimes = overtimeRequests.filter(o => o.teamMemberId === currentUser.id);
        const myExpenses = expenseClaims.filter(e => e.teamMemberId === currentUser.id);
        const myPenalties = penalties.filter(p => p.teamMemberId === currentUser.id);

        const approvedOvertimeHours = myOvertimes
            .filter(r => r.status === 'approved' && isWithinInterval(new Date(r.weekStartDate), { start: startOfMonthForView, end: endOfMonthForView }))
            .reduce((sum, r) => sum + r.requestedHours, 0);
            
        const approvedExpensesAmount = myExpenses
            .filter(e => e.status === 'approved' && isWithinInterval(new Date(e.date), { start: startOfMonthForView, end: endOfMonthForView }))
            .reduce((sum, e) => sum + e.amount, 0);

        const approvedPenaltiesAmount = myPenalties
            .filter(p => p.status === 'approved' && isWithinInterval(new Date(p.date), { start: startOfMonthForView, end: endOfMonthForView }))
            .reduce((sum, p) => sum + p.amount, 0);
            
        const hourlyRate = currentUser.salary / (22 * 8); // Approximation
        const overtimeMultiplier = siteSettings?.overtimeRateMultiplier || 1.5;
        const overtimePay = approvedOvertimeHours * hourlyRate * overtimeMultiplier;

        const totalEstimated = currentUser.salary + overtimePay + approvedExpensesAmount - approvedPenaltiesAmount;

        return {
            baseSalary: currentUser.salary,
            overtimePay,
            approvedExpensesAmount,
            approvedPenaltiesAmount,
            totalEstimated
        };
    }, [currentUser, overtimeRequests, expenseClaims, penalties, viewedMonth, siteSettings]);

    if (!salaryReportData) {
        return <Card><p className="p-4 text-center text-slate-500">لا توجد بيانات راتب لعرضها.</p></Card>;
    }

    return (
        <Card 
            icon={<CurrencyDollarIcon className="w-5 h-5"/>}
            title={`تقرير الراتب لشهر ${format(viewedMonth, 'MMMM yyyy', { locale: arSA })}`}
            headerActions={
                <div className="flex items-center space-x-2">
                    <button onClick={() => setViewedMonth(prev => subMonths(prev, 1))} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                        <ChevronRightIcon className="w-5 h-5 text-slate-500" />
                    </button>
                     <button onClick={() => setViewedMonth(prev => addMonths(prev, 1))} disabled={isSameMonth(viewedMonth, new Date()) || isAfter(viewedMonth, new Date())} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50">
                        <ChevronLeftIcon className="w-5 h-5 text-slate-500" />
                    </button>
                </div>
            }
        >
            <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                    <span className="font-medium text-slate-600 dark:text-slate-300">الراتب الأساسي</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{salaryReportData.baseSalary.toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                    <span className="font-medium text-slate-600 dark:text-slate-300">قيمة الساعات الإضافية المعتمدة</span>
                    <span className="font-bold text-green-600 dark:text-green-400">+ {salaryReportData.overtimePay.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                    <span className="font-medium text-slate-600 dark:text-slate-300">قيمة المصروفات المعتمدة</span>
                    <span className="font-bold text-green-600 dark:text-green-400">+ {salaryReportData.approvedExpensesAmount.toLocaleString()} {currency}</span>
                </div>
                 <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/30 rounded-md">
                    <span className="font-medium text-red-700 dark:text-red-300">الخصومات والجزاءات المعتمدة</span>
                    <span className="font-bold text-red-600 dark:text-red-400">- {salaryReportData.approvedPenaltiesAmount.toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between items-center p-4 border-t-2 border-dashed border-slate-300 dark:border-slate-600 mt-4">
                    <span className="text-base font-bold text-slate-800 dark:text-slate-100">إجمالي الراتب المتوقع</span>
                    <span className="text-lg font-extrabold text-sky-600 dark:text-sky-400">{salaryReportData.totalEstimated.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}</span>
                </div>
            </div>
        </Card>
    );
};