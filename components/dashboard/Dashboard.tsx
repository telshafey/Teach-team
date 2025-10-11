import React, { useState } from 'react';
import { Sidebar } from '../shared/Sidebar';
import { Header } from '../shared/Header';
import { GeneralManagerDashboard } from './GeneralManagerDashboard';
import { ManagerDashboard } from './ManagerDashboard';
import { PersonalDashboard } from './PersonalDashboard';
import { ProjectsPage } from '../project/ProjectsPage';
import { ProjectDetailPage } from '../project/ProjectDetailPage';
import { TeamManagementPage } from '../team/TeamManagementPage';
import { MeetingsPage } from '../meetings/MeetingsPage';
import { MeetingRoom } from '../meetings/MeetingRoom';
import { useAuth } from '../../contexts/AuthContext';
import { ActiveTimerBar } from '../shared/ActiveTimerBar';
import { LogFormModal } from '../modals/LogFormModal';
import { useTimeTracking } from '../../contexts/TimeTrackingContext';
import { useTimeLogContext } from '../../contexts/TimeLogContext';
import { TimeSheetPage } from '../timesheet/TimeSheetPage';
import { MyTasksPage } from '../tasks/MyTasksPage';
import { FinancePage } from '../finance/FinancePage';
import { AnalyticsPage } from '../analytics/AnalyticsPage';
import { ReportsPage } from '../reports/ReportsPage';
import { SettingsPage } from '../settings/SettingsPage';
import { ProfilePage } from '../profile/ProfilePage';
import { ApprovalsPage } from '../approvals/ApprovalsPage';
import { NavigationContext } from '../../contexts/NavigationContext';


export type View =
  | 'dashboard'
  | 'projects'
  | 'projectDetail'
  | 'team'
  | 'teamDetail'
  | 'timesheet'
  | 'analytics'
  | 'reports'
  | 'finance'
  | 'meetings'
  | 'meetingRoom'
  | 'settings'
  | 'profile'
  | 'myTasks'
  | 'approvals'
  | 'roles'; // for settings sub-page navigation

interface ViewState {
  view: View;
  props?: any;
}

export const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [viewState, setViewState] = useState<ViewState>({ view: 'dashboard' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { showLogModalFor, closeLogModal } = useTimeTracking();
  const { handleAddDailyLog } = useTimeLogContext();

  const onNavigate = (view: View, props: any = {}) => {
    setViewState({ view, props });
    setIsSidebarOpen(false); // Close sidebar on navigation on mobile
  };

  const renderDashboard = () => {
    if (!currentUser) return null;
    if (currentUser.roleId === 'gm') return <GeneralManagerDashboard />;
    if (currentUser.roleId === 'manager') return <ManagerDashboard />;
    return <PersonalDashboard />;
  };

  const renderContent = () => {
    switch (viewState.view) {
      case 'dashboard':
        return renderDashboard();
      case 'projects':
        return <ProjectsPage initialState={viewState.props} />;
      case 'projectDetail':
        return <ProjectDetailPage projectId={viewState.props.projectId} initialTaskIdToOpen={viewState.props.initialTaskIdToOpen} />;
      case 'team':
        return <TeamManagementPage initialProps={viewState.props} />;
      case 'teamDetail':
        return <TeamManagementPage initialView="teamDetail" initialProps={viewState.props} />;
      case 'timesheet':
        return <TimeSheetPage />;
      case 'myTasks':
        return <MyTasksPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'finance':
        return <FinancePage />;
      case 'meetings':
        return <MeetingsPage />;
      case 'meetingRoom':
        return <MeetingRoom meeting={viewState.props.meeting} />;
      case 'approvals':
        return <ApprovalsPage />;
      case 'settings':
      case 'roles':
        return <SettingsPage initialView={viewState.view} initialProps={viewState.props} />;
      case 'profile':
        return <ProfilePage />;
      default:
        return renderDashboard();
    }
  };

  return (
    <NavigationContext.Provider value={{ onNavigate }}>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden" dir="rtl">
        <Sidebar currentView={viewState.view} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <div className="flex flex-col flex-1 w-0">
          <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
          <ActiveTimerBar />
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            {renderContent()}
          </main>
        </div>
        {showLogModalFor && currentUser && (
            <LogFormModal 
              isOpen={!!showLogModalFor}
              onClose={closeLogModal}
              onSave={async (data) => {
                  if(currentUser){
                      await handleAddDailyLog({ ...data, date: new Date().toISOString().split('T')[0], teamMemberId: currentUser.id });
                  }
                  closeLogModal();
              }}
              log={null}
              date={new Date().toISOString().split('T')[0]}
              memberId={currentUser.id}
              initialData={showLogModalFor}
            />
        )}
      </div>
    </NavigationContext.Provider>
  );
};