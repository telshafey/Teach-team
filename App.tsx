import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/ui/ToastContainer';
import { Dashboard } from './components/dashboard/Dashboard';
import { SupabaseProvider, useSupabase } from './contexts/SupabaseContext';
import { AppProvider } from './contexts/AppProvider';

const AppContent: React.FC = () => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    const StaticLogo = () => (
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-sky-500 text-white">
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
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-200 hidden sm:inline">
                Bokra Team
            </span>
        </div>
    );
    return (
        <div className="flex h-screen w-screen items-center justify-center bg-white dark:bg-slate-900">
             <div className="animate-pulse"><StaticLogo /></div>
        </div>
    );
  }

  return currentUser ? <Dashboard /> : <AuthPage />;
};


const AppBootstrap: React.FC = () => {
  const { supabaseClient, isLoading } = useSupabase();

  if (isLoading) {
    const StaticLogo = () => (
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-sky-500 text-white">
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
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-200 hidden sm:inline">
                Bokra Team
            </span>
        </div>
    );

    return (
       <div className="flex h-screen w-screen items-center justify-center bg-white dark:bg-slate-900">
           <div className="animate-pulse"><StaticLogo /></div>
           <p className="text-slate-500 dark:text-slate-400 mr-4">جارٍ تهيئة التطبيق...</p>
       </div>
    );
  }

  if (!supabaseClient) {
    return (
         <div className="flex h-screen w-screen items-center justify-center bg-white dark:bg-slate-900 text-center p-4">
            <div>
                <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">فشل الاتصال بقاعدة البيانات</h2>
                <p className="text-slate-600 dark:text-slate-300">لم نتمكن من الاتصال بقاعدة البيانات. يرجى مراجعة الإعدادات أو التواصل مع المسؤول.</p>
            </div>
        </div>
    );
  }

  // All good, render the app's providers and content
  return (
    <>
      <AuthProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </AuthProvider>
      <ToastContainer />
    </>
  );
};


const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <SupabaseProvider>
          <AppBootstrap />
        </SupabaseProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;