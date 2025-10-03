import React, { useState, useMemo } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Meeting, MeetingFormData } from '../../types';
import { Card } from '../ui/Card';
import { VideoCameraIcon, PlusIcon } from '../ui/Icons';
import { EmptyState } from '../ui/EmptyState';
import { MeetingFormModal } from '../modals/MeetingFormModal';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface MeetingsPageProps {
    onJoinMeeting: (meeting: Meeting) => void;
}

const MeetingCard: React.FC<{ meeting: Meeting, onJoin: (meeting: Meeting) => void }> = ({ meeting, onJoin }) => {
    const { teamMembers } = useAppDataContext();
    const isUpcoming = new Date(meeting.scheduledTime) > new Date();
    
    const participantDetails = useMemo(() => {
        return meeting.participants.map(id => teamMembers.find(m => m.id === id)).filter(Boolean);
    }, [meeting.participants, teamMembers]);

    return (
        <div className="p-4 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
            <div>
                <h3 className="font-bold text-slate-800">{meeting.title}</h3>
                <p className="text-sm text-slate-500">{format(new Date(meeting.scheduledTime), 'eeee, d MMMM yyyy - hh:mm a', { locale: arSA })}</p>
                <div className="flex items-center space-x-2 rtl:space-x-reverse mt-2">
                    <span className="text-xs font-medium">المشاركون:</span>
                    <div className="flex -space-x-2 rtl:space-x-reverse overflow-hidden">
                        {participantDetails.slice(0, 5).map(p => p && (
                            <img key={p.id} className="inline-block h-6 w-6 rounded-full ring-2 ring-white" src={p.avatarUrl} alt={p.name} title={p.name} />
                        ))}
                    </div>
                     {participantDetails.length > 5 && (
                        <span className="text-xs font-semibold text-slate-500">+{participantDetails.length - 5}</span>
                    )}
                </div>
            </div>
            {isUpcoming && (
                <button onClick={() => onJoin(meeting)} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">
                    انضم الآن
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
        const upcoming = meetings
            .filter(m => new Date(m.scheduledTime) >= now)
            .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
        const past = meetings
            .filter(m => new Date(m.scheduledTime) < now)
            .sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime());
        return { upcomingMeetings: upcoming, pastMeetings: past };
    }, [meetings]);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">الاجتماعات</h2>
                    <p className="text-md text-slate-500">جدولة وإدارة اجتماعات الفريق عبر الإنترنت.</p>
                </div>
                {hasPermission('manage_meetings') && (
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                        <PlusIcon className="w-5 h-5"/><span>جدولة اجتماع جديد</span>
                    </button>
                )}
            </div>

            <div className="space-y-6">
                <Card title="الاجتماعات القادمة" icon={<VideoCameraIcon className="w-5 h-5"/>}>
                    <div className="space-y-3">
                        {upcomingMeetings.length > 0 ? (
                            upcomingMeetings.map(m => <MeetingCard key={m.id} meeting={m} onJoin={onJoinMeeting} />)
                        ) : (
                            <EmptyState title="لا توجد اجتماعات قادمة" message="قم بجدولة اجتماع جديد لبدء التعاون مع فريقك." />
                        )}
                    </div>
                </Card>

                <Card title="الاجتماعات السابقة">
                     <div className="space-y-3">
                        {pastMeetings.length > 0 ? (
                            pastMeetings.map(m => <MeetingCard key={m.id} meeting={m} onJoin={onJoinMeeting} />)
                        ) : (
                             <EmptyState title="لا توجد اجتماعات سابقة" message="ستظهر الاجتماعات التي حضرتها هنا." />
                        )}
                    </div>
                </Card>
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
