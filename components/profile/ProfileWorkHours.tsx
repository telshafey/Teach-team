import React from 'react';
import { useAuth } from '@shared/contexts/AuthContext';
import { useTimeLogContext } from '@shared/contexts/TimeLogContext';
import { WeeklyHoursTracker } from './WeeklyHoursTracker';

interface ProfileWorkHoursProps {
  onStartChangeRequest: () => void;
}

export const ProfileWorkHours: React.FC<ProfileWorkHoursProps> = ({ onStartChangeRequest }) => {
    const { currentUser } = useAuth();
    const { dailyLogs } = useTimeLogContext();
    
    if (!currentUser || !currentUser.weeklyHoursRequirement) {
        return null; // Or some fallback UI
    }
    
    const myLogs = dailyLogs.filter(log => log.teamMemberId === currentUser.id);

    return (
         <WeeklyHoursTracker 
            member={currentUser} 
            logs={myLogs}
            onStartChangeRequest={onStartChangeRequest}
        />
    );
};
