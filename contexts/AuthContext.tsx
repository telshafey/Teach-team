import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { useSupabase } from './SupabaseContext';
import { Role, TeamMember, Permission } from '../types';
import * as api from '../services/apiService';
import { useToast } from './ToastContext';

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
    const { addToast } = useToast();
    
    const [user, setUser] = useState<User | null>(null);
    const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const rolesMap = React.useMemo(() => {
        return roles.reduce((acc, role) => {
            acc[role.id] = role;
            return acc;
        }, {} as { [key: string]: Role });
    }, [roles]);
    
    useEffect(() => {
        if (!supabaseClient) {
            setIsLoading(false);
            return;
        }

        const getInitialSession = async () => {
            const { data: { session } } = await supabaseClient.auth.getSession();
            setUser(session?.user ?? null);
            if (!session) {
                setIsLoading(false);
            }
        };

        getInitialSession();

        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, [supabaseClient]);
    
    useEffect(() => {
        // This effect runs when the Supabase auth user object changes.
        if (user) {
            const fetchAndSetUserData = async () => {
                if (!supabaseClient) return;
                
                let profileData: TeamMember | null = null;
                let rolesData: Role[] = [];
                let fetchError: Error | null = null;

                try {
                    const [rolesRes, profileRes] = await Promise.all([
                        supabaseClient.from('roles').select('*'),
                        // Use limit(1) instead of single() for robustness against duplicate profiles
                        supabaseClient.from('team_members').select('*').eq('auth_user_id', user.id).limit(1)
                    ]);

                    if (rolesRes.error) throw rolesRes.error;
                    if (profileRes.error) throw profileRes.error;

                    if (profileRes.data && profileRes.data.length > 0) {
                        profileData = api.snakeToCamel(profileRes.data[0]) as TeamMember;
                        rolesData = api.snakeToCamel(rolesRes.data || []) as Role[];
                    } else {
                        // This is the critical case: user is authenticated but has no profile.
                        fetchError = new Error('فشل في تحميل ملف المستخدم. قد لا يكون ملفك الشخصي مرتبطًا بحسابك.');
                    }
                } catch (error: any) {
                    fetchError = error;
                }

                // Now, based on the outcome, update the state.
                if (fetchError) {
                    console.error("Auth context: Critical failure fetching user data", fetchError);
                    addToast(`${fetchError.message}. سيتم تسجيل خروجك الآن.`, 'error');
                    // We must sign out. The onAuthStateChange listener will handle the rest of the cleanup.
                    await supabaseClient.auth.signOut();
                } else {
                    // Success case
                    setCurrentUser(profileData);
                    setRoles(rolesData);
                    setIsLoading(false);
                }
            };
            
            setIsLoading(true);
            fetchAndSetUserData();
        } else {
            // This block runs when user is null (logged out or initial state).
            setCurrentUser(null);
            setRoles([]);
            setIsLoading(false);
        }
    }, [user, supabaseClient, addToast]);


    const handleLogin = async (email: string, password: string) => {
        if (!supabaseClient) return { error: new Error('Supabase client not available.') };
        setIsLoading(true);
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            setIsLoading(false);
        }
        return { error };
    };

    const handleLogout = async () => {
        if (!supabaseClient) return;
        setIsLoading(true);
        await supabaseClient.auth.signOut();
        // The onAuthStateChange listener will handle setting user to null,
        // which will trigger the useEffect to clean up and set isLoading to false.
    };

    const hasPermission = useCallback((permission: Permission): boolean => {
        if (!currentUser) return false;
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
            .select();
            
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Profile not found after update.");

        const updatedProfile = api.snakeToCamel(data[0]) as TeamMember;
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
            {children}
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