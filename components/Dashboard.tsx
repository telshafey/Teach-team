import React, { useState, useCallback, Suspense, lazy } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from './shared/Sidebar';
import { Header } from './shared/Header';
import { GeneralManagerDashboard } from './dashboard/GeneralManagerDashboard';
import { ManagerDashboard } from './dashboard/ManagerDashboard';
import { PersonalDashboard } from './dashboard/PersonalDashboard';
import { TeamManagementPage } from './team/TeamManagementPage';
import { ProjectDetailPage } from './project/ProjectDetailPage';
import { ProjectsPage } from './project/ProjectsPage';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { LogFormModal } from './modals/LogFormModal';
import { useTimeTracking } from '../contexts/TimeTrackingContext';
import { ActiveTimerBar } from './shared/ActiveTimerBar';
import { useAppDataContext } from '../contexts/DataContext';
import { DailyLogFormData, Meeting } from '../types';
import { format } from 'date-fns';
import { BottomNavBar } from './dashboard/BottomNavBar';
import { SettingsPage } from './settings/SettingsPage';
import { MeetingsPage } from './meetings/MeetingsPage';
import { MeetingRoom } from './meetings/MeetingRoom';

// Lazy loading for less frequently accessed pages
const ReportsPage = lazy(() => import('./reports/ReportsPage').then(module => ({ default: module.ReportsPage })));
const AnalyticsPage = lazy(() => import('./analytics/AnalyticsPage').then(module => ({ default: module.AnalyticsPage })));
const FinancePage = lazy(() => import('./finance/FinancePage').then(module => ({ default: module.FinancePage })));
const ProfilePage = lazy(() => import('./profile/ProfilePage').then(module => ({ default: module.ProfilePage })));
const TimeSheetPage = lazy(() => import('./timesheet/TimeSheetPage').then(module => ({ default: module.TimeSheetPage })));

export type View = 'dashboard' | 'projects' | 'projectDetail' | 'team' | 'teamDetail' | 'reports' | 'analytics' | 'settings' | 'siteSettings' | 'roles' | 'finance' | 'meetings' | 'meetingRoom' | 'profile' | 'database' | 'timesheet';

const LoadingFallback: React.FC = () => (
  <div className="flex-1 flex items-center justify-center">
    <LoadingSpinner />
  </div>
);

export const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { showLogModalFor, closeLogModal } = useTimeTracking();
  const { handleAddDailyLog } = useAppDataContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [navigation, setNavigation] = useState<{ view: View; props: any }>({
    view: 'dashboard',
    props: {},
  });

  const handleNavigate = useCallback((view: View, props: any = {}) => {
    setNavigation({ view, props });
    setIsSidebarOpen(false); // Close sidebar on navigation
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
        return <PersonalDashboard />;
      case 'projects':
        return <ProjectsPage onProjectSelect={(projectId) => handleNavigate('projectDetail', { projectId })} initialState={props.initialState}/>;
      case 'projectDetail':
        return <ProjectDetailPage projectId={props.projectId} onBack={() => handleNavigate('projects')} initialTaskIdToOpen={props.initialTaskIdToOpen} />;
      case 'team':
      case 'teamDetail':
        return <TeamManagementPage initialView={view} initialProps={props} onNavigate={handleNavigate} />;
      case 'timesheet':
        return <Suspense fallback={<LoadingFallback />}><TimeSheetPage /></Suspense>;
      case 'reports':
        return <Suspense fallback={<LoadingFallback />}><ReportsPage /></Suspense>;
      case 'analytics':
        return <Suspense fallback={<LoadingFallback />}><AnalyticsPage /></Suspense>;
      case 'settings':
      case 'roles':
      case 'database':
        return <SettingsPage initialView={view} onNavigate={handleNavigate} />;
      case 'finance':
        return <Suspense fallback={<LoadingFallback />}><FinancePage /></Suspense>;
      case 'meetings':
        return <MeetingsPage onJoinMeeting={(meeting: Meeting) => handleNavigate('meetingRoom', { meeting })} />;
      case 'meetingRoom':
        return <MeetingRoom meeting={props.meeting} onLeave={() => handleNavigate('meetings')} />;
      case 'profile':
        return <Suspense fallback={<LoadingFallback />}><ProfilePage /></Suspense>;
      default:
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
