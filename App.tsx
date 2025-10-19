import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/ui/ToastContainer';
import { SupabaseProvider } from './contexts/SupabaseContext';
import { TimeTrackingProvider } from './contexts/TimeTrackingContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { TeamProvider } from './contexts/TeamContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { TimeLogProvider } from './contexts/TimeLogContext';
import { RequestsProvider } from './contexts/RequestsContext';
import { MeetingProvider } from './contexts/MeetingContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AppBootstrap } from './AppContent';
import { PunchClockProvider } from './contexts/PunchClockContext';
import { RealtimeProvider } from './contexts/RealtimeContext';
import { SupportProvider } from './contexts/SupportContext';

/**
 * A component that groups all data-related providers for cleaner code structure.
 */
const DataProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SupabaseProvider>
    <RealtimeProvider>
      <AuthProvider>
        <SettingsProvider>
          <TeamProvider>
            <RequestsProvider>
              <ProjectProvider>
                <TimeLogProvider>
                  <MeetingProvider>
                    <NotificationProvider>
                      <SupportProvider>
                        <TimeTrackingProvider>
                          <PunchClockProvider>
                            {children}
                          </PunchClockProvider>
                        </TimeTrackingProvider>
                      </SupportProvider>
                    </NotificationProvider>
                  </MeetingProvider>
                </TimeLogProvider>
              </ProjectProvider>
            </RequestsProvider>
          </TeamProvider>
        </SettingsProvider>
      </AuthProvider>
    </RealtimeProvider>
  </SupabaseProvider>
);


const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <DataProviders>
          <AppBootstrap />
        </DataProviders>
        <ToastContainer />
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;