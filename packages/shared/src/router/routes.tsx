import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { AuthPage } from '@/components/auth/AuthPage';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuthStore } from '../stores/authStore';
import { NotFoundPage } from './NotFoundPage';

// Lazy loading views
const GeneralManagerDashboard = lazy(() => import('@/components/dashboard/GeneralManagerDashboard').then(m => ({ default: m.GeneralManagerDashboard })));
const ManagerDashboard = lazy(() => import('@/components/dashboard/ManagerDashboard').then(m => ({ default: m.ManagerDashboard })));
const PersonalDashboard = lazy(() => import('@/components/dashboard/PersonalDashboard').then(m => ({ default: m.PersonalDashboard })));
const ProjectsPage = lazy(() => import('@/components/project/ProjectsPage').then(m => ({ default: m.ProjectsPage })));
const ProjectDetailPage = lazy(() => import('@/components/project/ProjectDetailPage').then(m => ({ default: m.ProjectDetailPage })));
const TeamManagementPage = lazy(() => import('@/components/team/TeamManagementPage').then(m => ({ default: m.TeamManagementPage })));
const AllTasksPage = lazy(() => import('@/components/tasks/AllTasksPage').then(m => ({ default: m.AllTasksPage })));
const TimeSheetPage = lazy(() => import('@/components/timesheet/TimeSheetPage').then(m => ({ default: m.TimeSheetPage })));
const AnalyticsPage = lazy(() => import('@/components/analytics/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const ReportsPage = lazy(() => import('@/components/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const FinancePage = lazy(() => import('@/components/finance/FinancePage').then(m => ({ default: m.FinancePage })));
const MeetingsPage = lazy(() => import('@/components/meetings/MeetingsPage').then(m => ({ default: m.MeetingsPage })));
const MeetingRoom = lazy(() => import('@/components/meetings/MeetingRoom').then(m => ({ default: m.MeetingRoom })));
const SettingsPage = lazy(() => import('@/components/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ProfilePage = lazy(() => import('@/components/profile/ProfilePage').then(m => ({ default: m.ProfilePage })));
const ApprovalsPage = lazy(() => import('@/components/approvals/ApprovalsPage').then(m => ({ default: m.ApprovalsPage })));
const SupportPage = lazy(() => import('@/components/support/SupportPage').then(m => ({ default: m.SupportPage })));
const WorkSummaryPage = lazy(() => import('@/components/dashboard/WorkSummaryPage').then(m => ({ default: m.WorkSummaryPage })));
const OnboardingPage = lazy(() => import('@/components/onboarding/OnboardingPage').then(m => ({ default: m.OnboardingPage })));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useAuthStore();
  if (!currentUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const DashboardContent = () => {
  const { currentUser } = useAuthStore();
  
  if (!currentUser) return null;

  const isGM =
    currentUser.roleId === "gm" ||
    currentUser.roleId === "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" ||
    currentUser.roleId === "admin";

  const isManager =
    currentUser.roleId === "manager" ||
    currentUser.roleId === "project_manager" ||
    currentUser.roleId === "hr_manager" ||
    currentUser.roleId === "finance_manager";

  if (isGM) return <GeneralManagerDashboard />;
  if (isManager) return <ManagerDashboard />;
  return <PersonalDashboard />;
};

const ViewWrapper = ({ view }: { view: React.ReactNode }) => (
  <Suspense fallback={
    <div className="flex h-full w-full items-center justify-center min-h-[400px]">
      <LoadingSpinner className="w-8 h-8 text-sky-500" />
    </div>
  }>
    {view}
  </Suspense>
);

const MeetingRoomWrapper = () => {
  const location = useLocation();
  const meeting = location.state?.meeting;
  
  if (!meeting) {
    return <Navigate to="/meetings" replace />;
  }

  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900">
        <LoadingSpinner className="w-8 h-8 text-sky-500" />
      </div>
    }>
      <MeetingRoom meeting={meeting} />
    </Suspense>
  );
};

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <AuthPage />
  },
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Dashboard currentView="dashboard" viewProps={{}}>
          <ViewWrapper view={<DashboardContent />} />
        </Dashboard>
      </ProtectedRoute>
    )
  },
  {
    path: "/projects",
    element: (
      <ProtectedRoute>
        <Dashboard currentView="projects" viewProps={{}}>
          <ViewWrapper view={<ProjectsPage />} />
        </Dashboard>
      </ProtectedRoute>
    )
  },
  {
    path: "/projectDetail/:projectId",
    element: (
      <ProtectedRoute>
        <Dashboard currentView="projectDetail" viewProps={{}}>
          <ViewWrapper view={<ProjectDetailPage />} />
        </Dashboard>
      </ProtectedRoute>
    )
  },
  {
    path: "/team",
    element: (
      <ProtectedRoute>
        <Dashboard currentView="team" viewProps={{}}>
          <ViewWrapper view={<TeamManagementPage />} />
        </Dashboard>
      </ProtectedRoute>
    )
  },
  {
    path: "/team/:memberId",
    element: (
      <ProtectedRoute>
        <Dashboard currentView="team" viewProps={{}}>
          <ViewWrapper view={<TeamManagementPage />} />
        </Dashboard>
      </ProtectedRoute>
    )
  },
  {
    path: "/my-tasks",
    element: (
      <ProtectedRoute>
        <Dashboard currentView="myTasks" viewProps={{}}>
          <ViewWrapper view={<AllTasksPage />} />
        </Dashboard>
      </ProtectedRoute>
    )
  },
  {
    path: "/timesheet",
    element: (
      <ProtectedRoute>
        <Dashboard currentView="timesheet" viewProps={{}}>
          <ViewWrapper view={<TimeSheetPage />} />
        </Dashboard>
      </ProtectedRoute>
    )
  },
  {
    path: "/work-summary",
    element: (
      <ProtectedRoute>
        <Dashboard currentView="workSummary" viewProps={{}}>
          <ViewWrapper view={<WorkSummaryPage />} />
        </Dashboard>
      </ProtectedRoute>
    )
  },
  {
    path: "/analytics",
    element: (
      <ProtectedRoute>
        <Dashboard currentView="analytics" viewProps={{}}>
          <ViewWrapper view={<AnalyticsPage />} />
        </Dashboard>
      </ProtectedRoute>
    )
  },
  {
    path: "/reports",
    element: (
      <ProtectedRoute>
        <Dashboard currentView="reports" viewProps={{}}>
          <ViewWrapper view={<ReportsPage />} />
        </Dashboard>
      </ProtectedRoute>
    )
  },
  {
    path: "/finance",
    element: (
      <ProtectedRoute>
        <Dashboard currentView="finance" viewProps={{}}>
          <ViewWrapper view={<FinancePage />} />
        </Dashboard>
      </ProtectedRoute>
    )
  },
  {
    path: "/meetings",
    element: (
      <ProtectedRoute>
        <Dashboard currentView="meetings" viewProps={{}}>
          <ViewWrapper view={<MeetingsPage />} />
        </Dashboard>
      </ProtectedRoute>
    )
  },
  {
    path: "/meeting-room/:meetingId",
    element: (
      <ProtectedRoute>
        <MeetingRoomWrapper />
      </ProtectedRoute>
    )
  },
  {
    path: "/settings",
    element: (
      <ProtectedRoute>
        <Dashboard currentView="settings" viewProps={{}}>
          <ViewWrapper view={<SettingsPage />} />
        </Dashboard>
      </ProtectedRoute>
    )
  },
  {
    path: "/profile",
    element: (
      <ProtectedRoute>
        <Dashboard currentView="profile" viewProps={{}}>
          <ViewWrapper view={<ProfilePage />} />
        </Dashboard>
      </ProtectedRoute>
    )
  },
  {
    path: "/approvals",
    element: (
      <ProtectedRoute>
        <Dashboard currentView="approvals" viewProps={{}}>
          <ViewWrapper view={<ApprovalsPage />} />
        </Dashboard>
      </ProtectedRoute>
    )
  },
  {
    path: "/support",
    element: (
      <ProtectedRoute>
        <Dashboard currentView="support" viewProps={{}}>
          <ViewWrapper view={<SupportPage />} />
        </Dashboard>
      </ProtectedRoute>
    )
  },
  {
    path: "/onboarding",
    element: (
      <ProtectedRoute>
        <Dashboard currentView="onboarding" viewProps={{}}>
          <ViewWrapper view={<OnboardingPage />} />
        </Dashboard>
      </ProtectedRoute>
    )
  },
  {
    path: "/invite",
    element: <AuthPage mode="invite" />
  },
  {
    path: "*",
    element: <NotFoundPage />
  }
]);
