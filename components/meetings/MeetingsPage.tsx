import React, { useState, useMemo } from 'react';
import { useMeetingContext } from '../../contexts/MeetingContext';
import { useTeamContext } from '../../contexts/TeamContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { PlusIcon, VideoCameraIcon, TrashIcon, ChevronUpDownIcon, ArrowUpIcon, ArrowDownIcon } from '../ui/Icons';
import { Meeting, TeamMember, Project } from '../../types';
import { MeetingFormModal } from '../modals/MeetingFormModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { EmptyState } from '../ui/EmptyState';
import { useNavigation } from '../../contexts/NavigationContext';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { useProjectContext } from '../../contexts/ProjectContext';

type SortableKeys = 'title' | 'project' | 'startTime' | 'attendees';

const UpcomingMeetingCard: React.FC<{
    meeting: Meeting;
    project: Project | undefined;
    participants: TeamMember[];
    onJoinMeeting: (meeting: Meeting) => void;
    onDeleteMeeting: (meeting: Meeting) => void;
    canManage: boolean;
}> = ({ meeting, project, participants, onJoinMeeting, onDeleteMeeting, canManage }) => {
    return (
        <div className="p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-grow">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">{meeting.title}</h3>
                    {meeting.startTime && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 space-x-2 rtl:space-x-reverse">
                            {project && <span>{project.name}</span>}
                            {project && <span>•</span>}
                            <span>{format(parseISO(meeting.startTime), 'eeee, d MMM', { locale: arSA })}</span>
                            <span>•</span>
                            <span>{format(parseISO(meeting.startTime), 'p', { locale: arSA })}</span>
                        </p>
                    )}
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse flex-shrink-0 w-full sm:w-auto justify-end">
                    <button 
                        onClick={() => onJoinMeeting(meeting)} 
                        className="px-4 py-2 text-sm font-semibold text-white rounded-md flex items-center space-x-2 rtl:space-x-reverse bg-green-600 hover:bg-green-700"
                    >
                        <VideoCameraIcon className="w-5 h-5"/><span>انضمام</span>
                    </button>
                    {canManage && (
                        <button onClick={() => onDeleteMeeting(meeting)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md">
                            <TrashIcon className="w-5 h-5"/>
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">المشاركون:</p>
                <div className="flex items-center">
                    <div className="flex -space-x-2 rtl:space-x-reverse overflow-hidden">
                        {participants.slice(0, 5).map(p => (
                            <img key={p.id} src={p.avatarUrl} alt={p.name} title={p.name} className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-800" />
                        ))}
                    </div>
                    {participants.length > 5 && (
                        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-xs font-semibold">
                            +{participants.length - 5}
                        </div>
                    )}
                    {participants.length === 0 && <p className="text-xs text-slate-400">لا يوجد مشاركون.</p>}
                </div>
            </div>
        </div>
    );
}

const SortableHeader: React.FC<{ 
    sortKey: SortableKeys;
    sortConfig: { key: SortableKeys; direction: 'ascending' | 'descending' };
    requestSort: (key: SortableKeys) => void;
    children: React.ReactNode;
}> = ({ sortKey, sortConfig, requestSort, children }) => {
    const isSorted = sortConfig?.key === sortKey;
    const directionIcon = isSorted 
        ? (sortConfig.direction === 'ascending' ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />) 
        : <ChevronUpDownIcon className="w-4 h-4 text-slate-400" />;

    return (
        <th className="px-4 py-3 cursor-pointer select-none" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center space-x-1 rtl:space-x-reverse">
                <span>{children}</span>
                {directionIcon}
            </div>
        </th>
    );
};


export const MeetingsPage: React.FC = () => {
    const { onNavigate } = useNavigation();
    const { meetings, handleAddMeeting, handleDeleteMeeting } = useMeetingContext();
    const { teamMembers, hasPermission } = useTeamContext();
    const { projects } = useProjectContext();
    const { currentUser } = useAuth();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'startTime', direction: 'descending' });

    const projectsMap = useMemo(() => projects.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<string, Project>), [projects]);
    const membersMap = useMemo(() => teamMembers.reduce((acc, m) => ({ ...acc, [m.id]: m }), {} as Record<number, TeamMember>), [teamMembers]);

    const myMeetings = useMemo(() => {
        if (!currentUser) return [];
        return currentUser.roleId === 'gm'
            ? meetings
            : meetings.filter(m => m.members?.includes(currentUser.id));
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
        return { upcomingMeetings: upcoming, pastMeetings: past };
    }, [myMeetings]);

    const sortedPastMeetings = useMemo(() => {
        const sortableMeetings = [...pastMeetings];
        sortableMeetings.sort((a, b) => {
            let aValue: string | number = '';
            let bValue: string | number = '';
    
            switch (sortConfig.key) {
              case 'title':
                aValue = a.title;
                bValue = b.title;
                break;
              case 'project':
                aValue = a.projectId ? projectsMap[a.projectId]?.name || 'zzzz' : 'zzzz';
                bValue = b.projectId ? projectsMap[b.projectId]?.name || 'zzzz' : 'zzzz';
                break;
              case 'startTime':
                aValue = a.startTime ? parseISO(a.startTime).getTime() : 0;
                bValue = b.startTime ? parseISO(b.startTime).getTime() : 0;
                break;
              case 'attendees':
                aValue = a.attendees?.length || 0;
                bValue = b.attendees?.length || 0;
                break;
            }
    
            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return sortableMeetings;
    }, [pastMeetings, sortConfig, projectsMap]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleJoinMeeting = (meeting: Meeting) => {
        onNavigate('meetingRoom', { meeting });
    };

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
                <button onClick={() => setIsFormOpen(true)} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 w-full md:w-auto">
                    <PlusIcon className="w-5 h-5"/><span>جدولة اجتماع جديد</span>
                </button>
            </div>

            <div className="space-y-6">
                <Card>
                    <h3 className="p-4 font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">الاجتماعات القادمة ({upcomingMeetings.length})</h3>
                    {upcomingMeetings.length > 0 ? (
                        <div className="divide-y divide-slate-200 dark:divide-slate-700">
                            {upcomingMeetings.map(meeting => (
                                <UpcomingMeetingCard 
                                    key={meeting.id} 
                                    meeting={meeting} 
                                    project={meeting.projectId ? projectsMap[meeting.projectId] : undefined}
                                    participants={(meeting.members || []).map(id => membersMap[id]).filter(Boolean)}
                                    onJoinMeeting={handleJoinMeeting}
                                    onDeleteMeeting={setMeetingToDelete}
                                    canManage={hasPermission('manage_meetings')}
                                />
                            ))}
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
                    <h3 className="p-4 font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">أرشيف الاجتماعات ({pastMeetings.length})</h3>
                    {pastMeetings.length > 0 ? (
                       <div className="overflow-x-auto">
                            <table className="w-full text-sm text-right">
                                <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-700/50">
                                    <tr>
                                        <SortableHeader sortKey="title" sortConfig={sortConfig} requestSort={requestSort}>الاجتماع</SortableHeader>
                                        <SortableHeader sortKey="project" sortConfig={sortConfig} requestSort={requestSort}>المشروع</SortableHeader>
                                        <SortableHeader sortKey="startTime" sortConfig={sortConfig} requestSort={requestSort}>التاريخ والوقت</SortableHeader>
                                        <SortableHeader sortKey="attendees" sortConfig={sortConfig} requestSort={requestSort}>الحاضرون / المدعوون</SortableHeader>
                                        <th className="px-4 py-3">الإجراء</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedPastMeetings.map(meeting => (
                                        <tr key={meeting.id} className="border-b dark:border-slate-700">
                                            <td className="px-4 py-3 font-medium">{meeting.title}</td>
                                            <td className="px-4 py-3">{meeting.projectId ? projectsMap[meeting.projectId]?.name : 'عام'}</td>
                                            <td className="px-4 py-3">{meeting.startTime ? format(parseISO(meeting.startTime), 'd MMM yyyy, p', { locale: arSA }) : '-'}</td>
                                            <td className="px-4 py-3">{meeting.attendees?.length || 0} / {meeting.members?.length || 0}</td>
                                            <td className="px-4 py-3">
                                                {hasPermission('manage_meetings') && (
                                                    <button 
                                                        onClick={() => setMeetingToDelete(meeting)} 
                                                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md"
                                                        aria-label="حذف الاجتماع"
                                                    >
                                                        <TrashIcon className="w-5 h-5"/>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                       </div>
                    ) : (
                         <div className="p-4">
                            <EmptyState 
                                icon={<VideoCameraIcon className="w-8 h-8"/>} 
                                title="لا توجد اجتماعات سابقة" 
                                message="لم يتم عقد أي اجتماعات بعد." 
                            />
                       </div>
                    )}
                </Card>
            </div>

             {isFormOpen && <MeetingFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleAddMeeting} projects={projects} />}
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