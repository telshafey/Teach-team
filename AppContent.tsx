import React from 'react';
import { useAuth } from './contexts/AuthContext';
import { useSupabase } from './contexts/SupabaseContext';
import { Dashboard } from './components/dashboard/Dashboard';
import { Logo } from './components/ui/Logo';


// Renders the main dashboard or auth page based on auth state
export const AppContent: React.FC = () => {
  const { isLoading: isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
        <div className="flex h-screen w-screen items-center justify-center bg-white dark:bg-slate-900">
             <div className="animate-pulse"><Logo /></div>
        </div>
    );
  }

  // Dashboard component internally handles rendering AuthPage if user is not logged in
  return <Dashboard />;
};

// Handles Supabase client initialization and failure states
export const AppBootstrap: React.FC = () => {
  const { supabaseClient, isLoading } = useSupabase();

  if (isLoading) {
    return (
       <div className="flex h-screen w-screen items-center justify-center bg-white dark:bg-slate-900">
           <div className="animate-pulse"><Logo /></div>
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

  // All good, render the main app content
  return <AppContent />;
};