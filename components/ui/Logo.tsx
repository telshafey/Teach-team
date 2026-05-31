import React from 'react';
import { useSettingsContext } from '@shared/contexts/SettingsContext';

export const Logo: React.FC = () => {
    const { siteSettings } = useSettingsContext();
    const appName = siteSettings?.appName || 'Bokra Team';
    const logoUrl = siteSettings?.logoUrl;

    const hasCustomLogo = logoUrl && (logoUrl.startsWith('http') || logoUrl.startsWith('/'));

    return (
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
            {hasCustomLogo ? (
                <img src={logoUrl} alt={`${appName} Logo`} className="h-10 w-auto" />
            ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--theme-color-500)] text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-full h-full p-1.5">
                        <defs>
                            <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                               <stop offset="0%" stopColor="#38bdf8"/>
                               <stop offset="100%" stopColor="#0ea5e9"/>
                            </linearGradient>
                        </defs>
                        <circle cx="50" cy="50" r="48" fill="url(#g)"/>
                        <path d="M30 55 L48 70 L75 40" stroke="white" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                        <circle cx="50" cy="50" r="5" fill="white"/>
                    </svg>
                </div>
            )}
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-200 hidden sm:inline">
                {appName}
            </span>
        </div>
    );
};