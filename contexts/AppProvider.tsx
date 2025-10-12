import React, { ReactNode } from 'react';
import { SettingsProvider } from './SettingsContext';
import { NotificationProvider } from './NotificationContext';
import { TeamProvider } from './TeamContext';
import { RequestsProvider } from './RequestsContext';
import { MeetingProvider } from './MeetingContext';
import { TimeLogProvider } from './TimeLogContext';
import { ProjectProvider } from './ProjectContext';
import { TimeTrackingProvider } from './TimeTrackingContext';

// This component composes all the data providers for a cleaner App.tsx
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <SettingsProvider>
      <TeamProvider>
        <NotificationProvider>
          <TimeLogProvider>
            <ProjectProvider>
              <RequestsProvider>
                <MeetingProvider>
                  <TimeTrackingProvider>
                      {children}
                  </TimeTrackingProvider>
                </MeetingProvider>
              </RequestsProvider>
            </ProjectProvider>
          </TimeLogProvider>
        </NotificationProvider>
      </TeamProvider>
    </SettingsProvider>
  );
};
