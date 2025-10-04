import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

interface ActiveTimer {
  taskId: string;
  taskTitle: string;
  projectId: string;
  startTime: number; // timestamp
}

interface LogToCreate {
  hours: number;
  taskId: string;
  projectId: string;
}

interface TimeTrackingContextType {
  activeTimer: ActiveTimer | null;
  showLogModalFor: LogToCreate | null;
  startTimer: (taskId: string, taskTitle: string, projectId: string) => void;
  stopTimer: () => void;
  closeLogModal: () => void;
}

const TimeTrackingContext = createContext<TimeTrackingContextType | undefined>(undefined);

export const TimeTrackingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [showLogModalFor, setShowLogModalFor] = useState<LogToCreate | null>(null);

  const startTimer = useCallback((taskId: string, taskTitle: string, projectId: string) => {
    if (activeTimer) {
      const confirmSwitch = window.confirm(`يوجد موقت آخر قيد التشغيل للمهمة "${activeTimer.taskTitle}". هل تريد إيقافه وبدء موقت جديد؟ (لن يتم حفظ الوقت)`);
      if (!confirmSwitch) {
        return;
      }
    }
    setActiveTimer({
      taskId,
      taskTitle,
      projectId,
      startTime: Date.now(),
    });
  }, [activeTimer]);

  const stopTimer = useCallback(() => {
    if (!activeTimer) return;
    
    const endTime = Date.now();
    const durationMs = endTime - activeTimer.startTime;
    const durationHours = durationMs / (1000 * 60 * 60);

    // Only open log modal for timers longer than a minute
    if (durationMs > 60000) {
        setShowLogModalFor({
            hours: durationHours,
            taskId: activeTimer.taskId,
            projectId: activeTimer.projectId,
        });
    }

    setActiveTimer(null);
  }, [activeTimer]);
  
  const closeLogModal = useCallback(() => {
      setShowLogModalFor(null);
  }, []);

  const value = { activeTimer, showLogModalFor, startTimer, stopTimer, closeLogModal };

  return (
    <TimeTrackingContext.Provider value={value}>
      {children}
    </TimeTrackingContext.Provider>
  );
};

export const useTimeTracking = () => {
  const context = useContext(TimeTrackingContext);
  if (context === undefined) {
    throw new Error('useTimeTracking must be used within a TimeTrackingProvider');
  }
  return context;
};
