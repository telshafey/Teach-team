import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
} from "react";

interface ActivePunchIn {
  startTime: number; // timestamp
}

interface PunchOutLogData {
  hours: number;
}

export interface PunchClockContextType {
  activePunchIn: ActivePunchIn | null;
  showPunchOutLogModal: PunchOutLogData | null;
  handlePunchIn: () => void;
  handlePunchOut: () => void;
  closePunchOutLogModal: () => void;
}

const PunchClockContext = createContext<PunchClockContextType | undefined>(
  undefined,
);

const PUNCH_IN_KEY = "activePunchIn";

export const usePunchClock = (): PunchClockContextType => { 
        return new Proxy({}, { 
            get: (target, prop) => { 
                if (prop === 'isLoading') return false;
                if (prop === 'hasPermission') return () => true;
                if (prop === 'visibleMemberIds') return new Set();
                return typeof prop === 'string' && prop.startsWith('handle') ? async () => {} : []; 
            } 
        }) as PunchClockContextType; 
    };

export const usePunchClockContext = usePunchClock;
