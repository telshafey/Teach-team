import React, { useState } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { PlusIcon, VideoCameraIcon, TrashIcon } from '../ui/Icons';
import { Meeting } from '../../types';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { MeetingFormModal } from '../modals/MeetingFormModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { EmptyState } from '../ui/EmptyState';

interface MeetingsPageProps {
  onJoinMeeting: (meeting: Meeting) => void;
}

export const MeetingsPage: React.FC<MeetingsPageProps> = ({ onJoinMeeting }) => {
    const { meetings, teamMembers, handleAddMeeting, handleDeleteMeeting } = useAppDataContext();
    const { currentUser, hasPermission } = useAuth();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);

    const myMeetings = meetings.filter(m => m.participants.includes(currentUser?.id ?? -1));

    const confirmDelete = async () => {
        if (meetingToDelete) {
            await handleDeleteMeeting(meetingToDelete.id);
            setMeetingToDelete(null);
        }
    };

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">الاجتماعات</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">جدولة الاجتماعات والانضمام إليها.</p>
                </div>
                {hasPermission('manage_meetings') && (
                    <button onClick={() => setIsFormOpen(true)} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 w-full md:w-auto">
                        <PlusIcon className="w-5 h-5"/><span>جدولة اجتماع جديد</span>
                    </button>
                )}
            </div>
            <Card>
                {myMeetings.length > 0 ? (
                    <div className="divide-y divide-slate-200 dark:divide-slate-700">
                        {myMeetings.map(meeting => {
                             const participants = meeting.participants.map(id => teamMembers.find(m => m.id === id)?.name).filter(Boolean);
                            return (
                                <div key={meeting.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">{meeting.title}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                            {format(new Date(meeting.scheduledTime), 'eeee, d MMMM yyyy - hh:mm a', { locale: arSA })}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-2">المشاركون: {participants.join(', ')}</p>
                                    </div>
                                    <div className="flex items-center space-x-2 rtl:space-x-reverse flex-shrink-0">
                                        <button onClick={() => onJoinMeeting(meeting)} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 flex items-center space-x-2 rtl:space-x-reverse">
                                            <VideoCameraIcon className="w-5 h-5"/><span>انضمام</span>
                                        </button>
                                        {hasPermission('manage_meetings') && (
                                            <button onClick={() => setMeetingToDelete(meeting)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md">
                                                <TrashIcon className="w-5 h-5"/>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <EmptyState
                        icon={<VideoCameraIcon className="w-12 h-12"/>}
                        title="لا توجد اجتماعات"
                        message="ليس لديك اجتماعات مجدولة حاليًا."
                    />
                )}
            </Card>

            {isFormOpen && (
                <MeetingFormModal
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    onSave={handleAddMeeting}
                />
            )}
            
            {meetingToDelete && (
                <ConfirmationModal
                    isOpen={!!meetingToDelete}
                    onClose={() => setMeetingToDelete(null)}
                    onConfirm={confirmDelete}
                    title="تأكيد حذف الاجتماع"
                    message={`هل أنت متأكد من رغبتك في حذف اجتماع "${meetingToDelete.title}"؟`}
                    isDestructive
                />
            )}
        </div>
    );
};
