import { create } from "zustand";
import { TeamMember } from "../types";
import { getSupabaseClient } from "./supabaseStore";
import * as api from "../services/apiService";
import { router } from "../router/routes";

interface AuthState {
  currentUser: TeamMember | null;
  isLoading: boolean;
  setCurrentUser: (user: TeamMember | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  handleLogin: (email: string, password: string) => Promise<{ error: Error | null }>;
  handleLogout: () => Promise<void>;
  updateCurrentUser: (updates: Partial<TeamMember>) => Promise<void>;
  fetchTeamMember: (authUserId: string, authEmail?: string) => Promise<void>;
  initAuthListener: () => (() => void);
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  currentUser: null,
  isLoading: true,
  setCurrentUser: (user) => set({ currentUser: user }),
  setIsLoading: (isLoading) => set({ isLoading }),
  
  fetchTeamMember: async (authUserId: string, authEmail?: string) => {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) return;
    try {
      const { data: fetchedUsers, error } = await supabaseClient
        .from("team_members")
        .select("*")
        .eq("auth_user_id", authUserId);

      if (error) throw error;

      let users = fetchedUsers;

      if ((!users || users.length === 0) && authEmail) {
        const { data: usersByEmail, error: emailError } = await supabaseClient
          .from("team_members")
          .select("*")
          .eq("email", authEmail);

        if (!emailError && usersByEmail && usersByEmail.length > 0) {
          const { error: updateError } = await supabaseClient
            .from("team_members")
            .update({ auth_user_id: authUserId })
            .eq("id", usersByEmail[0].id);

          if (!updateError) {
            users = usersByEmail;
          } else {
            console.error("Failed to link account:", updateError);
            users = usersByEmail;
          }
        } else {
          console.warn("User has no team member record.");
        }
      }

      if (users && users.length > 0) {
        const user = api.keysToCamel(users[0]) as TeamMember;
        set({ currentUser: user });
      } else {
        console.warn("Auth user has no associated team_member record.");
        // We do not auto-create GM since we removed that logic.
        set({ currentUser: null });
      }
    } catch (error: any) {
      console.error("Error fetching team member:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  handleLogin: async (email, password) => {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) return { error: new Error("Database not connected") };

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  },

  handleLogout: async () => {
    const supabaseClient = getSupabaseClient();
    set({ currentUser: null });
    window.localStorage.removeItem("supabase.auth.bokra.v2");

    if (supabaseClient) {
      try {
        await supabaseClient.auth.signOut();
      } catch (error) {
        console.error("Logout error:", error);
      }
    }
    router.navigate("/");
  },

  updateCurrentUser: async (updates) => {
    const supabaseClient = getSupabaseClient();
    const { currentUser } = get();
    if (!currentUser || !supabaseClient) return;
    try {
      const updated = await api.update<TeamMember>(
        supabaseClient,
        "team_members",
        currentUser.id,
        updates,
      );
      set({ currentUser: updated });
    } catch (error: any) {
      console.error("Failed to update current user:", error);
      throw error;
    }
  },
  
  initAuthListener: () => {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) {
      set({ isLoading: false });
      return;
    }

    const failsafe = setTimeout(() => {
      set({ isLoading: false });
    }, 15000);

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.user) {
          await get().fetchTeamMember(session.user.id, session.user.email);
        } else {
          set({ isLoading: false });
        }
      } catch {
        set({ isLoading: false });
      }
    };

    checkSession();

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await get().fetchTeamMember(session.user.id, session.user.email);
      } else {
        set({ currentUser: null, isLoading: false });
      }
    });

    return () => {
      clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }
}));

