import React, { useState } from 'react';
import { useTeamContext } from '../../contexts/TeamContext';
import { useRequestsContext } from '../../contexts/RequestsContext';
import { TeamMember, Project, Penalty } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { SalaryEditModal } from '../modals/SalaryEditModal';
import { ExpenseClaimFormModal } from '../modals/ExpenseClaimFormModal';
import { DecisionDetailModal } from '../modals/DecisionDetailModal';
import { PenaltyFormModal } from '../modals/PenaltyFormModal';
import { FinanceOverview } from './FinanceOverview';
import { ProjectFinancials } from './ProjectFinancials';
import { FreelancerContractsTab } from './FreelancerContractsTab';
import { ExpenseClaimsTab } from './ExpenseClaimsTab';
import { SalariesTab } from './SalariesTab';
import { PenaltiesTab } from './PenaltiesTab';
import { SalarySlipsTab } from './SalarySlipsTab';

interface FinancePageProps {
    initialView?: string;
}

export const FinancePage: React.FC<FinancePageProps> = ({ initialView }) => {
    const { handleUpdateMember, hasPermission } = useTeamContext();
    const { penalties, handleIssuePenalty, handleSubmitExpenseClaim } = useRequestsContext();
    const { currentUser } = useAuth();
    
    const getDefaultTab = () => {
        if (initialView) return initialView;
        if (currentUser?.roleId === 'freelancer') return 'freelancer';
        if (hasPermission('view_finances')) return 'overview';
        return 'expenses';
    };

    const [activeTab, setActiveTab] = useState(getDefaultTab());
    
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isPenaltyModalOpen, setIsPenaltyModalOpen] = useState(false);
    const [reviewingItem, setReviewingItem] = useState<Project | Penalty | null>(null);

    const handleSaveRate = async (memberId: number, data: { salary?: number; hourlyRate?: number }) => {
        await handleUpdateMember(memberId, data);
        setEditingMember(null);
    };

    const navItems = [
        { id: 'overview', label: 'نظرة عامة', permission: hasPermission('view_finances') },
        { id: 'project_financials', label: 'مالية المشاريع', permission: hasPermission('view_finances') },
        { id: 'freelancer', label: currentUser?.roleId === 'freelancer' ? 'عقودي' : 'عقود المستقلين', permission: true },
        { id: 'expenses', label: 'طلبات الصرف', permission: true },
        { id: 'penalties', label: 'الجزاءات', permission: hasPermission('issue_penalties') || hasPermission('approve_penalties') },
        { id: 'salaries', label: 'الرواتب', permission: hasPermission('view_all_salaries') },
        { id: 'salary_slips', label: 'قسائم الرواتب', permission: hasPermission('view_all_salaries') },
    ].filter(item => item.permission);


    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">المالية</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">نظرة عامة على التكاليف والمصروفات والجزاءات.</p>
                </div>
            </div>

            <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                <nav className="-mb-px flex space-x-6 rtl:space-x-reverse overflow-x-auto" aria-label="Tabs">
                    {navItems.map(item => (
                        <button 
                            key={item.id}
                            onClick={() => setActiveTab(item.id)} 
                            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === item.id ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>

            {activeTab === 'overview' && <FinanceOverview />}
            {activeTab === 'project_financials' && <ProjectFinancials />}
            {activeTab === 'freelancer' && <FreelancerContractsTab onReview={setReviewingItem as (item: Project) => void} />}
            {activeTab === 'expenses' && <ExpenseClaimsTab onNewClaim={() => setIsExpenseModalOpen(true)} />}
            {activeTab === 'penalties' && <PenaltiesTab penalties={penalties} onReview={setReviewingItem as (item: Penalty) => void} onNew={() => setIsPenaltyModalOpen(true)} />}
            {activeTab === 'salaries' && <SalariesTab onEdit={setEditingMember} />}
            {activeTab === 'salary_slips' && <SalarySlipsTab />}
            
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
             {isPenaltyModalOpen && (
                <PenaltyFormModal
                    isOpen={isPenaltyModalOpen}
                    onClose={() => setIsPenaltyModalOpen(false)}
                    onSave={handleIssuePenalty}
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