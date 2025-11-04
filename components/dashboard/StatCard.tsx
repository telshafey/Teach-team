import React from 'react';
import { Card } from '../ui/Card';

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = React.memo(({ icon, label, value, onClick }) => (
    <div onClick={onClick} className={onClick ? 'cursor-pointer' : ''}>
        <Card className="!p-4 h-full">
            <div className="flex items-center">
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg">{icon}</div>
                <div className="mr-4 rtl:mr-0 rtl:ml-4">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
                </div>
            </div>
        </Card>
    </div>
));
