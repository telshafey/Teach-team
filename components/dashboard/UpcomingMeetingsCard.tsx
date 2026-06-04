import React from 'react';
import { Meeting } from '@shared/types';
import { Card } from '../ui/Card';
import { VideoCameraIcon } from '../ui/Icons';
import { EmptyState } from '../ui/EmptyState';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface UpcomingMeetingsCardProps {
    title: string;
    meetings: Meeting[];
    onJoinMeeting: (meeting: Meeting) => void;
}

export const UpcomingMeetingsCard: React.FC<UpcomingMeetingsCardProps> = ({ title, meetings, onJoinMeeting }) => {
    
    const upcomingMeetings = meetings
        .filter(m => m.endTime && new Date(m.endTime) > new Date())
        .sort((a, b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime())
        .slice(0, 5);

    return (
        <Card title={title} icon={<VideoCameraIcon className="w-5 h-5" />}>
            <div className="flex-1 flex flex-col h-full">
                {upcomingMeetings.length > 0 ? (
                    <div className="space-y-3 overflow-y-auto pr-1 pb-2">
                        {upcomingMeetings.map(meeting => (
                            <div key={meeting.id} className="p-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 rounded-md flex justify-between items-center transition-colors">
                                <div>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{meeting.title}</p>
                                    {meeting.startTime && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            {format(parseISO(meeting.startTime), 'd MMM, hh:mm a', { locale: arSA })}
                                        </p>
                                    )}
                                </div>
                                <button onClick={() => onJoinMeeting(meeting)} className="text-xs font-semibold text-green-600 dark:text-green-400 hover:underline px-2 py-1 bg-green-50 dark:bg-green-900/30 rounded-md">انضمام</button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState icon={<VideoCameraIcon className="w-8 h-8" />} title="لا توجد اجتماعات" message="لا توجد اجتماعات قادمة مجدولة." />
                )}
            </div>
        </Card>
    );
};