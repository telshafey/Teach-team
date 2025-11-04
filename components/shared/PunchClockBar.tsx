import React, { useState, useEffect } from 'react';
import { useTimeManagement } from '../../contexts/TimeManagementContext';
import { ClockIcon, XCircleIcon } from '../ui/Icons';

const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

export const PunchClockBar: React.FC = () => {
    const { activePunchIn, handlePunchOut } = useTimeManagement();
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    useEffect(() => {
        if (activePunchIn) {
            const updateTimer = () => {
                const seconds = Math.floor((Date.now() - activePunchIn.startTime) / 1000);
                setElapsedSeconds(seconds);
            };
            
            updateTimer(); // Initial update
            const intervalId = setInterval(updateTimer, 1000);
            
            return () => clearInterval(intervalId);
        } else {
            setElapsedSeconds(0);
        }
    }, [activePunchIn]);

    if (!activePunchIn) {
        return null;
    }

    return (
        <div className="bg-indigo-600 dark:bg-indigo-700 text-white flex items-center justify-between px-4 py-2 text-sm font-medium">
            <div className="flex items-center space-x-3 rtl:space-x-reverse overflow-hidden">
                <ClockIcon className="w-5 h-5 flex-shrink-0" />
                <span className="font-semibold hidden sm:inline">وقت العمل:</span>
                <span className="truncate">جارٍ تسجيل الوقت...</span>
            </div>
            <div className="flex items-center space-x-3 rtl:space-x-reverse flex-shrink-0">
                <span className="font-mono text-base tracking-wider">{formatDuration(elapsedSeconds)}</span>
                <button onClick={handlePunchOut} className="flex items-center space-x-1 rtl:space-x-reverse px-2 py-1 bg-red-500 rounded-md hover:bg-red-600">
                    <XCircleIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">تسجيل خروج</span>
                </button>
            </div>
        </div>
    );
};
