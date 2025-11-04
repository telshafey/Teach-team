import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@shared/contexts/AuthContext';
import { ThemeProvider } from '@shared/contexts/ThemeContext';
import { ToastProvider } from '@shared/contexts/ToastContext';
import { SupabaseProvider, useSupabase } from '@shared/contexts/SupabaseContext';
import { SettingsProvider } from '@shared/contexts/SettingsContext';
import { TeamProvider } from '@shared/contexts/TeamContext';
import { ProjectProvider } from '@shared/contexts/ProjectContext';
import { TimeLogProvider } from '@shared/contexts/TimeLogContext';
import { RequestsProvider } from '@shared/contexts/RequestsContext';
import { MeetingProvider } from '@shared/contexts/MeetingContext';
import { NotificationProvider } from '@shared/contexts/NotificationContext';
import { RealtimeProvider } from '@shared/contexts/RealtimeContext';
import { SupportProvider } from '@shared/contexts/SupportContext';
import { TimeManagementProvider } from '@shared/contexts/TimeManagementContext';
import { LoginPage } from './components/LoginPage';
import MainPage from './components/MainPage';

const queryClient = new QueryClient();

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
                        <TimeManagementProvider>
                          {children}
                        </TimeManagementProvider>
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

const AppContent: React.FC = () => {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const { isLoading: isSupabaseLoading } = useSupabase();

  if (isAuthLoading || isSupabaseLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return currentUser ? <MainPage /> : <LoginPage />;
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <DataProviders>
            <AppContent />
          </DataProviders>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
