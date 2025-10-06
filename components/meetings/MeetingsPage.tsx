import React, { useState, useMemo } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Meeting } from '../../types';
import { Card } from '../ui/Card';
import { PlusIcon, VideoCameraIcon } from '../ui/Icons';
import { MeetingFormModal } from '../modals/MeetingFormModal';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { EmptyState } from '../ui/EmptyState';

interface MeetingsPageProps {
  onJoinMeeting: (meeting: Meeting) => void;
}

const MeetingCard: React.FC<{ meeting: Meeting, onJoin: (meeting: Meeting) => void }> = ({ meeting, onJoin }) => {
  const { teamMembers } = useAppDataContext();
  const isPast = new Date(meeting.scheduledTime) < new Date();
  
  return (
    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h3 className="font-bold text-slate-800 dark:text-slate-100">{meeting.title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {format(new Date(meeting.scheduledTime), 'eeee, d MMMM yyyy - hh:mm a', { locale: arSA })}
        </p>
        <div className="flex -space-x-2 rtl:space-x-reverse mt-3">
          {meeting.participants.slice(0, 5).map(pId => {
            const member = teamMembers.find(m => m.id === pId);
            return member ? <img key={pId} src={member.avatarUrl} alt={member.name} title={member.name} className="w-8 h-8 rounded-full ring-2 ring-white dark:ring-slate-800" /> : null;
          })}
          {meeting.participants.length > 5 && (
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 text-xs font-semibold flex items-center justify-center ring-2 ring-white dark:ring-slate-800">
              +{meeting.participants.length - 5}
            </div>
          )}
        </div>
      </div>
      {!isPast && (
        <button onClick={() => onJoin(meeting)} className="w-full sm:w-auto flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">
          <VideoCameraIcon className="w-5 h-5"/><span>انضم الآن</span>
        </button>
      )}
    </div>
  );
};


export const MeetingsPage: React.FC<MeetingsPageProps> = ({ onJoinMeeting }) => {
    const { meetings, handleAddMeeting } = useAppDataContext();
    const { hasPermission } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { upcomingMeetings, pastMeetings } = useMemo(() => {
        const now = new Date();
        const sortedMeetings = [...meetings].sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime());
        return {
            upcomingMeetings: sortedMeetings.filter(m => new Date(m.scheduledTime) >= now).sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()),
            pastMeetings: sortedMeetings.filter(m => new Date(m.scheduledTime) < now),
        };
    }, [meetings]);

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">الاجتماعات</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">جدولة وإدارة اجتماعات الفيديو الخاصة بفريقك.</p>
                </div>
                {hasPermission('manage_meetings') && (
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 w-full md:w-auto">
                        <PlusIcon className="w-5 h-5"/><span>جدولة اجتماع جديد</span>
                    </button>
                )}
            </div>

            <div className="space-y-8">
                <div>
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">الاجتماعات القادمة</h3>
                    {upcomingMeetings.length > 0 ? (
                        <div className="space-y-4">
                            {upcomingMeetings.map(meeting => <MeetingCard key={meeting.id} meeting={meeting} onJoin={onJoinMeeting} />)}
                        </div>
                    ) : (
                        <Card><EmptyState title="لا توجد اجتماعات قادمة" message="لم يتم جدولة أي اجتماعات بعد." /></Card>
                    )}
                </div>
                 <div>
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">الاجتماعات السابقة</h3>
                     {pastMeetings.length > 0 ? (
                        <div className="space-y-4">
                            {pastMeetings.map(meeting => <MeetingCard key={meeting.id} meeting={meeting} onJoin={onJoinMeeting} />)}
                        </div>
                     ) : (
                         <Card><EmptyState title="لا توجد اجتماعات سابقة" message="لم يتم عقد أي اجتماعات بعد." /></Card>
                     )}
                </div>
            </div>

            {isModalOpen && (
                <MeetingFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleAddMeeting}
                />
            )}
        </div>
    );
};
