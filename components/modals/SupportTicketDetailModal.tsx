import React, { useState, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { SupportTicket, TicketComment, TicketStatus, TeamMember } from '../../types';
import { useSupportContext } from '../../contexts/SupportContext';
import { useTeamContext } from '../../contexts/TeamContext';
import { useAuth } from '../../contexts/AuthContext';
import { StatusBadge } from '../ui/StatusBadge';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { LoadingSpinner } from '../ui/LoadingSpinner';

const CommentItem: React.FC<{ comment: TicketComment, authorName: string, isInternal: boolean }> = ({ comment, authorName, isInternal }) => (
    <div className={`p-3 rounded-lg ${isInternal ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-slate-100 dark:bg-slate-700/50'}`}>
        <div className="flex justify-between items-center text-xs">
            <span className="font-semibold">{authorName} {isInternal && '(تعليق داخلي)'}</span>
            <span className="text-slate-500">{format(parseISO(comment.createdAt), 'd MMM, p', { locale: arSA })}</span>
        </div>
        <p className="text-sm mt-1">{comment.text}</p>
    </div>
);

interface SupportTicketDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: SupportTicket;
}

export const SupportTicketDetailModal: React.FC<SupportTicketDetailModalProps> = ({ isOpen, onClose, ticket }) => {
  const { comments, addComment, updateTicket } = useSupportContext();
  const { teamMembers, hasPermission } = useTeamContext();
  const { currentUser } = useAuth();

  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canManage = hasPermission('manage_support_tickets');
  const membersMap = useMemo(() => teamMembers.reduce((acc, m) => ({ ...acc, [m.id]: m }), {} as Record<number, TeamMember>), [teamMembers]);
  const ticketComments = useMemo(() => comments.filter(c => c.ticketId === ticket.id).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), [comments, ticket.id]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsSaving(true);
    try {
        await addComment({ ticketId: ticket.id, text: newComment, isInternal });
        setNewComment('');
    } finally {
        setIsSaving(false);
    }
  }
  
  const handleStatusChange = (status: TicketStatus) => {
      updateTicket(ticket.id, { status });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`تذكرة #${ticket.id}`} size="xl">
      <div className="space-y-4">
        <div className="p-4 border rounded-lg">
            <h2 className="text-lg font-bold mb-2">{ticket.subject}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm mb-4">
                <span>الحالة: <StatusBadge status={ticket.status} type="support_ticket_status"/></span>
                <span>الأولوية: <StatusBadge status={ticket.priority} type="support_ticket_priority"/></span>
                <span>الفئة: {ticket.category}</span>
                <span>مقدم الطلب: {membersMap[ticket.creatorId]?.name || 'غير معروف'}</span>
            </div>
            <p className="text-sm bg-slate-50 dark:bg-slate-700/50 p-3 rounded-md whitespace-pre-wrap">{ticket.description}</p>
        </div>

        <div className="space-y-3">
            <h3 className="font-semibold">التعليقات</h3>
            <div className="max-h-60 overflow-y-auto space-y-3 p-2 border rounded-md">
                {ticketComments.map(c => (
                    (!c.isInternal || canManage) && <CommentItem key={c.id} comment={c} authorName={membersMap[c.authorId]?.name || '...'} isInternal={c.isInternal} />
                ))}
                {ticketComments.length === 0 && <p className="text-sm text-center text-slate-500 py-4">لا توجد تعليقات.</p>}
            </div>
        </div>
        
        <div className="space-y-2 border-t pt-4">
            <textarea value={newComment} onChange={e => setNewComment(e.target.value)} rows={3} placeholder="أضف ردك..." className="w-full p-2 border rounded-md"/>
            <div className="flex justify-between items-center">
                <div>
                {canManage && (
                    <label className="flex items-center space-x-2 text-sm">
                        <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} />
                        <span>تعليق داخلي (لن يظهر للمستخدم)</span>
                    </label>
                )}
                </div>
                <div className="flex items-center space-x-2">
                    {canManage && ticket.status !== 'closed' && (
                        <button onClick={() => handleStatusChange('closed')} className="px-3 py-1.5 text-sm rounded-md bg-slate-200">إغلاق التذكرة</button>
                    )}
                    <button onClick={handleAddComment} disabled={isSaving} className="px-4 py-2 text-sm text-white bg-sky-600 rounded-md">
                        {isSaving ? <LoadingSpinner/> : 'إضافة رد'}
                    </button>
                </div>
            </div>
        </div>

      </div>
    </Modal>
  );
};
