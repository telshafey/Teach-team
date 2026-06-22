import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
} from "react";

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

const TimeManagementContext = createContext<
  TimeManagementContextType | undefined
>(undefined);

const ACTIVE_TIMER_KEY = "activeTimer";
const PUNCH_IN_KEY = "activePunchIn";

export const useTimeManagement = (): TimeManagementContextType => { 
        return new Proxy({}, { 
            get: (target, prop) => { 
                if (prop === 'isLoading') return false;
                if (prop === 'hasPermission') return () => true;
                if (prop === 'visibleMemberIds') return new Set();
                if (prop === 'activeTimer' || prop === 'activePunchIn' || prop === 'showLogModalFor' || prop === 'showPunchOutLogModal') return null;
                return typeof prop === 'string' && prop.startsWith('handle') ? async () => {} : () => {}; 
            } 
        }) as TimeManagementContextType; 
    };

export const useTimeManagementContext = useTimeManagement;
