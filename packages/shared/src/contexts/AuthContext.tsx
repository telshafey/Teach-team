import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { useSupabase } from "./SupabaseContext";
import { TeamMember } from "../types";
import * as api from "../services/apiService";
import { useToast } from "./ToastContext";

export interface AuthContextType {
  currentUser: TeamMember | null;
  isLoading: boolean;
  handleLogin: (
    email: string,
    password: string,
  ) => Promise<{ error: Error | null }>;
  handleLogout: () => Promise<void>;
  updateCurrentUser: (updates: Partial<TeamMember>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();
  const { supabaseClient } = useSupabase();

  useEffect(() => {
    if (!supabaseClient) {
      setIsLoading(false);
      return;
    }

    // Failsafe strictly limits loading to 2 seconds
    const failsafe = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabaseClient.auth.getSession();
        if (session?.user) {
          await fetchTeamMember(session.user.id, session.user.email);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Session check error:", error);
        setIsLoading(false);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchTeamMember(session.user.id, session.user.email);
      } else {
        setCurrentUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }, [supabaseClient]);

  const fetchTeamMember = async (authUserId: string, authEmail?: string) => {
    if (!supabaseClient) return;
    try {
      let { data: users, error } = await supabaseClient
        .from("team_members")
        .select("*")
        .eq("auth_user_id", authUserId);

      if (error) throw error;

      // Migration step: if not found by auth_user_id, try to find by email and update
      if ((!users || users.length === 0) && authEmail) {
        const { data: usersByEmail, error: emailError } = await supabaseClient
          .from("team_members")
          .select("*")
          .eq("email", authEmail);

        if (!emailError && usersByEmail && usersByEmail.length > 0) {
          // Update the record with the new auth_user_id
          const { error: updateError } = await supabaseClient
            .from("team_members")
            .update({ auth_user_id: authUserId })
            .eq("id", usersByEmail[0].id);

          if (!updateError) {
            users = usersByEmail; // Use this user since we just linked it
          } else {
             console.error("Failed to link account due to RLS or DB error:", updateError);
             throw new Error("لا تملك صلاحية لربط هذا الحساب. يرجى مراجعة مدير النظام لتحديث الصلاحيات.");
          }
        } else {
          // Auto-create a team member record for new auth users
          const { data: newUser, error: insertError } = await supabaseClient
            .from("team_members")
            .insert([{
                email: authEmail,
                auth_user_id: authUserId,
                name: authEmail.split('@')[0],
                employment_type: 'full-time',
                avatar_url: `https://api.dicebear.com/8.x/initials/svg?seed=${authEmail.split('@')[0]}`
            }])
            .select();
            
          if (!insertError && newUser && newUser.length > 0) {
              users = newUser;
          } else {
              console.error("Failed to auto-create team member:", insertError);
          }
        }
      }

      if (users && users.length > 0) {
        const user = api.keysToCamel(users[0]) as TeamMember;
        setCurrentUser(user);
      } else {
        // Handle case where auth user exists but team_member record doesn't
        console.warn("Auth user has no associated team_member record");
        setCurrentUser(null);
      }
    } catch (error: any) {
      console.error("Error fetching team member:", error);
      addToast(error.message || "حدث خطأ أثناء تحميل بيانات المستخدم", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    if (!supabaseClient) return { error: new Error('Database not connected') };

    try {
      const loginPromise = supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
        setTimeout(() => reject(new Error('Login Request Timeout')), 10000)
      );

      const { data, error } = await Promise.race([loginPromise, timeoutPromise]);

      if (error) throw error;
      
      // Wait shortly for auth state change to process the user.
      await new Promise(resolve => setTimeout(resolve, 500));
      return { error: null };
    } catch (err: any) {
      console.error("Login exception:", err);
      return { error: err };
    }
  };

  const handleLogout = async () => {
    if (!supabaseClient) return;
    try {
      await supabaseClient.auth.signOut();
      setCurrentUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const updateCurrentUser = async (updates: Partial<TeamMember>) => {
    if (!currentUser || !supabaseClient) return;
    try {
      const updated = await api.update<TeamMember>(
        supabaseClient,
        "team_members",
        currentUser.id,
        updates,
      );
      setCurrentUser(updated);
    } catch (error: any) {
      addToast(`فشل تحديث الملف الشخصي: ${error.message}`, "error");
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
