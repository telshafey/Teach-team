import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppDataContext } from '../../contexts/DataContext';
import { WeeklyHoursTracker } from './WeeklyHoursTracker';

interface ProfileWorkHoursProps {
  onStartChangeRequest: () => void;
}

export const ProfileWorkHours: React.FC<ProfileWorkHoursProps> = ({ onStartChangeRequest }) => {
    const { currentUser } = useAuth();
    const { dailyLogs } = useAppDataContext();
    
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