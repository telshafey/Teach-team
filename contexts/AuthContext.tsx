import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useSupabase } from './SupabaseContext';
import { Role, TeamMember, Permission } from '../types';
import * as api from '../services/apiService';

interface AuthContextType {
  currentUser: TeamMember | null;
  isLoading: boolean;
  roles: Role[];
  rolesMap: { [key: string]: Role };
  handleLogin: (email: string, password: string) => Promise<{ error: Error | null }>;
  handleLogout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  updateCurrentUser: (updates: Partial<Pick<TeamMember, 'name' | 'avatarUrl'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { supabaseClient } = useSupabase();
    const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const rolesMap = React.useMemo(() => {
        return roles.reduce((acc, role) => {
            acc[role.id] = role;
            return acc;
        }, {} as { [key: string]: Role });
    }, [roles]);

    const fetchUserProfile = useCallback(async (user: User) => {
        if (!supabaseClient) return null;
        const { data, error } = await supabaseClient
            .from('team_members')
            .select('*')
            .eq('auth_user_id', user.id)
            .single();
        if (error) {
            console.error('Error fetching user profile:', error);
            await supabaseClient.auth.signOut();
            return null;
        }
        return api.snakeToCamel(data) as TeamMember;
    }, [supabaseClient]);

    useEffect(() => {
        if (!supabaseClient) {
            setIsLoading(false);
            return;
        }

        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                // Fetch roles first
                const rolesData = await api.fetchAll<Role>(supabaseClient, 'roles');
                setRoles(rolesData);

                // Then get session and user profile
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session?.user) {
                    const profile = await fetchUserProfile(session.user);
                    setCurrentUser(profile);
                }
            } catch (error) {
                console.error("Auth context initialization error:", error);
                setCurrentUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialData();

        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
            setIsLoading(true);
            if (session?.user) {
                const profile = await fetchUserProfile(session.user);
                setCurrentUser(profile);
            } else {
                setCurrentUser(null);
            }
            // re-fetch roles on auth change in case they were updated
            if (roles.length === 0) {
                 const apiRoles = await api.fetchAll<Role>(supabaseClient, 'roles');
                 setRoles(apiRoles);
            }
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [supabaseClient, fetchUserProfile, roles.length]);

    const handleLogin = async (email: string, password: string) => {
        if (!supabaseClient) return { error: new Error('Supabase client not available.') };
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (!error) {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                 const profile = await fetchUserProfile(user);
                 if (!profile) {
                     await handleLogout();
                     return { error: new Error('No active user profile found for this account.') };
                 }
            }
        }
        return { error };
    };

    const handleLogout = async () => {
        if (!supabaseClient) return;
        await supabaseClient.auth.signOut();
        setCurrentUser(null);
    };

    const hasPermission = useCallback((permission: Permission): boolean => {
        if (!currentUser) return false;
        // GM has all permissions unconditionally.
        if (currentUser.roleId === 'gm') return true;
        
        const userRole = rolesMap[currentUser.roleId];
        if (!userRole) return false;
        
        return userRole.permissions?.includes(permission) ?? false;
    }, [currentUser, rolesMap]);
    
    const updateCurrentUser = async (updates: Partial<Pick<TeamMember, 'name' | 'avatarUrl'>>) => {
        if (!currentUser || !supabaseClient) return;
        
        const { data, error } = await supabaseClient
            .from('team_members')
            .update(api.camelToSnake(updates))
            .eq('id', currentUser.id)
            .select()
            .single();
            
        if (error) throw error;

        const updatedProfile = api.snakeToCamel(data) as TeamMember;
        setCurrentUser(updatedProfile);
    };

    const value = {
        currentUser,
        isLoading,
        roles,
        rolesMap,
        handleLogin,
        handleLogout,
        hasPermission,
        updateCurrentUser
    };

    return (
        <AuthContext.Provider value={value}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
