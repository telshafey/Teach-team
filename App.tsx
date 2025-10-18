import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/ui/ToastContainer';
import { Dashboard } from './components/dashboard/Dashboard';
import { SupabaseProvider } from './contexts/SupabaseContext';
import { TimeTrackingProvider } from './contexts/TimeTrackingContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { TeamProvider } from './contexts/TeamContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { TimeLogProvider } from './contexts/TimeLogContext';
import { RequestsProvider } from './contexts/RequestsContext';
import { MeetingProvider } from './contexts/MeetingContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AppContent, AppBootstrap, StaticLogo } from './AppContent'; // Moved to separate file for clarity

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <SupabaseProvider>
          <AuthProvider>
            <SettingsProvider>
              <TeamProvider>
                <RequestsProvider>
                  <ProjectProvider>
                    <TimeLogProvider>
                      <MeetingProvider>
                        <NotificationProvider>
                          <TimeTrackingProvider>
                            <AppBootstrap />
                          </TimeTrackingProvider>
                        </NotificationProvider>
                      </MeetingProvider>
                    </TimeLogProvider>
                  </ProjectProvider>
                </RequestsProvider>
              </TeamProvider>
            </SettingsProvider>
          </AuthProvider>
          <ToastContainer />
        </SupabaseProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
