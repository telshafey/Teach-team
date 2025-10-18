import React from 'react';
import { useTeamContext } from '../../contexts/TeamContext';
import { useTimeLogContext } from '../../contexts/TimeLogContext';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { Card } from '../ui/Card';
import { Project } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { EmptyState } from '../ui/EmptyState';
import { StatusBadge } from '../ui/StatusBadge';

interface FreelancerContractsTabProps {
    onReview: (project: Project) => void;
}

export const FreelancerContractsTab: React.FC<FreelancerContractsTabProps> = ({ onReview }) => {
    const { teamMembers, hasPermission } = useTeamContext();
    const { dailyLogs } = useTimeLogContext();
    const { currency } = useSettingsContext();
    const { projects } = useProjectContext();
    const { currentUser } = useAuth();

    if (currentUser?.roleId === 'freelancer') {
        const myContracts = projects.filter(p => p.freelancerContract?.freelancerId === currentUser.id);
        const totalEarnings = myContracts.reduce((sum, p) => {
            const contract = p.freelancerContract;
            if (contract?.status !== 'approved') return sum;
            if (contract.type === 'fixed') return sum + (contract.amount || 0);
            if (contract.type === 'hourly') {
                const hours = dailyLogs.filter(l => l.projectId === p.id && l.teamMemberId === currentUser.id).reduce((h, l) => h + l.hours, 0);
                return sum + (hours * (contract.hourlyRate || 0));
            }
            return sum;
        }, 0);

        return (
            <div className="space-y-6">
                <Card title="إجمالي الأرباح المعتمدة"><p className="text-2xl font-bold">{totalEarnings.toLocaleString()} <span className="text-sm">{currency}</span></p></Card>
                <Card title="عقودي">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-300">
                                <tr>
                                    <th className="px-4 py-2">المشروع</th><th className="px-4 py-2">نوع العقد</th><th className="px-4 py-2">المبلغ / السعر</th><th className="px-4 py-2">الحالة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myContracts.map(p => {
                                    const contract = p.freelancerContract!;
                                    return (
                                    <tr key={p.id} className="border-b dark:border-slate-700">
                                        <td className="px-4 py-2 font-medium">{p.name}</td>
                                        <td className="px-4 py-2">{contract.type === 'fixed' ? 'سعر ثابت' : contract.type === 'hourly' ? 'بالساعة' : 'بالقطعة'}</td>
                                        <td className="px-4 py-2">{contract.amount || contract.hourlyRate || '-'}</td>
                                        <td className="px-4 py-2"><StatusBadge status={contract.status} type="contract" /></td>
                                    </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        )
    }
    
    const projectsWithContracts = projects.filter(p => p.freelancerContract);
    if (projectsWithContracts.length === 0) {
        return <Card><EmptyState title="لا توجد عقود" message="لم يتم إنشاء عقود مع مستقلين بعد." /></Card>
    }
    
    return (
        <Card>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-300">
                        <tr>
                            <th className="px-4 py-2">المشروع</th><th className="px-4 py-2">المستقل</th><th className="px-4 py-2">نوع العقد</th><th className="px-4 py-2">المبلغ / السعر</th><th className="px-4 py-2">الحالة</th><th className="px-4 py-2">الإجراء</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projectsWithContracts.map(p => {
                            const contract = p.freelancerContract!;
                            const freelancer = teamMembers.find(m => m.id === contract.freelancerId);
                            return (
                                <tr key={p.id} className="border-b dark:border-slate-700">
                                    <td className="px-4 py-2 font-medium">{p.name}</td>
                                    <td className="px-4 py-2">{freelancer?.name}</td>
                                    <td className="px-4 py-2">{contract.type === 'fixed' ? 'سعر ثابت' : 'بالساعة'}</td>
                                    <td className="px-4 py-2">{contract.amount || contract.hourlyRate || '-'}</td>
                                    <td className="px-4 py-2"><StatusBadge status={contract.status} type="contract" /></td>
                                    <td className="px-4 py-2">
                                        {contract.status === 'pending' && hasPermission('approve_freelancer_contracts') && <button onClick={() => onReview(p)} className="text-sm font-semibold text-sky-600">مراجعة</button>}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    )
};