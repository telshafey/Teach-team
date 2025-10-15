import React, { useState, useMemo } from 'react';
import { useMeetingContext } from '../../contexts/MeetingContext';
import { useTeamContext } from '../../contexts/TeamContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { PlusIcon, VideoCameraIcon, TrashIcon, CalendarDaysIcon, ListBulletIcon } from '../ui/Icons';
import { Meeting } from '../../types';
import { MeetingFormModal } from '../modals/MeetingFormModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { EmptyState } from '../ui/EmptyState';
import { useNavigation } from '../../contexts/NavigationContext';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { useProjectContext } from '../../contexts/ProjectContext';

export const MeetingsPage: React.FC = () => {
    const { onNavigate } = useNavigation();
    const { meetings, handleAddMeeting, handleDeleteMeeting } = useMeetingContext();
    const { teamMembers } = useTeamContext();
    const { projects } = useProjectContext();
    const { currentUser, hasPermission } = useAuth();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);

    const myMeetings = useMemo(() => {
        if (!currentUser) return [];
        return currentUser.roleId === 'gm'
            ? meetings
            : meetings.filter(m => m.members.includes(currentUser.id));
    }, [meetings, currentUser]);

    const { upcomingMeetings, pastMeetings } = useMemo(() => {
        const now = new Date();
        const upcoming: Meeting[] = [];
        const past: Meeting[] = [];

        myMeetings.forEach(m => {
            if (m.endTime && new Date(m.endTime) < now) {
                past.push(m);
            } else {
                upcoming.push(m);
            }
        });
        
        upcoming.sort((a,b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime());
        past.sort((a,b) => new Date(b.startTime!).getTime() - new Date(a.startTime!).getTime());

        return { upcomingMeetings: upcoming, pastMeetings: past };
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
    
    const MeetingCardItem: React.FC<{meeting: Meeting, isPast: boolean}> = ({ meeting, isPast }) => {
        const participants = isPast 
            ? (meeting.attendees || []).map(id => teamMembers.find(m => m.id === id))
            : meeting.members.map(id => teamMembers.find(m => m.id === id));
        
        const validParticipants = participants.filter((m): m is NonNullable<typeof m> => !!m);
        const MAX_AVATARS = 5;
        const project = meeting.projectId ? projects.find(p => p.id === meeting.projectId) : null;


        return (
            <div className="p-4 space-y-4">
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">{meeting.title}</h3>
                        {meeting.startTime && (
                             <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {project && <span className="font-semibold">{project.name}</span>}
                                {project && <span className="mx-1">•</span>}
                                {format(parseISO(meeting.startTime), 'eeee, d MMMM yyyy', { locale: arSA })}
                                <span className="mx-1">•</span>
                                {format(parseISO(meeting.startTime), 'hh:mm a', { locale: arSA })} - {meeting.endTime ? format(parseISO(meeting.endTime), 'hh:mm a', { locale: arSA }) : ''}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse flex-shrink-0">
                        <button 
                            onClick={() => handleJoinMeeting(meeting)} 
                            className={`px-4 py-2 text-sm font-semibold text-white rounded-md flex items-center space-x-2 rtl:space-x-reverse ${isPast ? 'bg-slate-500 hover:bg-slate-600' : 'bg-green-600 hover:bg-green-700'}`}
                        >
                            <VideoCameraIcon className="w-5 h-5"/><span>{isPast ? 'إعادة فتح' : 'انضمام'}</span>
                        </button>
                        {hasPermission('manage_meetings') && (
                            <button onClick={() => setMeetingToDelete(meeting)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md">
                                <TrashIcon className="w-5 h-5"/>
                            </button>
                        )}
                    </div>
                </div>
                
                <div>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">{isPast ? 'الحضور:' : 'المشاركون:'}</p>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <div className="flex -space-x-2 rtl:space-x-reverse overflow-hidden">
                            {validParticipants.slice(0, MAX_AVATARS).map(p => (
                                <img key={p.id} src={p.avatarUrl} alt={p.name} title={p.name} className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-800" />
                            ))}
                        </div>
                        {validParticipants.length > MAX_AVATARS && (
                            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-200 ring-2 ring-white dark:ring-slate-800">
                                +{validParticipants.length - MAX_AVATARS}
                            </div>
                        )}
                        {validParticipants.length === 0 && (
                            <p className="text-xs text-slate-400">{isPast ? 'لم يحضر أحد.' : 'لا يوجد مشاركون محددون.'}</p>
                        )}
                    </div>
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
                                message="ستظهر الاجتماعات هنا بعد انتهاء وقتها." 
                            />
                       </div>
                    )}
                </Card>
            </div>

            {isFormOpen && (
                <MeetingFormModal
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    onSave={handleAddMeeting}
                    projects={projects}
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