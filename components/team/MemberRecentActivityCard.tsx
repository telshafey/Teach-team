import React from 'react';
import { DailyLog } from '@shared/types';
import { Card } from '../ui/Card';

interface MemberRecentActivityCardProps {
    logs: DailyLog[];
}

export const MemberRecentActivityCard: React.FC<MemberRecentActivityCardProps> = ({ logs }) => {
    return (
        <Card title="آخر الأنشطة">
            <div className="space-y-2">
                {logs.map(log => (
                    <div key={log.id} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-md text-sm">
                        <span className="font-semibold">{log.hours} ساعة:</span> {log.description}
                    </div>
                ))}
                {logs.length === 0 && <p className="text-sm text-center text-slate-500 py-4">لا توجد أنشطة مسجلة.</p>}
            </div>
        </Card>
    );
};