import React, { useState, useMemo } from 'react';
import { useMeetingContext } from '../../contexts/MeetingContext';
import { useTeamContext } from '../../contexts/TeamContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { PlusIcon, VideoCameraIcon, TrashIcon, ListBulletIcon, CalendarDaysIcon, ClockIcon } from '../ui/Icons';
import { Meeting } from '../../types';
import { format, isSameDay, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { MeetingFormModal } from '../modals/MeetingFormModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { EmptyState } from '../ui/EmptyState';
import { useNavigation } from '../../contexts/NavigationContext';
import { Calendar } from '../ui/Calendar';


const MeetingsForDateModal: React.FC<{
  date: Date | null;
  meetings: Meeting[];
  onClose: () => void;
  onJoin: (meeting: Meeting) => void;
}> = ({ date, meetings, onClose, onJoin }) => {
    if (!date) return null;

    const meetingsForDate = meetings.filter(m => isSameDay(parseISO(m.scheduledTime), date));
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-100">اجتماعات يوم {format(date, 'd MMMM yyyy', { locale: arSA })}</h2>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                    {meetingsForDate.length > 0 ? meetingsForDate.map(meeting => {
                        const isPast = new Date(meeting.scheduledTime) < new Date();
                        return (
                            <div key={meeting.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{meeting.title}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{format(new Date(meeting.scheduledTime), 'hh:mm a', { locale: arSA })}</p>
                                </div>
                                <button
                                    onClick={() => onJoin(meeting)}
                                    disabled={isPast}
                                    className="px-3 py-1 text-xs font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                                >
                                    {isPast ? 'انتهى' : 'انضمام'}
                                </button>
                            </div>
                        )
                    }) : (
                        <p className="text-slate-500 dark:text-slate-400 text-center py-4">لا توجد اجتماعات مجدولة لهذا اليوم.</p>
                    )}
                </div>
                <div className="flex justify-end pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 dark:bg-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600">إغلاق</button>
                </div>
            </div>
        </div>
    )
}

