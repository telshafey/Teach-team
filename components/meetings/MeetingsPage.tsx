import React, { useState, useMemo, useEffect } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Meeting, MeetingFormData } from '../../types';
import { Card } from '../ui/Card';
import { VideoCameraIcon, PlusIcon } from '../ui/Icons';
import { EmptyState } from '../ui/EmptyState';
import { MeetingFormModal } from '../modals/MeetingFormModal';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { useToast } from '../../contexts/ToastContext';

const REMINDER_WINDOW_MINUTES = 15;
const REMINDER_CHECK_INTERVAL_MS = 60 * 1000; // 1 minute

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
        <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">{meeting.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{format(new Date(meeting.scheduledTime), 'eeee, d MMMM yyyy - hh:mm a', { locale: arSA })}</p>
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
    const { addToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [notificationPermission, setNotificationPermission] = useState(Notification.permission);

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

    const requestNotificationPermission = async () => {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
            addToast('تم تفعيل إشعارات الاجتماعات بنجاح!', 'success');
        } else {
            addToast('تم تعطيل إشعارات الاجتماعات.', 'info');
        }
    };

    useEffect(() => {
        const getSentReminders = (): string[] => {
            const stored = localStorage.getItem('sentMeetingReminders');
            return stored ? JSON.parse(stored) : [];
        };

        const addSentReminder = (meetingId: string) => {
            const reminders = getSentReminders();
            if (!reminders.includes(meetingId)) {
                localStorage.setItem('sentMeetingReminders', JSON.stringify([...reminders, meetingId]));
            }
        };

        const checkAndSendReminders = () => {
            const now = new Date();
            const reminderThreshold = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000);
            const sentReminders = getSentReminders();

            upcomingMeetings.forEach(meeting => {
                const meetingTime = new Date(meeting.scheduledTime);
                if (meetingTime > now && meetingTime <= reminderThreshold && !sentReminders.includes(meeting.id)) {
                    addToast(`سيتم إرسال تذكير للمشاركين في اجتماع "${meeting.title}"`, 'info');

                    if (notificationPermission === 'granted') {
                        new Notification('تذكير باجتماع قادم!', {
                            body: `اجتماع "${meeting.title}" سيبدأ قريباً.`,
                            icon: 'data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27%3e%3cdefs%3e%3clinearGradient id=%27g%27 x1=%270%25%27 y1=%270%25%27 x2=%27100%25%27 y2=%27100%25%27%3e%3cstop offset=%270%25%27 stop-color=%27%2338bdf8%27/%3e%3cstop offset=%27100%25%27 stop-color=%27%230ea5e9%27/%3e%3c/linearGradient%3e%3c/defs%3e%3ccircle cx=%2750%27 cy=%2750%27 r=%2748%27 fill=%27url(%23g)%27/%3e%3cpath d=%27M30 55 L48 70 L75 40%27 stroke=%27white%27 stroke-width=%2710%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 fill=%27none%27/%3e%3ccircle cx=%2750%27 cy=%2750%27 r=%275%27 fill=%27white%27/%3e%3c/svg%3e'
                        });
                    }
                    
                    addSentReminder(meeting.id);
                }
            });
        };

        checkAndSendReminders();
        const intervalId = setInterval(checkAndSendReminders, REMINDER_CHECK_INTERVAL_MS);
        return () => clearInterval(intervalId);

    }, [upcomingMeetings, notificationPermission, addToast]);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">الاجتماعات</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">جدولة وإدارة اجتماعات الفريق عبر الإنترنت.</p>
                </div>
                {hasPermission('manage_meetings') && (
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                        <PlusIcon className="w-5 h-5"/><span>جدولة اجتماع جديد</span>
                    </button>
                )}
            </div>

            {notificationPermission === 'default' && (
                <div className="p-3 bg-sky-100 dark:bg-sky-900/50 rounded-lg mb-6 flex items-center justify-between">
                    <p className="text-sm text-sky-800 dark:text-sky-200">هل ترغب في استقبال إشعارات لتذكيرك بالاجتماعات القادمة؟</p>
                    <button onClick={requestNotificationPermission} className="px-3 py-1 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                        تفعيل الإشعارات
                    </button>
                </div>
            )}

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