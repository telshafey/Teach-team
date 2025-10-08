import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { Notification } from '../../types';
import { BellIcon } from '../ui/Icons';
import { formatDistanceToNow } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { View } from '../dashboard/Dashboard';

interface NotificationBellProps {
  onNavigate: (view: View, props?: any) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigate }) => {
  const { notifications, markNotificationAsRead } = useAppDataContext();
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const userNotifications = useMemo(() => {
      if (!currentUser) return [];
      return notifications.filter(n => n.recipientId === currentUser.id)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notifications, currentUser]);

  const unreadCount = useMemo(() => {
    return userNotifications.filter(n => !n.read).length;
  }, [userNotifications]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
        markNotificationAsRead(notification.id);
    }
    
    // Navigation logic
    if (notification.type === 'meeting_scheduled') {
        onNavigate('meetings');
    }
    else if (notification.projectId && notification.taskId) {
      onNavigate('projectDetail', {
        projectId: notification.projectId,
        initialTaskIdToOpen: notification.taskId,
      });
    } else if (notification.projectId) {
      onNavigate('projectDetail', { projectId: notification.projectId });
    }
    
    setIsOpen(false);
  };

  const renderNotificationText = (notification: Notification) => {
    switch (notification.type) {
        case 'task_assigned':
            return `تم إسناد مهمة جديدة لك: "${notification.taskTitle}" بواسطة ${notification.assignerName}.`;
        case 'task_approval':
            return `مهمة "${notification.taskTitle}" التي أسندتها إلى ${notification.assigneeName} بانتظار موافقتك.`;
        case 'budget_alert':
            return notification.message;
        case 'freelancer_assigned':
             return `${notification.taskTitle} بواسطة ${notification.assignerName}.`;
        case 'comment_mention':
            return `${notification.commentAuthorName} ذكرك في تعليق على مهمة: "${notification.taskTitle}"`;
        case 'meeting_scheduled':
            return `تمت دعوتك لاجتماع: "${notification.taskTitle}" بواسطة ${notification.assignerName}.`;
        case 'profile_update':
            return notification.message;
        default:
            return 'إشعار جديد.';
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
        <BellIcon className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-white text-xs items-center justify-center">
                {unreadCount}
            </span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50">
          <div className="p-3 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">الإشعارات</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {userNotifications.length > 0 ? (
                userNotifications.map(notification => (
                    <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700 ${!notification.read ? 'bg-sky-50 dark:bg-sky-900/30' : ''}`}
                    >
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                           {renderNotificationText(notification)}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true, locale: arSA })}
                        </p>
                    </div>
                ))
            ) : (
                <p className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">لا توجد إشعارات جديدة.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
