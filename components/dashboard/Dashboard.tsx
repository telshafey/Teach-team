import React, { useState, lazy, Suspense, useEffect } from 'react';
import { Sidebar } from '../shared/Sidebar';
import { Header } from '../shared/Header';
import { useAuth } from '../../contexts/AuthContext';
import { ActiveTimerBar } from '../shared/ActiveTimerBar';
import { PunchClockBar } from '../shared/PunchClockBar';
import { LogFormModal } from '../modals/LogFormModal';
import { useTimeLogContext } from '../../contexts/TimeLogContext';
import { BottomNavBar } from './BottomNavBar';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { AiAssistant } from '../ai/AiAssistant';
import { View } from '../../navigation.types';
import { useNavigation } from '../../contexts/NavigationContext';
import { useTimeManagement } from '../../contexts/TimeManagementContext';


// Lazy load page components for code splitting
const GeneralManagerDashboard = lazy(() => import('./GeneralManagerDashboard').then(module => ({ default: module.GeneralManagerDashboard })));
const ManagerDashboard = lazy(() => import('./ManagerDashboard').then(module => ({ default: module.ManagerDashboard })));
const PersonalDashboard = lazy(() => import('./PersonalDashboard').then(module => ({ default: module.PersonalDashboard })));
const ProjectsPage = lazy(() => import('../project/ProjectsPage').then(module => ({ default: module.ProjectsPage })));
const ProjectDetailPage = lazy(() => import('../project/ProjectDetailPage').then(module => ({ default: module.ProjectDetailPage })));
const TeamManagementPage = lazy(() => import('../team/TeamManagementPage').then(module => ({ default: module.TeamManagementPage })));
const TimeSheetPage = lazy(() => import('../timesheet/TimeSheetPage').then(module => ({ default: module.TimeSheetPage })));
const AnalyticsPage = lazy(() => import('../analytics/AnalyticsPage').then(module => ({ default: module.AnalyticsPage })));
const ReportsPage = lazy(() => import('../reports/ReportsPage').then(module => ({ default: module.ReportsPage })));
const FinancePage = lazy(() => import('../finance/FinancePage').then(module => ({ default: module.FinancePage })));
const MeetingsPage = lazy(() => import('../meetings/MeetingsPage').then(module => ({ default: module.MeetingsPage })));
const SettingsPage = lazy(() => import('../settings/SettingsPage').then(module => ({ default: module.SettingsPage })));
const ProfilePage = lazy(() => import('../profile/ProfilePage').then(module => ({ default: module.ProfilePage })));
const AllTasksPage = lazy(() => import('../tasks/AllTasksPage').then(module => ({ default: module.AllTasksPage })));
const ApprovalsPage = lazy(() => import('../approvals/ApprovalsPage').then(module => ({ default: module.ApprovalsPage })));
const SupportPage = lazy(() => import('../support/SupportPage').then(module => ({ default: module.SupportPage })));


const DashboardContentComponent = () => {
    const { currentUser } = useAuth();
    if (currentUser?.roleId === 'gm') return <GeneralManagerDashboard />;
    if (currentUser?.roleId === 'manager') return <ManagerDashboard />;
    return <PersonalDashboard />;
};

const componentMap: { [key in View]: React.ComponentType<any> } = {
    dashboard: DashboardContentComponent,
    approvals: ApprovalsPage,
    projects: ProjectsPage,
    projectDetail: ProjectDetailPage,
    myTasks: AllTasksPage,
    team: TeamManagementPage,
    teamDetail: TeamManagementPage,
    timesheet: TimeSheetPage,
    analytics: AnalyticsPage,
    reports: ReportsPage,
    finance: FinancePage,
    meetings: MeetingsPage,
    meetingRoom: () => null, // Should not be rendered here
    settings: SettingsPage,
    roles: SettingsPage,
    database: SettingsPage,
    profile: ProfilePage,
    support: SupportPage,
};

interface DashboardProps {
    currentView: View;
    viewProps: any;
}

export const Dashboard: React.FC<DashboardProps> = ({ currentView, viewProps }) => {
    const { currentUser } = useAuth();
    const { onNavigate } = useNavigation();
    const { showLogModalFor, closeLogModal, showPunchOutLogModal, closePunchOutLogModal } = useTimeManagement();
    const { handleAddDailyLog } = useTimeLogContext();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    useEffect(() => {
        setSidebarOpen(false);
    }, [currentView]);

    useEffect(() => {
        const setVh = () => {
            const vh = (window.visualViewport?.height || window.innerHeight) * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', setVh);
        }
        window.addEventListener('resize', setVh);

        setVh();

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', setVh);
            }
            window.removeEventListener('resize', setVh);
        };
    }, []);
    
    const ComponentToRender = componentMap[currentView] || componentMap.dashboard;

    const handleSaveLogFromTimer = async (logData: any) => {
        if (!currentUser || !showLogModalFor) return;
        await handleAddDailyLog({ ...logData, teamMemberId: currentUser.id, date: new Date().toISOString().split('T')[0] });
        closeLogModal();
    };

    const handleSaveLogFromPunchOut = async (logData: any) => {
        if (!currentUser || !showPunchOutLogModal) return;
        await handleAddDailyLog({ ...logData, teamMemberId: currentUser.id, date: new Date().toISOString().split('T')[0] });
        closePunchOutLogModal();
    };

    const isLogModalOpen = !!showLogModalFor || !!showPunchOutLogModal;
    const logModalData = showLogModalFor || (showPunchOutLogModal ? { ...showPunchOutLogModal, taskId: '', projectId: '' } : null);
    const handleModalSave = showLogModalFor ? handleSaveLogFromTimer : handleSaveLogFromPunchOut;
    const handleModalClose = showLogModalFor ? closeLogModal : closePunchOutLogModal;

    const suspenseFallback = (
        <div className="flex h-full w-full items-center justify-center p-8">
            <LoadingSpinner className="w-8 h-8 text-sky-500" />
        </div>
    );

    return (
        <>
            <div className="flex h-[calc(var(--vh,1vh)*100)] bg-slate-100 dark:bg-slate-900" dir="rtl">
                <Sidebar currentView={currentView} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
                <div className="flex flex-col flex-1 overflow-hidden">
                    <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
                    <PunchClockBar />
                    <ActiveTimerBar />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto pb-16 lg:pb-0">
                        <Suspense fallback={suspenseFallback}>
                            <ComponentToRender {...viewProps} />
                        </Suspense>
                    </main>
                    <BottomNavBar currentView={currentView} onNavigate={onNavigate} />
                </div>
            </div>
            
            <AiAssistant />

            {isLogModalOpen && currentUser && logModalData && (
                <LogFormModal
                    isOpen={isLogModalOpen}
                    onClose={handleModalClose}
                    onSave={handleModalSave}
                    log={null}
                    date={new Date().toISOString().split('T')[0]}
                    memberId={currentUser.id}
                    initialData={logModalData}
                />
            )}
        </>
    );
};