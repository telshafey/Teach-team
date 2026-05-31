import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';

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

export interface TimeTrackingContextType {
  activeTimer: ActiveTimer | null;
  showLogModalFor: LogToCreate | null;
  startTimer: (taskId: string, taskTitle: string, projectId: string) => void;
  stopTimer: () => void;
  closeLogModal: () => void;
}

const TimeTrackingContext = createContext<TimeTrackingContextType | undefined>(undefined);

const ACTIVE_TIMER_KEY = 'activeTimer';

export const TimeTrackingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [showLogModalFor, setShowLogModalFor] = useState<LogToCreate | null>(null);

  useEffect(() => {
    try {
      const savedTimer = localStorage.getItem(ACTIVE_TIMER_KEY);
      if (savedTimer) {
        const parsedTimer: ActiveTimer = JSON.parse(savedTimer);
        // Prevent restoring very old timers
        if (Date.now() - parsedTimer.startTime < 24 * 60 * 60 * 1000) {
            setActiveTimer(parsedTimer);
        } else {
            localStorage.removeItem(ACTIVE_TIMER_KEY);
        }
      }
    } catch (error) {
      console.error("Failed to load active timer from storage:", error);
      localStorage.removeItem(ACTIVE_TIMER_KEY);
    }
  }, []);

  const startTimer = useCallback((taskId: string, taskTitle: string, projectId: string) => {
    if (activeTimer) {
      const confirmSwitch = window.confirm(`يوجد موقت آخر قيد التشغيل للمهمة "${activeTimer.taskTitle}". هل تريد إيقافه وبدء موقت جديد؟ (لن يتم حفظ الوقت)`);
      if (!confirmSwitch) {
        return;
      }
    }
    const newTimer = {
      taskId,
      taskTitle,
      projectId,
      startTime: Date.now(),
    };
    setActiveTimer(newTimer);
    localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(newTimer));
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
    localStorage.removeItem(ACTIVE_TIMER_KEY);
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