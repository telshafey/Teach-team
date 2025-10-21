import React, { useState, useMemo, FormEvent, useEffect } from 'react';
import { SupportTicket, TicketComment, TicketStatus, TicketPriority, TeamMember } from '../../types';
import { useSupportContext } from '../../contexts/SupportContext';
import { useTeamContext } from '../../contexts/TeamContext';
import { useAuth } from '../../contexts/AuthContext';
import { StatusBadge } from '../ui/StatusBadge';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface SupportTicketDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: SupportTicket;
}

export const SupportTicketDetailModal: React.FC<SupportTicketDetailModalProps> = ({ isOpen, onClose, ticket }) => {
  const { comments, addComment, updateTicket } = useSupportContext();
  const { teamMembers, hasPermission } = useTeamContext();
  const { currentUser } = useAuth();
  
  const canManage = hasPermission('manage_support_tickets');
  const membersMap = useMemo(() => teamMembers.reduce((acc, m) => ({ ...acc, [m.id]: m }), {} as Record<number, TeamMember>), [teamMembers]);

  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [newStatus, setNewStatus] = useState(ticket.status);
  const [newPriority, setNewPriority] = useState(ticket.priority);
  const [newAssignee, setNewAssignee] = useState(ticket.assigneeId?.toString() || '');

  useEffect(() => {
    if (ticket) {
        setNewStatus(ticket.status);
        setNewPriority(ticket.priority);
        setNewAssignee(ticket.assigneeId?.toString() || '');
    }
  }, [ticket]);

  const ticketComments = useMemo(() => {
    return comments
      .filter(c => c.ticketId === ticket.id)
      .filter(c => canManage || !c.isInternal) // Show internal notes only to managers
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [comments, ticket.id, canManage]);
  
  const creator = membersMap[ticket.creatorId];

  const handleCommentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await addComment({ ticketId: ticket.id, text: newComment, isInternal });
    setNewComment('');
  };

  const handleUpdate = async () => {
    const updates: Partial<SupportTicket> = {};
    if (newStatus !== ticket.status) updates.status = newStatus;
    if (newPriority !== ticket.priority) updates.priority = newPriority;
    const assigneeId = newAssignee ? parseInt(newAssignee, 10) : undefined;
    if (assigneeId !== ticket.assigneeId) updates.assigneeId = assigneeId;

    if (Object.keys(updates).length > 0) {
        await updateTicket(ticket.id, updates);
    }
  };

  if (!isOpen || !currentUser) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] flex flex-col">
        <h2 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-100 flex-shrink-0">{ticket.subject}</h2>
        <div className="flex items-center space-x-4 rtl:space-x-reverse text-sm text-slate-500 mb-4 flex-shrink-0">
          <span>مقدمة من: {creator?.name || 'غير معروف'}</span>
          <span>في: {format(parseISO(ticket.createdAt), 'd MMM yyyy', { locale: arSA })}</span>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-md text-sm whitespace-pre-wrap">{ticket.description}</div>
            
            {/* Conversation */}
            <div className="space-y-4">
                {ticketComments.map(comment => {
                    const author = membersMap[comment.authorId];
                    const isCurrentUser = author?.id === currentUser.id;
                    return (
                        <div key={comment.id} className={`flex items-start gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                             <img src={author?.avatarUrl} alt={author?.name} className="w-8 h-8 rounded-full" />
                             <div className={`flex-1 ${comment.isInternal ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300' : 'bg-slate-100 dark:bg-slate-700'} rounded-lg p-3`}>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-semibold">{author?.name}</span>
                                    <span>{format(parseISO(comment.createdAt), 'p, d MMM', { locale: arSA })}</span>
                                </div>
                                <p className="text-sm mt-1">{comment.text}</p>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>

        {/* Action Forms */}
        <div className="mt-4 pt-4 border-t flex-shrink-0">
            {canManage && (
                <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg">
                    <div>
                        <label className="text-xs font-medium">الحالة</label>
                        <select value={newStatus} onChange={e => setNewStatus(e.target.value as TicketStatus)} className="w-full p-1.5 border rounded-md text-sm mt-1">
                            <option value="open">مفتوحة</option>
                            <option value="in-progress">قيد المعالجة</option>
                            <option value="closed">مغلقة</option>
                        </select>
                    </div>
                     <div>
                        <label className="text-xs font-medium">الأولوية</label>
                        <select value={newPriority} onChange={e => setNewPriority(e.target.value as TicketPriority)} className="w-full p-1.5 border rounded-md text-sm mt-1">
                            <option value="low">منخفضة</option>
                            <option value="medium">متوسطة</option>
                            <option value="high">عالية</option>
                            <option value="urgent">عاجلة</option>
                        </select>
                    </div>
                     <div>
                        <label className="text-xs font-medium">المسؤول</label>
                        <select value={newAssignee} onChange={e => setNewAssignee(e.target.value)} className="w-full p-1.5 border rounded-md text-sm mt-1">
                            <option value="">غير معين</option>
                            {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>
                    <div className="col-span-3 text-right">
                        <button onClick={handleUpdate} className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 rounded-md">تحديث</button>
                    </div>
                </div>
            )}
            <form onSubmit={handleCommentSubmit} className="space-y-2">
                 <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="أضف ردًا..." rows={2} className="w-full p-2 border rounded-md text-sm" />
                 <div className="flex justify-between items-center">
                    {canManage && (
                        <label className="flex items-center space-x-2 rtl:space-x-reverse text-sm">
                            <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} className="rounded text-sky-600" />
                            <span>ملاحظة داخلية (مرئية للمديرين فقط)</span>
                        </label>
                    )}
                    <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md ml-auto">إرسال</button>
                 </div>
            </form>
        </div>
        <div className="flex justify-end pt-4"><button type="button" onClick={onClose} className="px-4 py-2 text-sm">إغلاق</button></div>
      </div>
    </div>
  );
};