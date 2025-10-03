import React, { useState, useMemo } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { PlusIcon, PencilIcon, DocumentTextIcon } from '../ui/Icons';
import { TeamMember } from '../../types';
import { ExpenseClaimFormModal } from '../modals/ExpenseClaimFormModal';
import { SalaryEditModal } from '../modals/SalaryEditModal';
import { EmptyState } from '../ui/EmptyState';

type FinanceTab = 'expenses' | 'costs' | 'salaries';

export const FinancePage: React.FC = () => {
    const { teamMembers, expenseClaims, dailyLogs, handleUpdateExpenseClaimStatus, handleUpdateMember, currency } = useAppDataContext();
    const { projects } = useProjectContext();
    const { hasPermission } = useAuth();
    const [activeTab, setActiveTab] = useState<FinanceTab>('expenses');
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

    const handleSaveSalary = async (memberId: number, newSalary: number) => {
        const member = teamMembers.find(m => m.id === memberId);
        if (member) {
            await handleUpdateMember({ ...member, salary: newSalary });
            setIsSalaryModalOpen(false);
        }
    };
    
    const openSalaryModal = (member: TeamMember) => {
        setEditingMember(member);
        setIsSalaryModalOpen(true);
    };

    const getMemberName = (id: number) => teamMembers.find(m => m.id === id)?.name || 'غير معروف';

    const projectCostData = useMemo(() => {
        return projects.map(project => {
            const projectLogs = dailyLogs.filter(log => log.projectId === project.id);
            let totalHours = 0;
            let totalCost = 0;

            projectLogs.forEach(log => {
                const member = teamMembers.find(m => m.id === log.teamMemberId);
                if (!member) return;

                totalHours += log.hours;

                if (member.hourlyRate) { // Freelancer
                    totalCost += log.hours * member.hourlyRate;
                } else if (member.salary) { // Employee
                    // Assuming 176 hours per month (22 days * 8 hours) for salary calculation
                    const hourlyRate = member.salary / 176; 
                    totalCost += log.hours * hourlyRate;
                }
            });

            return { id: project.id, name: project.name, totalHours, totalCost };
        });
    }, [projects, dailyLogs, teamMembers]);
    
    const renderExpenses = () => (
        <div className="space-y-3">
            {expenseClaims.length > 0 ? expenseClaims.map(claim => (
                <div key={claim.id} className="p-3 bg-slate-50 rounded-md">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-semibold text-slate-800">{claim.description}</p>
                            <p className="text-sm text-slate-500">مقدم من: {getMemberName(claim.teamMemberId)} | الحالة: {claim.status}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-lg text-sky-600">{claim.amount.toFixed(2)} {currency}</p>
                            <p className="text-xs text-slate-400">{claim.date}</p>
                        </div>
                    </div>
                    {claim.status === 'pending' && hasPermission('approve_submissions') && (
                        <div className="flex justify-end space-x-2 rtl:space-x-reverse mt-2">
                            <button onClick={() => handleUpdateExpenseClaimStatus(claim.id, 'approved')} className="px-3 py-1 text-xs font-semibold text-white bg-green-500 rounded-md hover:bg-green-600">موافقة</button>
                            <button onClick={() => handleUpdateExpenseClaimStatus(claim.id, 'rejected')} className="px-3 py-1 text-xs font-semibold text-white bg-red-500 rounded-md hover:bg-red-600">رفض</button>
                        </div>
                    )}
                </div>
            )) : <EmptyState icon={<DocumentTextIcon className="w-8 h-8"/>} title="لا توجد طلبات صرف" message="عند تقديم طلبات صرف، ستظهر هنا." />}
        </div>
    );

    const renderProjectCosts = () => (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-right text-slate-500">
                <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                    <tr>
                        <th scope="col" className="px-6 py-3">المشروع</th>
                        <th scope="col" className="px-6 py-3">إجمالي الساعات</th>
                        <th scope="col" className="px-6 py-3">التكلفة الإجمالية ({currency})</th>
                    </tr>
                </thead>
                <tbody>
                    {projectCostData.map(item => (
                        <tr key={item.id} className="bg-white border-b">
                            <th scope="row" className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{item.name}</th>
                            <td className="px-6 py-4">{item.totalHours.toFixed(1)}</td>
                            <td className="px-6 py-4 font-semibold text-sky-700">{item.totalCost.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderSalaries = () => (
         <div className="divide-y divide-slate-200">
            {teamMembers.filter(m => !m.hourlyRate).map(member => (
                <div key={member.id} className="flex justify-between items-center py-3">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <img src={member.avatarUrl} alt={member.name} className="w-10 h-10 rounded-full" />
                        <div>
                            <p className="font-semibold text-slate-800">{member.name}</p>
                            <p className="text-sm text-slate-500">{member.salary?.toLocaleString('ar-EG', { style: 'currency', currency: currency, minimumFractionDigits: 0 }) || 'غير محدد'}</p>
                        </div>
                    </div>
                    {hasPermission('view_finances') && (
                        <button onClick={() => openSalaryModal(member)} className="p-2 text-slate-400 hover:text-sky-600"><PencilIcon className="w-5 h-5"/></button>
                    )}
                </div>
            ))}
        </div>
    );

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">الإدارة المالية</h2>
                    <p className="text-md text-slate-500">تتبع المصروفات والرواتب والتكاليف.</p>
                </div>
                {hasPermission('submit_expenses') && (
                    <button onClick={() => setIsExpenseModalOpen(true)} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                        <PlusIcon className="w-5 h-5"/><span>تقديم طلب صرف</span>
                    </button>
                )}
            </div>
            
            <Card>
                <div className="border-b border-slate-200 mb-4">
                    <nav className="-mb-px flex space-x-6 rtl:space-x-reverse" aria-label="Tabs">
                        <button onClick={() => setActiveTab('expenses')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'expenses' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                            طلبات الصرف
                        </button>
                        {hasPermission('view_finances') && (
                             <button onClick={() => setActiveTab('costs')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'costs' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                                تكاليف المشاريع
                            </button>
                        )}
                        {hasPermission('view_finances') && (
                             <button onClick={() => setActiveTab('salaries')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'salaries' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                                الرواتب
                            </button>
                        )}
                    </nav>
                </div>
                <div>
                    {activeTab === 'expenses' && renderExpenses()}
                    {activeTab === 'costs' && hasPermission('view_finances') && renderProjectCosts()}
                    {activeTab === 'salaries' && hasPermission('view_finances') && renderSalaries()}
                </div>
            </Card>

            {isExpenseModalOpen && (
                <ExpenseClaimFormModal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} />
            )}
            {isSalaryModalOpen && editingMember && (
                <SalaryEditModal isOpen={isSalaryModalOpen} onClose={() => setIsSalaryModalOpen(false)} member={editingMember} onSave={handleSaveSalary} />
            )}
        </div>
    );
};