import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { Notification } from '../../types';
import { BellIcon, ClipboardDocumentCheckIcon, ChatBubbleLeftEllipsisIcon } from '../ui/Icons';
import { formatDistanceToNow } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface NotificationBellProps {
  onSelect: (notification: Notification) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onSelect }) => {
    const { notifications, markNotificationAsRead } = useAppDataContext();
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [wrapperRef]);
    
    const handleSelect = (notification: Notification) => {
        onSelect(notification);
        if (!notification.read) {
            markNotificationAsRead(notification.id);
        }
        setIsOpen(false);
    };

    const renderNotificationContent = (notification: Notification) => {
        let icon: React.ReactNode;
        let text: React.ReactNode;

        switch (notification.type) {
            case 'task_assigned':
                icon = <ClipboardDocumentCheckIcon className="w-6 h-6 text-sky-500" />;
                text = <p>أسند لك <strong>{notification.assignerName}</strong> مهمة: <strong>{notification.taskTitle}</strong></p>;
                break;
            case 'task_approval':
                 icon = <ClipboardDocumentCheckIcon className="w-6 h-6 text-amber-500" />;
                 text = <p>أكمل <strong>{notification.assigneeName}</strong> مهمة وتحتاج لمراجعتك: <strong>{notification.taskTitle}</strong></p>;
                 break;
            case 'new_comment':
                icon = <ChatBubbleLeftEllipsisIcon className="w-6 h-6 text-green-500" />;
                text = <p>أضاف <strong>{notification.commenterName}</strong> تعليقًا على مهمة: <strong>{notification.taskTitle}</strong></p>;
                break;
            default:
                return null;
        }

        return (
            <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <div className="flex-shrink-0">{icon}</div>
                <div className="flex-1 text-sm">
                    {text}
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true, locale: arSA })}
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div ref={wrapperRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none"
                aria-label="View notifications"
            >
                <BellIcon className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 block h-4 w-4 rounded-full bg-red-500 text-white text-[10px] ring-2 ring-white dark:ring-slate-800 flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}
            </button>
            {isOpen && (
                <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50">
                    <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">الإشعارات</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                             notifications.map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => handleSelect(n)}
                                    className={`p-3 border-b border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 ${!n.read ? 'bg-sky-50 dark:bg-sky-900/30' : ''}`}
                                >
                                    {renderNotificationContent(n)}
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-sm text-slate-500 dark:text-slate-400 p-6">
                                لا توجد إشعارات جديدة.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
