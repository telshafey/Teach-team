import { TeamMember } from "../types";
import { useAuthStore } from "../stores/authStore";

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

export const useAuth = (): AuthContextType => {
  const store = useAuthStore();
  return store;
};

