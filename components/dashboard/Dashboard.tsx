import React, { useState, useCallback, useMemo } from 'react';
import { Sidebar } from '../shared/Sidebar';
import { Header } from '../shared/Header';
import { GeneralManagerDashboard } from './GeneralManagerDashboard';
import { ManagerDashboard } from './ManagerDashboard';
import { PersonalDashboard } from './PersonalDashboard';
import { ProjectsPage } from '../project/ProjectsPage';
import { ProjectDetailPage } from '../project/ProjectDetailPage';
import { TeamManagementPage } from '../team/TeamManagementPage';
import { TimeSheetPage } from '../timesheet/TimeSheetPage';
import { AnalyticsPage } from '../analytics/AnalyticsPage';
import { ReportsPage } from '../reports/ReportsPage';
import { FinancePage } from '../finance/FinancePage';
import { MeetingsPage } from '../meetings/MeetingsPage';
import { MeetingRoom } from '../meetings/MeetingRoom';
import { SettingsPage } from '../settings/SettingsPage';
import { ProfilePage } from '../profile/ProfilePage';
import { useAuth } from '../../contexts/AuthContext';
import { NavigationContext } from '../../contexts/NavigationContext';
import { ActiveTimerBar } from '../shared/ActiveTimerBar';
import { PunchClockBar } from '../shared/PunchClockBar';
import { LogFormModal } from '../modals/LogFormModal';
import { useTimeTracking } from '../../contexts/TimeTrackingContext';
import { usePunchClock } from '../../contexts/PunchClockContext';
import { useTimeLogContext } from '../../contexts/TimeLogContext';
import { AllTasksPage } from '../tasks/AllTasksPage';
import { ApprovalsPage } from '../approvals/ApprovalsPage';
import { AuthPage } from '../auth/AuthPage';
import { BottomNavBar } from './BottomNavBar';


export type View =
  | 'dashboard'
  | 'approvals'
  | 'projects'
  | 'projectDetail'
  | 'myTasks'
  | 'team'
  | 'teamDetail' // For TeamManagementPage
  | 'timesheet'
  | 'analytics'
  | 'reports'
  | 'finance'
  | 'meetings'
  | 'meetingRoom'
  | 'settings'
  | 'roles' // from settings
  | 'database' // from settings
  | 'profile';

const DashboardContent = () => {
    const { currentUser } = useAuth();
    if (currentUser?.roleId === 'gm') return <GeneralManagerDashboard />;
    if (currentUser?.roleId === 'manager') return <ManagerDashboard />;
    return <PersonalDashboard />;
};

const componentMap: { [key in View]: React.ComponentType<any> } = {
    dashboard: DashboardContent,
    approvals: ApprovalsPage,
    projects: ProjectsPage,
    projectDetail: ProjectDetailPage,
    myTasks: AllTasksPage, // Use the new AllTasksPage
    team: TeamManagementPage,
    teamDetail: TeamManagementPage, // same component, different initial state
    timesheet: TimeSheetPage,
    analytics: AnalyticsPage,
    reports: ReportsPage,
    finance: FinancePage,
    meetings: MeetingsPage,
    meetingRoom: MeetingRoom,
    settings: SettingsPage,
    roles: SettingsPage,
    database: SettingsPage,
    profile: ProfilePage,
};


export const Dashboard: React.FC = () => {
    const { currentUser } = useAuth();
    const { showLogModalFor, closeLogModal } = useTimeTracking();
    const { showPunchOutLogModal, closePunchOutLogModal } = usePunchClock();
    const { handleAddDailyLog } = useTimeLogContext();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [viewProps, setViewProps] = useState<any>({});

    const handleNavigate = useCallback((view: View, props: any = {}) => {
        // Close sidebar on navigation on mobile
        setSidebarOpen(false);
        
        let initialProps = props;
        if (view === 'teamDetail') {
            initialProps = { initialMemberId: props.memberId };
            setCurrentView('team'); // The component is the same
        } else if (view === 'roles' || view === 'database') {
            initialProps = { initialView: view, initialProps: props };
            setCurrentView('settings');
        } else {
            setCurrentView(view);
        }
        
        setViewProps(initialProps);
    }, []);

    const navigationContextValue = useMemo(() => ({ onNavigate: handleNavigate }), [handleNavigate]);
    
    const ComponentToRender = componentMap[currentView] || componentMap.dashboard;

    if (!currentUser) {
        return <AuthPage />;
    }

    // The MeetingRoom component needs to take over the whole screen
    if (currentView === 'meetingRoom') {
        return <MeetingRoom {...viewProps} />;
    }

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


    return (
        <NavigationContext.Provider value={navigationContextValue}>
            <div className="flex h-screen bg-slate-100 dark:bg-slate-900" dir="rtl">
                <Sidebar currentView={currentView} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
                <div className="flex flex-col flex-1 overflow-hidden">
                    <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
                    <PunchClockBar />
                    <ActiveTimerBar />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto pb-16 lg:pb-0">
                        <ComponentToRender {...viewProps} />
                    </main>
                    <BottomNavBar currentView={currentView} onNavigate={handleNavigate} />
                </div>
            </div>

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
        </NavigationContext.Provider>
    );
};