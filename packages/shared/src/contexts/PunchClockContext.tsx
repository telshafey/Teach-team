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

export const PunchClockProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [activePunchIn, setActivePunchIn] = useState<ActivePunchIn | null>(
    null,
  );
  const [showPunchOutLogModal, setShowPunchOutLogModal] =
    useState<PunchOutLogData | null>(null);

  useEffect(() => {
    try {
      const savedPunchIn = localStorage.getItem(PUNCH_IN_KEY);
      if (savedPunchIn) {
        const parsed: ActivePunchIn = JSON.parse(savedPunchIn);
        // Prevent restoring very old sessions
        if (Date.now() - parsed.startTime < 24 * 60 * 60 * 1000) {
          // 24 hours
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

    // Only open log modal for sessions longer than a minute
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
    activePunchIn,
    showPunchOutLogModal,
    handlePunchIn,
    handlePunchOut,
    closePunchOutLogModal,
  };

  return (
    <PunchClockContext.Provider value={value}>
      {children}
    </PunchClockContext.Provider>
  );
};

export const usePunchClock = () => {
  const context = useContext(PunchClockContext);
  if (context === undefined) {
    throw new Error("usePunchClock must be used within a PunchClockProvider");
  }
  return context;
};
