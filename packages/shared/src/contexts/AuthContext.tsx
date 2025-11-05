import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useSupabase } from './SupabaseContext';
import { TeamMember } from '../types';
import * as api from '../services/apiService';
import { useToast } from './ToastContext';

export interface AuthContextType {
  currentUser: TeamMember | null;
  isLoading: boolean;
  handleLogin: (email: string, password: string) => Promise<{ error: Error | null }>;
  handleLogout: () => Promise<void>;
  updateCurrentUser: (updates: Partial<TeamMember>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { supabaseClient } = useSupabase();
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();

  const fetchUserProfile = useCallback(async (user: User | null): Promise<TeamMember | null> => {
    if (!user || !supabaseClient) return null;
    const { data, error } = await supabaseClient.from('team_members').select('*').eq('auth_user_id', user.id).single();
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    return api.keysToCamel(data);
  }, [supabaseClient]);

  useEffect(() => {
    if (!supabaseClient) {
      setIsLoading(false);
      return;
    }

    const refreshCache = async () => {
        await api.refreshSchemaCache(supabaseClient, ['team_members', 'meetings', 'projects', 'tasks', 'support_tickets', 'ticket_comments']);
    };

    const getSession = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            const userProfile = await fetchUserProfile(session.user);
            if (userProfile) {
                setCurrentUser(userProfile);
                refreshCache(); // Don't await
            } else {
                // Has a session but no profile is a critical error state. Sign out to prevent loops.
                await supabaseClient.auth.signOut();
                setCurrentUser(null);
            }
        } else {
            setCurrentUser(null);
        }
      } catch (error) {
        console.error("Error during initial session fetch:", error);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    getSession();

    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        const user = session?.user ?? null;
        if (user) {
            const userProfile = await fetchUserProfile(user);
            if (userProfile) {
                setCurrentUser(userProfile);
                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                  refreshCache();
                }
            } else {
                // Critical error: authenticated user without a profile. Force sign out.
                await supabaseClient.auth.signOut();
                setCurrentUser(null);
                addToast('فشل تحميل الملف الشخصي. تم تسجيل خروجك تلقائيًا.', 'error');
            }
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabaseClient, fetchUserProfile, addToast]);

  const handleLogin = async (email: string, password: string) => {
    if (!supabaseClient) {
      return { error: new Error('Supabase client not initialized') };
    }
    
    // Step 1: Sign in
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({ email, password });
    
    if (authError) {
      return { error: new Error(authError.message) };
    }
    
    if (!authData.user) {
        return { error: new Error('Authentication successful but no user returned.') };
    }

    // Step 2: Fetch profile immediately after successful auth
    try {
      const userProfile = await fetchUserProfile(authData.user);

      if (userProfile) {
        // Step 3: Success. The onAuthStateChange listener will set the user. Return no error.
        return { error: null };
      } else {
        // Step 3: Failure. Profile not found. Clean up session and return specific error.
        await supabaseClient.auth.signOut();
        return { error: new Error('فشل تحميل الملف الشخصي بعد تسجيل الدخول. يرجى مراجعة المسؤول.') };
      }
    } catch (profileError: any) {
        // Catch any unexpected error during profile fetch
        await supabaseClient.auth.signOut();
        return { error: new Error(profileError.message || 'An unknown error occurred while fetching user profile.') };
    }
  };

  const handleLogout = async () => {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    setCurrentUser(null);
  };

  const updateCurrentUser = async (updates: Partial<TeamMember>) => {
      if (!currentUser || !supabaseClient) return;
      try {
        const updatedUser = await api.update<TeamMember>(supabaseClient, 'team_members', currentUser.id, updates);
        setCurrentUser(updatedUser);
      } catch (error: any) {
        addToast(`فشل تحديث الملف الشخصي: ${error.message}`, 'error');
        console.error("Failed to update current user:", error);
      }
  };


  const value = {
    currentUser,
    isLoading,
    handleLogin,
    handleLogout,
    updateCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
