import React, { useMemo, useState } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { Project } from '../../types';
import { calculateProjectCostBreakdown } from '../../utils/costs';
import { Card } from '../ui/Card';
import { PieChart, PieChartData } from '../ui/Charts';
import { SearchIcon } from '../ui/Icons';

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

export const ProjectFinancials: React.FC = () => {
    const { projects } = useProjectContext();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProjects = useMemo(() => {
        return projects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [projects, searchTerm]);

    return (
        <div className="space-y-6">
            <div className="relative">
                 <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <SearchIcon className="w-5 h-5 text-slate-400" />
                </div>
                <input
                    type="text"
                    placeholder="ابحث عن مشروع..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700"
                />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredProjects.map(p => <ProjectFinancialsCard key={p.id} project={p} />)}
                 {filteredProjects.length === 0 && <p className="lg:col-span-2 text-slate-500 dark:text-slate-400 text-center py-8">لا توجد مشاريع تطابق بحثك.</p>}
            </div>
        </div>
    );
};