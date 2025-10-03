import React, { useState, useCallback } from 'react';
import { Sidebar } from '../shared/Sidebar';
import { Header } from '../shared/Header';
import { useAuth } from '../../contexts/AuthContext';
import { PersonalDashboard } from './PersonalDashboard';
import { ManagerDashboard } from './ManagerDashboard';
import { GeneralManagerDashboard } from './GeneralManagerDashboard';
import { ProjectsPage } from '../project/ProjectsPage';
import { ProjectDetailPage } from '../project/ProjectDetailPage';
import { TeamManagementPage } from '../team/TeamManagementPage';
import { TeamMemberDetailPage } from '../team/TeamMemberDetailPage';
import { ReportsPage } from '../reports/ReportsPage';
import { AnalyticsPage } from '../analytics/AnalyticsPage';
import { SettingsPage } from '../settings/SettingsPage';
import { FinancePage } from '../finance/FinancePage';
import { MeetingsPage } from '../meetings/MeetingsPage';
import { MeetingRoom } from '../meetings/MeetingRoom';
import { Notification, Meeting } from '../../types';
import { BottomNavBar } from './BottomNavBar';
import { useAppDataContext } from '../../contexts/DataContext';

export type View = 'dashboard' | 'projects' | 'projectDetail' | 'team' | 'teamDetail' | 'reports' | 'analytics' | 'settings' | 'siteSettings' | 'roles' | 'finance' | 'meetings' | 'meetingRoom';

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
  const { teamMembers } = useAppDataContext();
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
          {renderView()}
        </main>
        <div className="lg:hidden h-16" /> {/* Spacer for bottom nav */}
        <BottomNavBar currentView={viewState.view} onNavigate={handleNavigate} />
      </div>
    </div>
  );
};
