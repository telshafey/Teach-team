import React, { useState, useCallback, lazy, Suspense } from 'react';
import { Sidebar } from '../shared/Sidebar';
import { Header } from '../shared/Header';
import { useAuth } from '../../contexts/AuthContext';
import { PersonalDashboard } from './PersonalDashboard';
import { ManagerDashboard } from './ManagerDashboard';
import { GeneralManagerDashboard } from './GeneralManagerDashboard';
// FIX: Corrected import paths.
import { Notification, Meeting, DailyLogFormData } from '../../types';
import { BottomNavBar } from './BottomNavBar';
import { useAppDataContext } from '../../contexts/DataContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useTimeTracking } from '../../contexts/TimeTrackingContext';
import { LogFormModal } from '../modals/LogFormModal';

// Lazy load page components for code splitting
const ProjectsPage = lazy(() => import('../project/ProjectsPage').then(module => ({ default: module.ProjectsPage })));
// FIX: Corrected import path.
const ProjectDetailPage = lazy(() => import('../project/ProjectDetailPage').then(module => ({ default: module.ProjectDetailPage })));
const TeamManagementPage = lazy(() => import('../team/TeamManagementPage').then(module => ({ default: module.TeamManagementPage })));
const TeamMemberDetailPage = lazy(() => import('../team/TeamMemberDetailPage').then(module => ({ default: module.TeamMemberDetailPage })));
const ReportsPage = lazy(() => import('../reports/ReportsPage').then(module => ({ default: module.ReportsPage })));
const AnalyticsPage = lazy(() => import('../analytics/AnalyticsPage').then(module => ({ default: module.AnalyticsPage })));
const SettingsPage = lazy(() => import('../settings/SettingsPage').then(module => ({ default: module.SettingsPage })));
const FinancePage = lazy(() => import('../finance/FinancePage').then(module => ({ default: module.FinancePage })));
const MeetingsPage = lazy(() => import('../meetings/MeetingsPage').then(module => ({ default: module.MeetingsPage })));
const MeetingRoom = lazy(() => import('../meetings/MeetingRoom').then(module => ({ default: module.MeetingRoom })));
const ProfilePage = lazy(() => import('../profile/ProfilePage').then(module => ({ default: module.ProfilePage })));


export type View = 'dashboard' | 'projects' | 'projectDetail' | 'team' | 'teamDetail' | 'reports' | 'analytics' | 'settings' | 'siteSettings' | 'roles' | 'finance' | 'meetings' | 'meetingRoom' | 'profile';

interface ViewState {
  view: View;
  projectId?: string;
  memberId?: number;
  taskId?: string;
  meeting?: Meeting;
  from?: View;
  initialState?: any;
}

export const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { teamMembers, handleAddDailyLog } = useAppDataContext();
  const { showLogModalFor, closeLogModal } = useTimeTracking();

  const [viewState, setViewState] = useState<ViewState>({ view: 'dashboard' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleNavigate = useCallback((view: View, state: Omit<ViewState, 'view'> = {}) => {
    window.scrollTo(0, 0); // Scroll to top on navigation
    setViewState({ view, ...state });
  }, []);

  const handleNotificationSelect = useCallback((notification: Notification) => {
    handleNavigate('projectDetail', {
      projectId: notification.projectId,
      taskId: notification.taskId,
    });
  }, [handleNavigate]);

  const handleJoinMeeting = useCallback((meeting: Meeting) => {
    handleNavigate('meetingRoom', { meeting });
  }, [handleNavigate]);
  
  const handleLeaveMeeting = useCallback(() => {
    handleNavigate('meetings');
  }, [handleNavigate]);

  const handleSaveTimeLog = async (logData: DailyLogFormData) => {
    if (!currentUser || !showLogModalFor) return;
    await handleAddDailyLog({ 
        ...logData, 
        teamMemberId: currentUser.id, 
        date: new Date().toISOString().split('T')[0] 
    });
    closeLogModal();
  };

  const renderView = () => {
    switch (viewState.view) {
      case 'dashboard':
        if (currentUser?.roleId === 'gm') return <GeneralManagerDashboard onNavigate={handleNavigate} />;
        if (currentUser?.roleId === 'manager') return <ManagerDashboard onViewMemberDetail={(memberId) => handleNavigate('teamDetail', { memberId })} onSelectMember={(memberId) => handleNavigate('teamDetail', { memberId })} />;
        return <PersonalDashboard />;
      case 'projects':
        return <ProjectsPage onSelectProject={(projectId) => handleNavigate('projectDetail', { projectId })} initialState={viewState.initialState} />;
      case 'projectDetail':
        return <ProjectDetailPage projectId={viewState.projectId!} initialTaskId={viewState.taskId} onBack={() => handleNavigate('projects')} />;
      case 'team':
        return <TeamManagementPage onSelectMemberForDetail={(memberId) => handleNavigate('teamDetail', { memberId })} />;
      case 'teamDetail':
        const memberToView = teamMembers.find(m => m.id === viewState.memberId);
        if (!memberToView) {
          handleNavigate('team');
          return null;
        }
        return <TeamMemberDetailPage member={memberToView} onBack={() => handleNavigate(viewState.from || 'team')} />;
      case 'reports':
        return <ReportsPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'settings':
      case 'siteSettings':
      case 'roles':
        return <SettingsPage initialView={viewState.view} onNavigate={handleNavigate} />;
      case 'finance':
          return <FinancePage />;
      case 'meetings':
          return <MeetingsPage onJoinMeeting={handleJoinMeeting} />;
      case 'meetingRoom':
          if (!viewState.meeting) {
              handleNavigate('meetings');
              return null;
          }
          return <MeetingRoom meeting={viewState.meeting} onLeave={handleLeaveMeeting} />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <PersonalDashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900" dir="rtl">
      <Sidebar currentView={viewState.view} onNavigate={handleNavigate} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} onNotificationSelect={handleNotificationSelect} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
           <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><LoadingSpinner className="h-10 w-10 text-sky-500" /></div>}>
            {renderView()}
          </Suspense>
        </main>
        <div className="lg:hidden h-16" /> {/* Spacer for bottom nav */}
        <BottomNavBar currentView={viewState.view} onNavigate={handleNavigate} />
      </div>
      
      {showLogModalFor && currentUser && (
        <LogFormModal
            isOpen={!!showLogModalFor}
            onClose={closeLogModal}
            onSave={handleSaveTimeLog}
            log={null}
            date={new Date().toISOString().split('T')[0]}
            memberId={currentUser.id}
            initialData={showLogModalFor}
        />
      )}
    </div>
  );
};
