import React, { useState } from 'react';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { useRequestsContext } from '@shared/contexts/RequestsContext';
import { useSettingsContext } from '@shared/contexts/SettingsContext';
import { Card } from '../ui/Card';
import { TeamMember, SalarySlipData } from '@shared/types';
import { generateSalarySlipData } from '@shared/utils/salarySlip';
import { SalarySlipModal } from '../modals/SalarySlipModal';
import { format } from 'date-fns';

export const SalarySlipsTab: React.FC = () => {
    const { teamMembers } = useTeamContext();
    const { overtimeRequests, expenseClaims, penalties } = useRequestsContext();
    const { siteSettings } = useSettingsContext();

    const [selectedMemberId, setSelectedMemberId] = useState<string>('');
    const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
    const [slipData, setSlipData] = useState<SalarySlipData | null>(null);

    const handleGenerate = () => {
        if (!selectedMemberId || !selectedMonth) return;

        const member = teamMembers.find(m => m.id === parseInt(selectedMemberId));
        if (!member) return;

        const monthDate = new Date(selectedMonth + '-02'); // Use day 2 to avoid timezone issues with day 1

        const data = generateSalarySlipData(member, monthDate, overtimeRequests, expenseClaims, penalties, siteSettings);
        setSlipData(data);
    };
    
    const membersWithSalary = teamMembers.filter(m => m.salary);

    return (
        <>
            <Card>
                <div className="p-4 space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">إنشاء قسيمة راتب</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="member-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الموظف</label>
                            <select id="member-select" value={selectedMemberId} onChange={e => setSelectedMemberId(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md">
                                <option value="" disabled>-- اختر موظف --</option>
                                {membersWithSalary.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="month-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الشهر</label>
                            <input type="month" id="month-select" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md" />
                        </div>
                        <div className="flex items-end">
                            <button onClick={handleGenerate} disabled={!selectedMemberId || !selectedMonth} className="w-full px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
                                إنشاء القسيمة
                            </button>
                        </div>
                    </div>
                </div>
            </Card>

            <SalarySlipModal isOpen={!!slipData} onClose={() => setSlipData(null)} slipData={slipData} />
        </>
    );
};
