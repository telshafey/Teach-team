import React, { useEffect } from 'react';
import { AppDataProvider, useAppDataContext } from './contexts/DataContext';
import { LoginPage } from './components/shared/LoginPage';
import { Dashboard } from './components/dashboard/Dashboard';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/ui/ToastContainer';
import { AuthProvider, useAuth } from './contexts/AuthContext';
// FIX: Corrected the import path for ProjectProvider.
import { ProjectProvider } from './contexts/ProjectContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { TimeTrackingProvider } from './contexts/TimeTrackingContext';

const AppContent: React.FC = () => {
  const { currentUser } = useAuth();
  const { siteSettings } = useAppDataContext();

  useEffect(() => {
    if (siteSettings?.appName) {
      document.title = siteSettings.appName;
    }
  }, [siteSettings?.appName]);

  return currentUser ? (
    <ProjectProvider>
      <Dashboard />
    </ProjectProvider>
  ) : (
    <LoginPage />
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
            <AppDataProvider>
              <TimeTrackingProvider>
                <AppContent />
                <ToastContainer />
              </TimeTrackingProvider>
            </AppDataProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
