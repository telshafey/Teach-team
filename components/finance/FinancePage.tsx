import React, { useMemo, useState } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { Card } from '../ui/Card';
import { TeamMember, ExpenseClaim, Project, ExpenseClaimStatus } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { SalaryEditModal } from '../modals/SalaryEditModal';
import { ExpenseClaimFormModal } from '../modals/ExpenseClaimFormModal';
import { CurrencyDollarIcon, PlusIcon, PencilIcon, CheckIcon, NoSymbolIcon, SearchIcon } from '../ui/Icons';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { BarChart, PieChart, PieChartData } from '../ui/Charts';
import { EmptyState } from '../ui/EmptyState';
import { DecisionDetailModal } from '../modals/DecisionDetailModal';
import { calculateProjectCostBreakdown } from '../../utils/costs';

const FinanceOverview: React.FC = () => {
    const { teamMembers, dailyLogs, expenseClaims, currency, overtimeRequests, siteSettings } = useAppDataContext();
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
            const { totalCost } = calculateProjectCostBreakdown(project, teamMembers, dailyLogs, expenseClaims, overtimeRequests, siteSettings);
            return { label: project.name, value: totalCost };
        });
    }, [projects, dailyLogs, teamMembers, expenseClaims, overtimeRequests, siteSettings]);

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

const ProjectFinancialsCard: React.FC<{ project: Project }> = ({ project }) => {
    const { teamMembers, dailyLogs, expenseClaims, currency, overtimeRequests, siteSettings } = useAppDataContext();
    const { employeeCost, freelancerCost, expenseCost, overtimeCost, totalCost } = useMemo(() =>
        calculateProjectCostBreakdown(project, teamMembers, dailyLogs, expenseClaims, overtimeRequests, siteSettings),
        [project, teamMembers, dailyLogs, expenseClaims, overtimeRequests, siteSettings]
    );

    const budget = project.budgetAmount || 0;
    const budgetUsage = budget > 0 ? (totalCost / budget) * 100 : 0;
    const remainingBudget = budget - totalCost;

    const costBreakdownData: PieChartData[] = [
        { label: 'تكلفة الموظفين', value: employeeCost, color: '#38bdf8' }, // sky
        { label: 'تكلفة المستقلين', value: freelancerCost, color: '#6366f1' }, // indigo
        { label: 'تكاليف إضافية', value: overtimeCost, color: '#a855f7' }, // purple
        { label: 'مصروفات أخرى', value: expenseCost, color: '#f59e0b' }, // amber
    ].filter(d => d.value > 0);

    return (
        <Card title={project.name}>
            <div className="space-y-4">
                <div>
                    <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400 mb-1">
                        <span>استخدام الميزانية ({totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} / {budget.toLocaleString()})</span>
                        <span>{budgetUsage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                        <div
                            className={`h-2.5 rounded-full ${budgetUsage > 100 ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(budgetUsage, 100)}%` }}
                        ></div>
                    </div>
                     <p className={`text-xs mt-2 font-semibold ${remainingBudget >= 0 ? 'text-green-600' : 'text-red-400'}`}>
                        {remainingBudget >= 0 ? `المتبقي: ${remainingBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currency}` : `تجاوز: ${Math.abs(remainingBudget).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currency}`}
                    </p>
                </div>
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-200 mb-3">تفصيل التكلفة</h4>
                    <PieChart data={costBreakdownData} />
                </div>
            </div>
        </Card>
    );
};


