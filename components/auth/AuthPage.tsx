import React from 'react';
import { LoginPage } from '../shared/LoginPage';
import { Logo } from '../ui/Logo';

export const AuthPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center items-center p-4">
            <div className="mb-8">
                <Logo />
            </div>
            <div className="w-full max-w-sm">
                <LoginPage />
            </div>
        </div>
    );
};