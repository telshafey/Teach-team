import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useRef } from 'react';
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
    
    // State for the raw Supabase user and our app-specific user profile
    const [user, setUser] = useState<User | null>(null);
    const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
    const [roles, setRoles] = useState<Role[]>([]);
    
    // Combined loading state
    const [isLoading, setIsLoading] = useState(true);
    const [authCheckCompleted, setAuthCheckCompleted] = useState(false);
    const hasLoadedUser = useRef(false);

    const rolesMap = React.useMemo(() => {
        return roles.reduce((acc, role) => {
            acc[role.id] = role;
            return acc;
        }, {} as { [key: string]: Role });
    }, [roles]);

    // Effect to listen for Supabase auth state changes ONLY
    useEffect(() => {
        if (!supabaseClient) {
            setIsLoading(false);
            setAuthCheckCompleted(true);
            return;
        }

        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
            setUser(session?.user ?? null);
            // Once the first auth event fires, we know the initial check is done.
            if (!authCheckCompleted) {
                setAuthCheckCompleted(true);
            }
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, [supabaseClient, authCheckCompleted]);
    
    // Effect to fetch user data WHEN the raw Supabase user changes
    useEffect(() => {
        const fetchUserData = async (authUser: User) => {
             if (!supabaseClient) return;

             if (!hasLoadedUser.current) {
                setIsLoading(true);
             }

             try {
                // Fetch roles and profile in parallel
                const [rolesData, profileData] = await Promise.all([
                    api.fetchAll<Role>(supabaseClient, 'roles'),
                    api.snakeToCamel(
                        (await supabaseClient.from('team_members').select('*').eq('auth_user_id', authUser.id).single()).data
                    ) as TeamMember
                ]);

                if (!profileData) {
                    throw new Error('فشل في تحميل ملف المستخدم. قد لا يكون ملفك الشخصي مرتبطًا بحسابك.');
                }

                setRoles(rolesData);
                setCurrentUser(profileData);
                hasLoadedUser.current = true;

             } catch (error: any) {
                console.error("Auth context: Critical failure fetching user data", error);
                addToast(`فشل تحميل بيانات المستخدم: ${error.message}`, 'error');
                // IMPORTANT: Do NOT sign out here. Let the user see the error and sign out manually.
                setCurrentUser(null);
                setRoles([]);
                hasLoadedUser.current = false;
             } finally {
                setIsLoading(false);
             }
        };

        if (authCheckCompleted) {
            if (user) {
                fetchUserData(user);
            } else {
                // User is logged out, clear all data and stop loading
                setCurrentUser(null);
                setRoles([]);
                setIsLoading(false);
                hasLoadedUser.current = false;
            }
        }
    }, [user, authCheckCompleted, supabaseClient, addToast]);


    const handleLogin = async (email: string, password: string) => {
        if (!supabaseClient) return { error: new Error('Supabase client not available.') };
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        return { error };
    };

    const handleLogout = async () => {
        if (!supabaseClient) return;
        await supabaseClient.auth.signOut();
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