const ExpenseClaimsTab: React.FC<{onNewClaim: () => void}> = ({ onNewClaim }) => {
    const { expenseClaims, teamMembers, handleUpdateExpenseClaimStatus } = useAppDataContext();
    const { projects } = useProjectContext();
    const { hasPermission } = useAuth();
    const [statusFilter, setStatusFilter] = useState<'all' | ExpenseClaimStatus>('all');

    const filteredClaims = useMemo(() => {
        if (statusFilter === 'all') return expenseClaims;
        return expenseClaims.filter(c => c.status === statusFilter);
    }, [expenseClaims, statusFilter]);
    
    const getStatusBadge = (status: ExpenseClaim['status']) => {
        const styles = {
            pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
            approved: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
            rejected: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
        };
        const text = { pending: 'قيد المراجعة', approved: 'معتمد', rejected: 'مرفوض' };
        return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${styles[status]}`}>{text[status]}</span>;
    };

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
                        <PlusIcon className="w-4 h-4"/><span>طلب صرف جديد</span>
                    </button>
                )}
            </div>
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
                            {hasPermission('approve_expense_claims') && <th className="px-4 py-2">الإجراء</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredClaims.map(claim => {
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
                                    {hasPermission('approve_expense_claims') && (
                                        <td className="px-4 py-2">
                                            {claim.status === 'pending' && (
                                                <div className="flex space-x-2 rtl:space-x-reverse">
                                                    <button onClick={() => handleUpdateExpenseClaimStatus(claim.id, 'approved')} className="p-1.5 text-green-500 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-full" title="موافقة"><CheckIcon className="w-4 h-4" /></button>
                                                    <button onClick={() => handleUpdateExpenseClaimStatus(claim.id, 'rejected')} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full" title="رفض"><NoSymbolIcon className="w-4 h-4" /></button>
                                                </div>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                 {filteredClaims.length === 0 && <p className="text-center text-slate-500 py-8">لا توجد طلبات صرف تطابق هذه الفئة.</p>}
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
                                    {hasPermission('edit_team_members') && (
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

const FreelancerContractsTab: React.FC<{ onReview: (project: Project) => void }> = ({ onReview }) => {
    const { teamMembers, dailyLogs, currency } = useAppDataContext();
    const { projects } = useProjectContext();
    const { currentUser, hasPermission } = useAuth();

    const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
        const styles = {
            pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
            approved: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
            rejected: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
        };
        const text = { pending: 'قيد المراجعة', approved: 'معتمد', rejected: 'مرفوض' };
        return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${styles[status]}`}>{text[status]}</span>;
    };

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
                                        <td className="px-4 py-2">{getStatusBadge(contract.status)}</td>
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
    
    // Manager/GM View
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
                                    <td className="px-4 py-2">{getStatusBadge(contract.status)}</td>
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

export const FinancePage: React.FC = () => {
    const { handleUpdateMember, handleSubmitExpenseClaim } = useAppDataContext();
    const { projects } = useProjectContext();
    const { hasPermission, currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState(currentUser?.roleId === 'freelancer' ? 'freelancer' : 'overview');
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [reviewingItem, setReviewingItem] = useState<Project | null>(null);
    const [projectSearchTerm, setProjectSearchTerm] = useState('');

    const filteredProjects = useMemo(() => {
        return projects.filter(p => p.name.toLowerCase().includes(projectSearchTerm.toLowerCase()));
    }, [projects, projectSearchTerm]);
    
    const handleSaveRate = async (memberId: number, data: { salary?: number; hourlyRate?: number }) => {
        await handleUpdateMember(memberId, data);
        setEditingMember(null);
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">المالية</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">نظرة عامة على التكاليف والمصروفات.</p>
                </div>
            </div>

            <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                <nav className="-mb-px flex space-x-6 rtl:space-x-reverse overflow-x-auto" aria-label="Tabs">
                    {hasPermission('view_finances') && (
                        <button onClick={() => setActiveTab('overview')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                            نظرة عامة
                        </button>
                    )}
                    {hasPermission('view_finances') && (
                        <button onClick={() => setActiveTab('project_financials')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'project_financials' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                            مالية المشاريع
                        </button>
                    )}
                    <button onClick={() => setActiveTab('freelancer')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'freelancer' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                        {currentUser?.roleId === 'freelancer' ? 'عقودي' : 'عقود المستقلين'}
                    </button>
                    <button onClick={() => setActiveTab('expenses')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'expenses' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                        طلبات الصرف
                    </button>
                    {hasPermission('view_all_salaries') && (
                        <button onClick={() => setActiveTab('salaries')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'salaries' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                            الرواتب
                        </button>
                    )}
                </nav>
            </div>

            {activeTab === 'overview' && hasPermission('view_finances') && <FinanceOverview />}
            {activeTab === 'project_financials' && hasPermission('view_finances') && (
                <div className="space-y-6">
                    <div className="relative">
                         <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <SearchIcon className="w-5 h-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="ابحث عن مشروع..."
                            value={projectSearchTerm}
                            onChange={e => setProjectSearchTerm(e.target.value)}
                            className="w-full p-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700"
                        />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredProjects.map(p => <ProjectFinancialsCard key={p.id} project={p} />)}
                         {filteredProjects.length === 0 && <p className="text-slate-500 dark:text-slate-400">لا توجد مشاريع تطابق بحثك.</p>}
                    </div>
                </div>
            )}
            {activeTab === 'freelancer' && <FreelancerContractsTab onReview={setReviewingItem} />}
            {activeTab === 'expenses' && <ExpenseClaimsTab onNewClaim={() => setIsExpenseModalOpen(true)} />}
            {activeTab === 'salaries' && hasPermission('view_all_salaries') && <SalariesTab onEdit={setEditingMember} />}

            {editingMember && (
                <SalaryEditModal
                    isOpen={!!editingMember}
                    onClose={() => setEditingMember(null)}
                    onSave={handleSaveRate}
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
            {reviewingItem && (
                <DecisionDetailModal
                    isOpen={!!reviewingItem}
                    onClose={() => setReviewingItem(null)}
                    item={reviewingItem}
                />
            )}
        </div>
    );
};