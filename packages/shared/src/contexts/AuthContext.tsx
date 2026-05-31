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
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();
  const { supabaseClient } = useSupabase();

  useEffect(() => {
    const savedUserId = localStorage.getItem('mockUserId');
    if (savedUserId && supabaseClient) {
        api.getById<TeamMember>(supabaseClient, 'team_members', parseInt(savedUserId)).then(user => {
            setCurrentUser(user);
        }).catch(err => {
            console.error("Error fetching saved user", err);
        }).finally(() => setIsLoading(false));
    } else {
        setIsLoading(false);
    }
  }, [supabaseClient]);

  const handleLogin = async (email: string, password: string) => {
    if (!supabaseClient) return { error: new Error('Database not connected') };
    
    try {
        // Prototype login matching just email as we don't have passwords stored in plain text
        // and we aren't using deep Supabase Auth integrations yet.
        const { data: users, error } = await supabaseClient.from('team_members').select('*').eq('email', email);
        if (error) throw error;
        
        if (users && users.length > 0) {
            const user = api.keysToCamel(users[0]) as TeamMember;
            setCurrentUser(user);
            localStorage.setItem('mockUserId', String(user.id));
            return { error: null };
        }
        
        return { error: new Error('المستخدم غير موجود') };
    } catch(err: any) {
        return { error: err };
    }
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    localStorage.removeItem('mockUserId');
  };

  const updateCurrentUser = async (updates: Partial<TeamMember>) => {
      if (!currentUser || !supabaseClient) return;
      try {
        const updated = await api.update<TeamMember>(supabaseClient, 'team_members', currentUser.id, updates);
        setCurrentUser(updated);
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

