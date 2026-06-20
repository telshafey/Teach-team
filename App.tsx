import React from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { AuthProvider } from "@shared/contexts/AuthContext";
import { ThemeProvider } from "@shared/contexts/ThemeContext";
import { ToastProvider } from "@shared/contexts/ToastContext";
import { ToastContainer } from "./components/ui/ToastContainer";
import { SupabaseProvider } from "@shared/contexts/SupabaseContext";
import { SettingsProvider } from "@shared/contexts/SettingsContext";
import { TeamProvider } from "@shared/contexts/TeamContext";
import { ProjectProvider } from "@shared/contexts/ProjectContext";
import { TimeLogProvider } from "@shared/contexts/TimeLogContext";
import { RequestsProvider } from "@shared/contexts/RequestsContext";
import { MeetingProvider } from "@shared/contexts/MeetingContext";
import { NotificationProvider } from "@shared/contexts/NotificationContext";
import { AppBootstrap } from "./AppContent";
import { RealtimeProvider } from "@shared/contexts/RealtimeContext";
import { SupportProvider } from "@shared/contexts/SupportContext";
import { TimeManagementProvider } from "@shared/contexts/TimeManagementContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 24 * 60 * 60 * 1000, // 24 hours
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

/**
 * A component that groups all data-related providers for cleaner code structure.
 */
const DataProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
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

const App: React.FC = () => {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <ThemeProvider>
        <ToastProvider>
          <DataProviders>
            <AppBootstrap />
          </DataProviders>
          <ToastContainer />
        </ToastProvider>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
};

export default App;
