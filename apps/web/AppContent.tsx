import React, { useState, useMemo, useCallback, lazy, Suspense, useEffect } from 'react';
import { useAuth } from '@shared/contexts/AuthContext';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import { Dashboard } from './components/dashboard/Dashboard';
import { Logo } from './components/ui/Logo';
import { AuthPage } from './components/auth/AuthPage';
import { View } from './navigation.types';
import { NavigationContext } from './contexts/NavigationContext';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

const MeetingRoom = lazy(() => import('./components/meetings/MeetingRoom').then(module => ({ default: module.MeetingRoom })));


const parseHash = (hash: string): { view: View; props: any } => {
  const path = hash.substring(1) || '/';
  const parts = path.split('/').filter(Boolean);
  let view = (parts[0] as View) || 'dashboard';
  let props: any = {};

  if (view === 'projectDetail' && parts[1]) {
    props.projectId = parts[1];
  } else if (view === 'team' && parts[1] && !isNaN(parseInt(parts[1], 10))) {
    // This is for team member detail view, e.g., #/team/123
    props.initialMemberId = parseInt(parts[1], 10);
  } else if (view === 'teamDetail' && parts[1]) {
      // Legacy support for navigating to teamDetail
      view = 'team';
      props.initialMemberId = parseInt(parts[1], 10);
  }

  // Handle views that are part of settings
  if (view === 'roles' || view === 'database') {
      props.initialView = view;
      view = 'settings';
  }

  return { view, props };
};


// Renders the main dashboard or auth page based on auth state
export const AppContent: React.FC = () => {
  const { currentUser } = useAuth();
  
  // State is now derived from the URL hash
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    // Set initial route
    handleHashChange();
    
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const { view: currentView, props: viewProps } = useMemo(() => parseHash(hash), [hash]);

  const handleNavigate = useCallback((view: View, props: any = {}) => {
      let newHash = `#/${view}`;

      if (view === 'projectDetail' && props.projectId) {
          newHash = `#/projectDetail/${props.projectId}`;
      } else if (view === 'teamDetail' && props.memberId) {
          // Navigate to /team/:id to show member detail within the team management page
          newHash = `#/team/${props.memberId}`;
      }
      
      // Update the URL hash. The hashchange listener will trigger the state update.
      if (window.location.hash !== newHash) {
        window.location.hash = newHash;
      } else {
        // If hash is the same, listener won't fire, manually trigger a re-parse.
        // This handles cases where we navigate to the same view but with different modal states (which are props but not in URL)
        setHash(newHash);
      }
  }, []);

  const navigationContextValue = useMemo(() => ({ onNavigate: handleNavigate }), [handleNavigate]);

  if (!currentUser) {
    return <AuthPage />;
  }

  // All good, render the main app content
  return (
      <NavigationContext.Provider value={navigationContextValue}>
          {currentView === 'meetingRoom' ? (
              <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center bg-slate-900"><LoadingSpinner className="w-8 h-8 text-sky-500" /></div>}>
                  <MeetingRoom {...viewProps} />
              </Suspense>
          ) : (
              <Dashboard currentView={currentView} viewProps={viewProps} />
          )}
      </NavigationContext.Provider>
  );
};

// Handles Supabase client initialization and failure states
export const AppBootstrap: React.FC = () => {
  const { supabaseClient, isLoading: isSupabaseLoading } = useSupabase();
  const { isLoading: isAuthLoading } = useAuth();


  if (isSupabaseLoading || isAuthLoading) {
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