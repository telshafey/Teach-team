import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import * as api from '../services/apiService';
import { useSupabase } from './SupabaseContext';
import { TeamMember, Role, Permission } from '../types';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  currentUser: TeamMember | null;
  isLoading: boolean;
  roles: Role[];
  rolesMap: Record<string, Role>;
  handleLogin: (email: string, password: string) => Promise<{ error: any | null }>;
  handleLogout: () => void;
  hasPermission: (permission: Permission) => boolean;
  updateCurrentUser: (userData: Partial<TeamMember>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { supabaseClient } = useSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesMap, setRolesMap] = useState<Record<string, Role>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchPublicData = useCallback(async () => {
    if (!supabaseClient) return;
    const apiRoles = await api.fetchRoles(supabaseClient);
    setRoles(apiRoles);
    const newRolesMap = apiRoles.reduce((acc, role) => {
      acc[role.id] = role;
      return acc;
    }, {} as Record<string, Role>);
    setRolesMap(newRolesMap);
  }, [supabaseClient]);
  
  useEffect(() => {
    if (!supabaseClient) {
        setIsLoading(false);
        return;
    }
    
    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session?.user) {
          await fetchPublicData();
            
          const { data, error } = await supabaseClient
            .from('team_members')
            .select('*')
            .eq('auth_user_id', session.user.id)
            .maybeSingle();
          
          if (error) {
            console.error('Error fetching user profile:', error);
            await supabaseClient.auth.signOut();
            setCurrentUser(null);
          } else if (data) {
            setCurrentUser(api.snakeToCamel(data) as TeamMember);
          } else {
            console.warn(`No profile found for authenticated user ${session.user.id}. Signing out.`);
            await supabaseClient.auth.signOut();
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
          setRoles([]);
          setRolesMap({});
        }
        setIsLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabaseClient, fetchPublicData]);

  const handleLogin = async (email: string, password: string) => {
    if (!supabaseClient) return { error: { message: "Database client not initialized." } };
    
    const { data: sessionData, error: signInError } = await supabaseClient.auth.signInWithPassword({ email, password });
    
    if (signInError) {
      return { error: signInError };
    }

    if (sessionData.user) {
        const { data: profileData, error: profileError } = await supabaseClient
            .from('team_members')
            .select('id')
            .eq('auth_user_id', sessionData.user.id)
            .maybeSingle();
        
        if (profileError) {
            await supabaseClient.auth.signOut();
            return { error: profileError };
        }

        if (!profileData) {
            await supabaseClient.auth.signOut();
            return { error: { message: "الحساب غير مهيأ. يرجى التواصل مع المسؤول." } };
        }
    }
    
    return { error: null };
  };

  const handleLogout = async () => {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    setCurrentUser(null);
    setSession(null);
  };

  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!currentUser) {
      return false;
    }
    if (currentUser.roleId === 'gm') {
      return true;
    }
    if (!rolesMap[currentUser.roleId]) {
      return false;
    }
    return rolesMap[currentUser.roleId].permissions.includes(permission);
  }, [currentUser, rolesMap]);

  const updateCurrentUser = async (userData: Partial<TeamMember>) => {
    if (!currentUser || !supabaseClient) return;
    await api.update(supabaseClient, 'team_members', currentUser.id, userData);
    
    const { data, error } = await supabaseClient
      .from('team_members')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    if (!error && data) {
      setCurrentUser(api.snakeToCamel(data) as TeamMember);
    }
  }

  const value = { session, currentUser, isLoading, roles, rolesMap, handleLogin, handleLogout, hasPermission, updateCurrentUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
