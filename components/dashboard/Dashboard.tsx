import React, { useState, useCallback, Suspense, lazy, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Sidebar } from '../shared/Sidebar';
import { Header } from '../shared/Header';
import { GeneralManagerDashboard } from './GeneralManagerDashboard';
import { ManagerDashboard } from './ManagerDashboard';
import { PersonalDashboard } from './PersonalDashboard';
import { TeamManagementPage } from '../team/TeamManagementPage';
import { ProjectDetailPage } from '../project/ProjectDetailPage';
import { ProjectsPage } from '../project/ProjectsPage';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { LogFormModal } from '../modals/LogFormModal';
import { useTimeTracking } from '../../contexts/TimeTrackingContext';
import { ActiveTimerBar } from '../shared/ActiveTimerBar';
import { useAppDataContext } from '../../contexts/DataContext';
import { DailyLogFormData, Meeting } from '../../types';
import { format } from 'date-fns';
import { BottomNavBar } from './BottomNavBar';
import { SettingsPage } from '../settings/SettingsPage';
import { MeetingsPage } from '../meetings/MeetingsPage';
import { MeetingRoom } from '../meetings/MeetingRoom';

const ReportsPage = lazy(() => import('../reports/ReportsPage').then(module => ({ default: module.ReportsPage })));
const AnalyticsPage = lazy(() => import('../analytics/AnalyticsPage').then(module => ({ default: module.AnalyticsPage })));
const FinancePage = lazy(() => import('../finance/FinancePage').then(module => ({ default: module.FinancePage })));
const ProfilePage = lazy(() => import('../profile/ProfilePage').then(module => ({ default: module.ProfilePage })));
const TimeSheetPage = lazy(() => import('../timesheet/TimeSheetPage').then(module => ({ default: module.TimeSheetPage })));
const MyTasksPage = lazy(() => import('../tasks/MyTasksPage').then(module => ({ default: module.MyTasksPage })));

export type View = 'dashboard' | 'projects' | 'projectDetail' | 'team' | 'teamDetail' | 'reports' | 'analytics' | 'settings' | 'siteSettings' | 'roles' | 'finance' | 'meetings' | 'meetingRoom' | 'profile' | 'database' | 'timesheet' | 'myTasks';

const LoadingFallback: React.FC = () => (
  <div className="flex-1 flex items-center justify-center h-full">
    <LoadingSpinner />
  </div>
);

const parseHash = (): { view: View; props: any } => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (!hash) return { view: 'dashboard', props: {} };

    const parts = hash.split('/');
    const view = parts[0] as View;
    const props: any = {};

    switch (view) {
        case 'projectDetail':
            props.projectId = parts[1];
            if(parts[2] === 'task' && parts[3]) {
                props.initialTaskIdToOpen = parts[3];
            }
            break;
        case 'teamDetail':
            props.memberId = parts[1];
            break;
        case 'settings':
        case 'roles':
        case 'database':
            props.initialRoleId = parts[1];
            break;
        // Add other views with props here
    }

    return { view, props };
};


export const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { showLogModalFor, closeLogModal } = useTimeTracking();
  const { handleAddDailyLog } = useAppDataContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [navigation, setNavigation] = useState<{ view: View; props: any }>(parseHash());

  useEffect(() => {
    const handleHashChange = () => {
      setNavigation(parseHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);


  const handleNavigate = useCallback((view: View, props: any = {}) => {
    let hash = `/${view}`;
    if (view === 'projectDetail' && props.projectId) {
        hash += `/${props.projectId}`;
        if(props.initialTaskIdToOpen) {
            hash += `/task/${props.initialTaskIdToOpen}`;
        }
    } else if (view === 'teamDetail' && props.memberId) {
        hash += `/${props.memberId}`;
    }
    window.location.hash = hash;
    setIsSidebarOpen(false);
  }, []);

  const handleSaveTimerLog = async (logData: DailyLogFormData) => {
    if (!currentUser || !showLogModalFor) return;
    await handleAddDailyLog({
      ...logData,
      teamMemberId: currentUser.id,
      date: format(new Date(), 'yyyy-MM-dd'),
    });
    closeLogModal();
  };

  const renderView = () => {
    const { view, props } = navigation;

    switch (view) {
      case 'dashboard':
        if (currentUser?.roleId === 'gm') return <GeneralManagerDashboard onNavigate={handleNavigate} />;
        if (currentUser?.roleId === 'pm' || currentUser?.roleId === 'marketing_manager') return <ManagerDashboard onNavigate={handleNavigate} />;
        return <PersonalDashboard onNavigate={handleNavigate} />;
      case 'projects':
        return <ProjectsPage onProjectSelect={(projectId) => handleNavigate('projectDetail', { projectId })} initialState={props.initialState}/>;
      case 'projectDetail':
        return <ProjectDetailPage projectId={props.projectId} onBack={() => handleNavigate('projects')} initialTaskIdToOpen={props.initialTaskIdToOpen} />;
      case 'team':
      case 'teamDetail':
        return <TeamManagementPage initialView={view} initialProps={props} onNavigate={handleNavigate} />;
      case 'timesheet':
        return <Suspense fallback={<LoadingFallback />}><TimeSheetPage /></Suspense>;
      case 'myTasks':
        return <Suspense fallback={<LoadingFallback />}><MyTasksPage /></Suspense>;
      case 'reports':
        return <Suspense fallback={<LoadingFallback />}><ReportsPage /></Suspense>;
      case 'analytics':
        return <Suspense fallback={<LoadingFallback />}><AnalyticsPage /></Suspense>;
      case 'settings':
      case 'roles':
      case 'database':
        return <SettingsPage initialView={view} initialProps={props} onNavigate={handleNavigate} />;
      case 'finance':
        return <Suspense fallback={<LoadingFallback />}><FinancePage /></Suspense>;
      case 'meetings':
        return <MeetingsPage onJoinMeeting={(meeting: Meeting) => handleNavigate('meetingRoom', { meeting })} />;
      case 'meetingRoom':
        return <MeetingRoom meeting={props.meeting} onLeave={() => handleNavigate('meetings')} />;
      case 'profile':
        return <Suspense fallback={<LoadingFallback />}><ProfilePage /></Suspense>;
      default:
        // Fallback to dashboard if view is unknown
        if (view !== 'dashboard') {
            handleNavigate('dashboard');
        }
        return <GeneralManagerDashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden" dir="rtl">
      <Sidebar currentView={navigation.view} onNavigate={handleNavigate} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onNavigate={handleNavigate} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <ActiveTimerBar />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {renderView()}
        </main>
        <BottomNavBar currentView={navigation.view} onNavigate={handleNavigate} />
      </div>

      {showLogModalFor && currentUser && (
        <LogFormModal
          isOpen={!!showLogModalFor}
          onClose={closeLogModal}
          onSave={handleSaveTimerLog}
          log={null}
          date={format(new Date(), 'yyyy-MM-dd')}
          memberId={currentUser.id}
          initialData={showLogModalFor}
        />
      )}
    </div>
  );
};
