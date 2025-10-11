import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { LeaveRequestFormModal } from '../modals/LeaveRequestFormModal';
import { ExpenseClaimFormModal } from '../modals/ExpenseClaimFormModal';
import { OvertimeRequestFormModal } from '../modals/OvertimeRequestFormModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { WorkContractChangeRequestModal } from '../modals/WorkContractChangeRequestModal';
import { useAppDataContext } from '../../contexts/DataContext';
import { AppealPenaltyModal } from '../modals/AppealPenaltyModal';
import { Penalty } from '../../types';

// Import newly created sub-components
import { ProfileSidebar } from './ProfileSidebar';
import { ProfileRequests } from './ProfileRequests';
import { ProfileSalaryReport } from './ProfileSalaryReport';
import { ProfileWorkHours } from './ProfileWorkHours';
import { ProfilePerformance } from './ProfilePerformance';
import { ProfileSettings } from './ProfileSettings';
import { ProfilePenalties } from './ProfilePenalties';

export const ProfilePage: React.FC = () => {
    const { currentUser } = useAuth();
    const { 
        submitLeaveRequest, cancelLeaveRequest, 
        handleSubmitExpenseClaim,
        submitOvertimeRequest, cancelOvertimeRequest,
        submitWorkContractChangeRequest,
        handleAppealPenalty,
    } = useAppDataContext();
    
    // State for UI
    const [activeTab, setActiveTab] = useState<'requests' | 'performance' | 'settings' | 'salary' | 'work_hours' | 'penalties'>('requests');
    
    // State for Modals remains in the parent
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);
    const [isWorkContractModalOpen, setIsWorkContractModalOpen] = useState(false);
    const [appealingPenalty, setAppealingPenalty] = useState<Penalty | null>(null);
    const [requestToCancel, setRequestToCancel] = useState<{id: string, type: 'leave' | 'overtime'} | null>(null);

    if (!currentUser) return null;
    
    const navItems = [
        { id: 'requests', label: 'طلباتي', condition: true },
        { id: 'work_hours', label: 'ساعات العمل', condition: !!currentUser.weeklyHoursRequirement },
        { id: 'salary', label: 'تقرير الراتب', condition: !!currentUser.salary },
        { id: 'penalties', label: 'الجزاءات', condition: true },
        { id: 'performance', label: 'ملخص الأداء', condition: true },
        { id: 'settings', label: 'الإعدادات', condition: true },
    ].filter(item => item.condition);


    const renderActiveTab = () => {
        switch(activeTab) {
            case 'requests':
                return <ProfileRequests 
                            onNewLeave={() => setIsLeaveModalOpen(true)}
                            onNewExpense={() => setIsExpenseModalOpen(true)}
                            onNewOvertime={() => setIsOvertimeModalOpen(true)}
                            onCancelRequest={(id, type) => setRequestToCancel({id, type})}
                        />;
            case 'work_hours':
                return <ProfileWorkHours onStartChangeRequest={() => setIsWorkContractModalOpen(true)} />;
            case 'salary':
                return <ProfileSalaryReport />;
            case 'penalties':
                return <ProfilePenalties onAppeal={setAppealingPenalty} />;
            case 'performance':
                return <ProfilePerformance />;
            case 'settings':
                return <ProfileSettings />;
            default:
                return null;
        }
    }

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">ملفي الشخصي</h2>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <ProfileSidebar />
                </div>
                <div className="lg:col-span-3">
                    <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6 overflow-x-auto">
                        {navItems.map(item => (
                             <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex-shrink-0 px-4 py-2 text-sm font-medium ${activeTab === item.id ? 'border-b-2 border-sky-500 text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}>
                                {item.label}
                            </button>
                        ))}
                    </div>
                    
                    {renderActiveTab()}
                </div>
            </div>

            {isLeaveModalOpen && <LeaveRequestFormModal isOpen={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} onSave={submitLeaveRequest} />}
            {isExpenseModalOpen && <ExpenseClaimFormModal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} onSave={handleSubmitExpenseClaim} />}
            {isOvertimeModalOpen && <OvertimeRequestFormModal isOpen={isOvertimeModalOpen} onClose={() => setIsOvertimeModalOpen(false)} onSave={submitOvertimeRequest} />}
            {isWorkContractModalOpen && <WorkContractChangeRequestModal isOpen={isWorkContractModalOpen} onClose={() => setIsWorkContractModalOpen(false)} onSave={submitWorkContractChangeRequest} />}
            {appealingPenalty && (
                <AppealPenaltyModal
                    isOpen={!!appealingPenalty}
                    onClose={() => setAppealingPenalty(null)}
                    onSave={async (reason) => {
                        await handleAppealPenalty(appealingPenalty.id, reason);
                        setAppealingPenalty(null);
                    }}
                />
            )}
            {requestToCancel && (
                 <ConfirmationModal isOpen={!!requestToCancel} onClose={() => setRequestToCancel(null)} onConfirm={async () => {
                        if (requestToCancel.type === 'leave') await cancelLeaveRequest(requestToCancel.id);
                        if (requestToCancel.type === 'overtime') await cancelOvertimeRequest(requestToCancel.id);
                        setRequestToCancel(null);
                    }} title="تأكيد الإلغاء" message="هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟" isDestructive />
            )}
        </div>
    );
};

export default ProfilePage;