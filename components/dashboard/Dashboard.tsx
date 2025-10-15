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
import { LogFormModal } from '../modals/LogFormModal';
import { useTimeTracking } from '../../contexts/TimeTrackingContext';
import { useTimeLogContext } from '../../contexts/TimeLogContext';
import { MyTasksPage } from '../tasks/MyTasksPage';
import { ApprovalsPage } from '../approvals/ApprovalsPage';


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

const componentMap: { [key in View]: React.ComponentType<any> } = {
    dashboard: () => {
        const { currentUser } = useAuth();
        if (currentUser?.roleId === 'gm') return <GeneralManagerDashboard />;
        if (currentUser?.roleId === 'manager') return <ManagerDashboard />;
        return <PersonalDashboard />;
    },
    approvals: ApprovalsPage,
    projects: ProjectsPage,
    projectDetail: ProjectDetailPage,
    myTasks: MyTasksPage,
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
    const { activeTimer, showLogModalFor, closeLogModal } = useTimeTracking();
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

    // The MeetingRoom component needs to take over the whole screen
    if (currentView === 'meetingRoom') {
        return <MeetingRoom {...viewProps} />;
    }

    const handleSaveLogFromTimer = async (logData: any) => {
        if (!currentUser || !showLogModalFor) return;
        await handleAddDailyLog({ ...logData, teamMemberId: currentUser.id, date: new Date().toISOString().split('T')[0] });
        closeLogModal();
    };

    return (
        <NavigationContext.Provider value={navigationContextValue}>
            <div className="flex h-screen bg-slate-100 dark:bg-slate-900" dir="rtl">
                <Sidebar currentView={currentView} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
                <div className="flex flex-col flex-1 overflow-hidden">
                    <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
                    <ActiveTimerBar />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto">
                        <ComponentToRender {...viewProps} />
                    </main>
                </div>
            </div>

            {showLogModalFor && currentUser && (
                <LogFormModal
                    isOpen={!!showLogModalFor}
                    onClose={closeLogModal}
                    onSave={handleSaveLogFromTimer}
                    log={null}
                    date={new Date().toISOString().split('T')[0]}
                    memberId={currentUser.id}
                    initialData={showLogModalFor}
                />
            )}
        </NavigationContext.Provider>
    );
};
