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

const parsePathname = (pathname: string): { view: View; props: any } => {
  const parts = pathname.split('/').filter(Boolean);
  let view = (parts[0] as View) || 'dashboard';
  let props: any = {};

  if (view === 'projectDetail' && parts[1]) {
    props.projectId = parts[1];
  } else if (view === 'team' && parts[1] && !isNaN(parseInt(parts[1], 10))) {
    props.initialMemberId = parseInt(parts[1], 10);
  } else if (view === 'teamDetail' && parts[1]) {
      view = 'team';
      props.initialMemberId = parseInt(parts[1], 10);
  }

  if (view === 'roles' || view === 'database') {
      props.initialView = view;
      view = 'settings';
  }

  return { view, props };
};

export const AppContent: React.FC = () => {
  const { currentUser } = useAuth();
  
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    
    // Set initial route if it's just the root
    if(window.location.pathname === '/') {
        window.history.replaceState({}, '', '/dashboard');
        handlePopState();
    }
    
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const { view: currentView, props: viewProps } = useMemo(() => parsePathname(pathname), [pathname]);

  const handleNavigate = useCallback((view: View, props: any = {}) => {
      let newPath = `/${view}`;

      if (view === 'projectDetail' && props.projectId) {
          newPath = `/projectDetail/${props.projectId}`;
      } else if (view === 'teamDetail' && props.memberId) {
          newPath = `/team/${props.memberId}`;
      }
      
      if (window.location.pathname !== newPath) {
        window.history.pushState({}, '', newPath);
        setPathname(newPath); // Manually trigger state update for immediate re-render
      }
  }, []);

  const navigationContextValue = useMemo(() => ({ onNavigate: handleNavigate }), [handleNavigate]);

  if (!currentUser) {
    return <AuthPage />;
  }

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

  return <AppContent />;
};
