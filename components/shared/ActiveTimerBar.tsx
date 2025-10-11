import React, { useState, useEffect } from 'react';
import { useTimeTracking } from '../../contexts/TimeTrackingContext';
import { ClockIcon, XCircleIcon } from '../ui/Icons';

const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

export const ActiveTimerBar: React.FC = () => {
    const { activeTimer, stopTimer } = useTimeTracking();
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    useEffect(() => {
        if (activeTimer) {
            const updateTimer = () => {
                const seconds = Math.floor((Date.now() - activeTimer.startTime) / 1000);
                setElapsedSeconds(seconds);
            };
            
            updateTimer(); // Initial update
            const intervalId = setInterval(updateTimer, 1000);
            
            return () => clearInterval(intervalId);
        } else {
            setElapsedSeconds(0);
        }
    }, [activeTimer]);

    if (!activeTimer) {
        return null;
    }

    return (
        <div className="bg-green-600 dark:bg-green-700 text-white flex items-center justify-between px-4 py-2 text-sm font-medium">
            <div className="flex items-center space-x-3 rtl:space-x-reverse overflow-hidden">
                <ClockIcon className="w-5 h-5 flex-shrink-0" />
                <span className="font-semibold hidden sm:inline">المهمة النشطة:</span>
                <span className="truncate">{activeTimer.taskTitle}</span>
            </div>
            <div className="flex items-center space-x-3 rtl:space-x-reverse flex-shrink-0">
                <span className="font-mono text-base tracking-wider">{formatDuration(elapsedSeconds)}</span>
                <button onClick={stopTimer} className="flex items-center space-x-1 rtl:space-x-reverse px-2 py-1 bg-red-500 rounded-md hover:bg-red-600">
                    <XCircleIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">إيقاف</span>
                </button>
            </div>
        </div>
    );
};
