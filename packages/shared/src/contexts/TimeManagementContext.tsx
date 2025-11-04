import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';

// From TimeTrackingContext
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

// From PunchClockContext
interface ActivePunchIn {
  startTime: number; // timestamp
}
interface PunchOutLogData {
    hours: number;
}

// New combined type
export interface TimeManagementContextType {
  // TimeTracking parts
  activeTimer: ActiveTimer | null;
  showLogModalFor: LogToCreate | null;
  startTimer: (taskId: string, taskTitle: string, projectId: string) => void;
  stopTimer: () => void;
  closeLogModal: () => void;
  // PunchClock parts
  activePunchIn: ActivePunchIn | null;
  showPunchOutLogModal: PunchOutLogData | null;
  handlePunchIn: () => void;
  handlePunchOut: () => void;
  closePunchOutLogModal: () => void;
}

const TimeManagementContext = createContext<TimeManagementContextType | undefined>(undefined);

const ACTIVE_TIMER_KEY = 'activeTimer';
const PUNCH_IN_KEY = 'activePunchIn';

export const TimeManagementProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State from TimeTrackingProvider
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [showLogModalFor, setShowLogModalFor] = useState<LogToCreate | null>(null);
  
  // State from PunchClockProvider
  const [activePunchIn, setActivePunchIn] = useState<ActivePunchIn | null>(null);
  const [showPunchOutLogModal, setShowPunchOutLogModal] = useState<PunchOutLogData | null>(null);

  // useEffect from TimeTrackingProvider
  useEffect(() => {
    try {
      const savedTimer = localStorage.getItem(ACTIVE_TIMER_KEY);
      if (savedTimer) {
        const parsedTimer: ActiveTimer = JSON.parse(savedTimer);
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

  // useEffect from PunchClockProvider
  useEffect(() => {
    try {
      const savedPunchIn = localStorage.getItem(PUNCH_IN_KEY);
      if (savedPunchIn) {
        const parsed: ActivePunchIn = JSON.parse(savedPunchIn);
        if (Date.now() - parsed.startTime < 24 * 60 * 60 * 1000) { // 24 hours
            setActivePunchIn(parsed);
        } else {
            localStorage.removeItem(PUNCH_IN_KEY);
        }
      }
    } catch (error) {
      console.error("Failed to load active punch-in from storage:", error);
      localStorage.removeItem(PUNCH_IN_KEY);
    }
  }, []);

  // Logic from TimeTrackingProvider
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

  // Logic from PunchClockProvider
  const handlePunchIn = useCallback(() => {
    const newPunchIn = {
      startTime: Date.now(),
    };
    setActivePunchIn(newPunchIn);
    localStorage.setItem(PUNCH_IN_KEY, JSON.stringify(newPunchIn));
  }, []);

  const handlePunchOut = useCallback(() => {
    if (!activePunchIn) return;
    
    const endTime = Date.now();
    const durationMs = endTime - activePunchIn.startTime;
    const durationHours = durationMs / (1000 * 60 * 60);

    if (durationMs > 60000) {
        setShowPunchOutLogModal({
            hours: durationHours,
        });
    }

    setActivePunchIn(null);
    localStorage.removeItem(PUNCH_IN_KEY);
  }, [activePunchIn]);
  
  const closePunchOutLogModal = useCallback(() => {
      setShowPunchOutLogModal(null);
  }, []);

  const value = { 
    activeTimer, showLogModalFor, startTimer, stopTimer, closeLogModal,
    activePunchIn, showPunchOutLogModal, handlePunchIn, handlePunchOut, closePunchOutLogModal
  };

  return (
    <TimeManagementContext.Provider value={value}>
      {children}
    </TimeManagementContext.Provider>
  );
};

export const useTimeManagement = () => {
  const context = useContext(TimeManagementContext);
  if (context === undefined) {
    throw new Error('useTimeManagement must be used within a TimeManagementProvider');
  }
  return context;
};
