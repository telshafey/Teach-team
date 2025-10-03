import React, { useState, FormEvent, useRef } from 'react';
import { Task } from '../../types';
import { useAppDataContext } from '../../contexts/DataContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { PaperClipIcon, UserIcon, FolderIcon, ClockIcon } from '../ui/Icons';
import { format, formatDistanceToNow } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ isOpen, onClose, task }) => {
    const { teamMembers } = useAppDataContext();
    const { projects, handleAddTaskComment, handleAddTaskAttachment } = useProjectContext();
    const { currentUser } = useAuth();
    const [newComment, setNewComment] = useState('');
    const [isCommenting, setIsCommenting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    if (!isOpen) return null;
    
    const project = projects.find(p => p.id === task.projectId);
    const assignedMember = teamMembers.find(m => m.id === task.assignedTo);

    const handleCommentSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setIsCommenting(true);
        await handleAddTaskComment(task.id, newComment);
        setNewComment('');
        setIsCommenting(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleAddTaskAttachment(task.id, e.target.files[0]);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">{task.title}</h2>
                    <div className="flex items-center space-x-4 rtl:space-x-reverse text-sm text-slate-500 mt-1">
                        <div className="flex items-center space-x-1 rtl:space-x-reverse"><FolderIcon className="w-4 h-4" /><span>{project?.name}</span></div>
                        {assignedMember && <div className="flex items-center space-x-1 rtl:space-x-reverse"><UserIcon className="w-4 h-4" /><span>{assignedMember.name}</span></div>}
                        {task.dueDate && <div className="flex items-center space-x-1 rtl:space-x-reverse"><ClockIcon className="w-4 h-4" /><span>يستحق في {format(new Date(task.dueDate), 'd MMM yyyy', { locale: arSA })}</span></div>}
                    </div>
                </header>
                
                <main className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Attachments Section */}
                    <div>
                        <h3 className="font-semibold text-slate-700 mb-2">المرفقات</h3>
                        <div className="space-y-2">
                           {(task.attachments?.length || 0) > 0 ? (
                            task.attachments?.map(att => {
                                const uploader = teamMembers.find(m => m.id === att.uploaderId);
                                return (
                                <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" key={att.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-md hover:bg-slate-100">
                                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                        <PaperClipIcon className="w-5 h-5 text-slate-400" />
                                        <span className="text-sm font-medium text-sky-700">{att.fileName}</span>
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        رفع بواسطة {uploader?.name}
                                    </div>
                                </a>
                               )
                            })) : (
                                <p className="text-sm text-slate-400">لا توجد مرفقات.</p>
                           )}
                        </div>
                         <button onClick={() => fileInputRef.current?.click()} className="mt-2 text-sm font-semibold text-sky-600 hover:text-sky-800">إضافة مرفق</button>
                         <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    </div>

                    {/* Comments Section */}
                    <div>
                        <h3 className="font-semibold text-slate-700 mb-3">التعليقات</h3>
                        <div className="space-y-4">
                            {(task.comments?.length || 0) > 0 ? task.comments?.map(comment => {
                                const author = teamMembers.find(m => m.id === comment.authorId);
                                return (
                                <div key={comment.id} className="flex items-start space-x-3 rtl:space-x-reverse">
                                    <img src={author?.avatarUrl} alt={author?.name} className="w-8 h-8 rounded-full" />
                                    <div className="flex-1">
                                        <div className="bg-slate-100 rounded-lg px-3 py-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-sm text-slate-800">{author?.name}</span>
                                                <span className="text-xs text-slate-400">{formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true, locale: arSA })}</span>
                                            </div>
                                            <p className="text-sm text-slate-600 mt-1">{comment.text}</p>
                                        </div>
                                    </div>
                                </div>
                                )
                            }).reverse() : (
                                <p className="text-sm text-slate-400 text-center py-4">لا توجد تعليقات. كن أول من يضيف تعليقًا!</p>
                            )}

                             {/* Add Comment Form */}
                            <div className="flex items-start space-x-3 rtl:space-x-reverse pt-4 border-t">
                                <img src={currentUser?.avatarUrl} alt={currentUser?.name} className="w-8 h-8 rounded-full" />
                                <form onSubmit={handleCommentSubmit} className="flex-1">
                                    <textarea 
                                        value={newComment}
                                        onChange={e => setNewComment(e.target.value)}
                                        placeholder="أضف تعليقًا..."
                                        rows={2}
                                        className="w-full p-2 border border-slate-300 rounded-md text-sm focus:ring-sky-500 focus:border-sky-500"
                                    ></textarea>
                                    <div className="flex justify-end mt-2">
                                        <button type="submit" disabled={isCommenting || !newComment.trim()} className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
                                            {isCommenting ? 'جارٍ الإضافة...' : 'إضافة تعليق'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </main>

                <footer className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-200 rounded-md hover:bg-slate-300">إغلاق</button>
                </footer>
            </div>
        </div>
    );
};