export const MeetingsPage: React.FC = () => {
    const { onNavigate } = useNavigation();
    const { meetings, handleAddMeeting, handleDeleteMeeting } = useMeetingContext();
    const { teamMembers } = useTeamContext();
    const { currentUser, hasPermission } = useAuth();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);


    const myMeetings = useMemo(() => {
        if (!currentUser) return [];
        // General Manager can see all meetings
        if (currentUser.roleId === 'gm') {
            return meetings.sort((a,b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
        }
        // Others see only meetings they are part of
        return meetings
            .filter(m => m.members.includes(currentUser.id))
            .sort((a,b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
    }, [meetings, currentUser]);

    const { upcomingMeetings, pastMeetings } = useMemo(() => {
        const now = new Date();
        const upcoming = myMeetings.filter(m => new Date(m.scheduledTime) >= now);
        const past = myMeetings.filter(m => new Date(m.scheduledTime) < now).sort((a,b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime());
        return { upcomingMeetings: upcoming, pastMeetings: past };
    }, [myMeetings]);

     const calendarEvents = useMemo(() => {
        const events: { date: Date; isMeeting?: boolean }[] = [];
        const dateMap: { [key: string]: { isMeeting?: boolean } } = {};
        myMeetings.forEach(meeting => {
            const dateStr = format(new Date(meeting.scheduledTime), 'yyyy-MM-dd');
            if (!dateMap[dateStr]) dateMap[dateStr] = {};
            dateMap[dateStr].isMeeting = true;
        });
        for (const dateStr in dateMap) {
            events.push({ date: new Date(dateStr), isMeeting: true });
        }
        return events;
    }, [myMeetings]);

    const handleJoinMeeting = (meeting: Meeting) => {
        onNavigate('meetingRoom', { meeting });
    };

    const confirmDelete = async () => {
        if (meetingToDelete) {
            await handleDeleteMeeting(meetingToDelete.id);
            setMeetingToDelete(null);
        }
    };
    
    const MeetingCardItem: React.FC<{meeting: Meeting, isPast?: boolean}> = ({ meeting, isPast }) => {
        const participants = meeting.members.map(id => teamMembers.find(m => m.id === id)).filter((m): m is NonNullable<typeof m> => !!m);
        const MAX_AVATARS = 5;

        return (
            <div className="p-4 space-y-3">
                <div className="flex justify-between items-start gap-4">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">{meeting.title}</h3>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse flex-shrink-0">
                        <button 
                            onClick={() => handleJoinMeeting(meeting)} 
                            disabled={isPast}
                            className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 flex items-center space-x-2 rtl:space-x-reverse disabled:bg-slate-400 disabled:cursor-not-allowed"
                        >
                            <VideoCameraIcon className="w-5 h-5"/><span>{isPast ? 'انتهى' : 'انضمام'}</span>
                        </button>
                        {hasPermission('manage_meetings') && (
                            <button onClick={() => setMeetingToDelete(meeting)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md">
                                <TrashIcon className="w-5 h-5"/>
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm text-slate-500 dark:text-slate-400">
                    <ClockIcon className="w-4 h-4 flex-shrink-0" />
                    <span>{format(new Date(meeting.scheduledTime), 'eeee, d MMMM yyyy - hh:mm a', { locale: arSA })}</span>
                </div>

                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <div className="flex -space-x-2 rtl:space-x-reverse overflow-hidden">
                        {participants.slice(0, MAX_AVATARS).map(p => (
                            <img key={p.id} src={p.avatarUrl} alt={p.name} title={p.name} className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-800" />
                        ))}
                    </div>
                    {participants.length > MAX_AVATARS && (
                        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-200 ring-2 ring-white dark:ring-slate-800">
                            +{participants.length - MAX_AVATARS}
                        </div>
                    )}
                     {participants.length === 0 && (
                         <p className="text-xs text-slate-400">لا يوجد مشاركون محددون</p>
                     )}
                </div>
            </div>
        )
    }

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

             <div className="flex items-center justify-start mb-6">
                <div className="flex items-center bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                    <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 text-sm rounded-md flex items-center space-x-2 rtl:space-x-reverse ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 text-sky-600 shadow-sm' : 'text-slate-500 dark:text-slate-300'}`}>
                        <ListBulletIcon className="w-5 h-5" /> <span>عرض القائمة</span>
                    </button>
                    <button onClick={() => setViewMode('calendar')} className={`px-3 py-1.5 text-sm rounded-md flex items-center space-x-2 rtl:space-x-reverse ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-600 text-sky-600 shadow-sm' : 'text-slate-500 dark:text-slate-300'}`}>
                        <CalendarDaysIcon className="w-5 h-5" /> <span>عرض التقويم</span>
                    </button>
                </div>
            </div>

            {viewMode === 'list' ? (
                <div className="space-y-6">
                    <Card>
                        <h3 className="p-4 font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">الاجتماعات القادمة ({upcomingMeetings.length})</h3>
                        {upcomingMeetings.length > 0 ? (
                            <div className="divide-y divide-slate-200 dark:divide-slate-700">
                                {upcomingMeetings.map(meeting => <MeetingCardItem key={meeting.id} meeting={meeting} isPast={false} />)}
                            </div>
                        ) : (
                           <div className="p-4">
                                <EmptyState 
                                    icon={<VideoCameraIcon className="w-8 h-8"/>} 
                                    title="لا توجد اجتماعات قادمة" 
                                    message="يمكنك جدولة اجتماع جديد من الزر أعلاه." 
                                />
                           </div>
                        )}
                    </Card>
                     <Card>
                        <h3 className="p-4 font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">الاجتماعات السابقة ({pastMeetings.length})</h3>
                        {pastMeetings.length > 0 ? (
                            <div className="divide-y divide-slate-200 dark:divide-slate-700">
                                {pastMeetings.map(meeting => <MeetingCardItem key={meeting.id} meeting={meeting} isPast={true} />)}
                            </div>
                        ) : (
                           <div className="p-4">
                                <EmptyState 
                                    icon={<VideoCameraIcon className="w-8 h-8"/>} 
                                    title="لا توجد اجتماعات سابقة" 
                                    message="سيظهر سجل اجتماعاتك هنا بعد انتهائها." 
                                />
                           </div>
                        )}
                    </Card>
                </div>
            ) : (
                 <Card>
                    <Calendar events={calendarEvents} onDateClick={(date) => setSelectedCalendarDate(date)} highlightedDate={selectedCalendarDate} />
                </Card>
            )}


            <MeetingsForDateModal
                date={selectedCalendarDate}
                meetings={myMeetings}
                onClose={() => setSelectedCalendarDate(null)}
                onJoin={handleJoinMeeting}
            />

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