import React, { useMemo, useState } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { Card } from '../ui/Card';
import { TeamMember, ExpenseClaim } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { SalaryEditModal } from '../modals/SalaryEditModal';
import { ExpenseClaimFormModal } from '../modals/ExpenseClaimFormModal';
import { CurrencyDollarIcon, PlusIcon, PencilIcon, CheckCircleIcon, ClockIcon, XCircleIcon } from '../ui/Icons';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { BarChart } from '../ui/Charts';
import { EmptyState } from '../ui/EmptyState';

const FinanceOverview: React.FC = () => {
    const { teamMembers, dailyLogs, expenseClaims, currency } = useAppDataContext();
    const { projects } = useProjectContext();

    const totalSalaries = useMemo(() => {
        return teamMembers
            .filter(m => m.salary)
            .reduce((sum, m) => sum + (m.salary || 0), 0);
    }, [teamMembers]);

    const totalApprovedExpenses = useMemo(() => {
        return expenseClaims
            .filter(e => e.status === 'approved')
            .reduce((sum, e) => sum + e.amount, 0);
    }, [expenseClaims]);

    const projectCosts = useMemo(() => {
        return projects.map(project => {
            const projectLogs = dailyLogs.filter(l => l.projectId === project.id);
            const projectExpenses = expenseClaims.filter(e => e.projectId === project.id && e.status === 'approved').reduce((s, e) => s + e.amount, 0);
            let laborCost = 0;
            projectLogs.forEach(log => {
                const member = teamMembers.find(m => m.id === log.teamMemberId);
                if (member) {
                    if (member.hourlyRate) laborCost += log.hours * member.hourlyRate;
                    else if (member.salary) laborCost += log.hours * (member.salary / (22 * 8));
                }
            });
            return { label: project.name, value: laborCost + projectExpenses };
        });
    }, [projects, dailyLogs, teamMembers, expenseClaims]);

    const top5CostlyProjects = useMemo(() => {
        return projectCosts.sort((a, b) => b.value - a.value).slice(0, 5);
    }, [projectCosts]);
    
    const totalProjectCosts = projectCosts.reduce((sum, p) => sum + p.value, 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card title="إجمالي الرواتب الشهرية"><p className="text-2xl font-bold">{totalSalaries.toLocaleString()} <span className="text-sm">{currency}</span></p></Card>
                <Card title="إجمالي المصروفات المعتمدة"><p className="text-2xl font-bold">{totalApprovedExpenses.toLocaleString()} <span className="text-sm">{currency}</span></p></Card>
                <Card title="إجمالي تكاليف المشاريع"><p className="text-2xl font-bold">{totalProjectCosts.toLocaleString(undefined, {maximumFractionDigits: 0})} <span className="text-sm">{currency}</span></p></Card>
            </div>
            <Card title="أكثر المشاريع تكلفة">
                <BarChart title="" data={top5CostlyProjects} />
            </Card>
        </div>
    );
};

const ExpenseClaimsTab: React.FC = () => {
    const { expenseClaims, teamMembers } = useAppDataContext();
    const { projects } = useProjectContext();
    
    const getStatusBadge = (status: ExpenseClaim['status']) => {
        const styles = {
            pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
            approved: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
            rejected: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
        };
        const text = { pending: 'قيد المراجعة', approved: 'معتمد', rejected: 'مرفوض' };
        return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${styles[status]}`}>{text[status]}</span>;
    };

    return (
        <Card>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-300">
                        <tr>
                            <th className="px-4 py-2">الموظف</th>
                            <th className="px-4 py-2">المشروع</th>
                            <th className="px-4 py-2">المبلغ</th>
                            <th className="px-4 py-2">التاريخ</th>
                            <th className="px-4 py-2">الوصف</th>
                            <th className="px-4 py-2">الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
                        {expenseClaims.map(claim => {
                            const member = teamMembers.find(m => m.id === claim.teamMemberId);
                            const project = projects.find(p => p.id === claim.projectId);
                            return (
                                <tr key={claim.id} className="border-b dark:border-slate-700">
                                    <td className="px-4 py-2 font-medium">{member?.name}</td>
                                    <td className="px-4 py-2">{project?.name || '-'}</td>
                                    <td className="px-4 py-2">{claim.amount}</td>
                                    <td className="px-4 py-2">{format(parseISO(claim.date), 'd MMM yyyy', { locale: arSA })}</td>
                                    <td className="px-4 py-2">{claim.description}</td>
                                    <td className="px-4 py-2">{getStatusBadge(claim.status)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

const SalariesTab: React.FC<{ onEdit: (member: TeamMember) => void }> = ({ onEdit }) => {
    const { teamMembers, currency } = useAppDataContext();
    const { hasPermission } = useAuth();
    
    return (
        <Card>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-300">
                        <tr>
                            <th className="px-4 py-2">الموظف</th>
                            <th className="px-4 py-2">الراتب / سعر الساعة ({currency})</th>
                            <th className="px-4 py-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {teamMembers.map(member => (
                            <tr key={member.id} className="border-b dark:border-slate-700">
                                <td className="px-4 py-2 font-medium">{member.name}</td>
                                <td className="px-4 py-2">{member.salary || member.hourlyRate || 'N/A'}</td>
                                <td className="px-4 py-2 text-left">
                                    {hasPermission('manage_team') && member.roleId !== 'freelancer' && (
                                        <button onClick={() => onEdit(member)} className="p-2 text-slate-500 hover:text-sky-600"><PencilIcon className="w-4 h-4" /></button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    )
}

export const FinancePage: React.FC = () => {
    const { currency, handleUpdateMember, handleSubmitExpenseClaim } = useAppDataContext();
    const { hasPermission } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    
    const handleSaveSalary = async (memberId: number, salary: number) => {
        const member = editingMember;
        if (member) {
            await handleUpdateMember({ ...member, salary });
        }
        setEditingMember(null);
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">المالية</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">نظرة عامة على التكاليف والمصروفات.</p>
                </div>
                {hasPermission('submit_expenses') && (
                    <button onClick={() => setIsExpenseModalOpen(true)} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                        <PlusIcon className="w-5 h-5"/><span>تقديم طلب صرف</span>
                    </button>
                )}
            </div>

            <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                <nav className="-mb-px flex space-x-6 rtl:space-x-reverse" aria-label="Tabs">
                    <button onClick={() => setActiveTab('overview')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                        نظرة عامة
                    </button>
                    <button onClick={() => setActiveTab('expenses')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'expenses' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                        طلبات الصرف
                    </button>
                    <button onClick={() => setActiveTab('salaries')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'salaries' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                        الرواتب
                    </button>
                </nav>
            </div>

            {activeTab === 'overview' && <FinanceOverview />}
            {activeTab === 'expenses' && <ExpenseClaimsTab />}
            {activeTab === 'salaries' && <SalariesTab onEdit={setEditingMember} />}

            {editingMember && (
                <SalaryEditModal
                    isOpen={!!editingMember}
                    onClose={() => setEditingMember(null)}
                    onSave={handleSaveSalary}
                    member={editingMember}
                />
            )}
            {isExpenseModalOpen && (
                <ExpenseClaimFormModal
                    isOpen={isExpenseModalOpen}
                    onClose={() => setIsExpenseModalOpen(false)}
                    onSave={handleSubmitExpenseClaim}
                />
            )}
        </div>
    );
};