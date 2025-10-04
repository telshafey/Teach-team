import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback, useEffect } from 'react';
// FIX: Corrected import paths.
import { TeamMember, Role, Permission } from '../types';
import { fetchTeamMembers, fetchRoles } from '../services/apiService';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface AuthContextType {
  currentUser: TeamMember | null;
  teamMembers: TeamMember[];
  rolesMap: Record<string, Role>;
  handleLogin: (user: TeamMember) => void;
  handleLogout: () => void;
  updateCurrentUser: (user: TeamMember) => void;
  hasPermission: (permission: Permission) => boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAuthData = async () => {
        try {
            const [fetchedMembers, fetchedRoles] = await Promise.all([
                fetchTeamMembers(),
                fetchRoles()
            ]);
            setTeamMembers(fetchedMembers);
            setRoles(fetchedRoles);
        // FIX: Added curly braces to the catch block to fix syntax error.
        } catch (error) {
            console.error("Failed to load authentication data", error);
        } finally {
            setIsLoading(false);
        }
    };
    loadAuthData();
  }, []);

  const rolesMap = useMemo(() => roles.reduce((acc, role) => ({ ...acc, [role.id]: role }), {}), [roles]);

  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!currentUser) return false;
    const userRole = rolesMap[currentUser.roleId];
    return userRole?.permissions.includes(permission) ?? false;
  }, [currentUser, rolesMap]);

  const handleLogin = (user: TeamMember) => setCurrentUser(user);
  const handleLogout = () => setCurrentUser(null);

  const updateCurrentUser = (user: TeamMember) => {
    setCurrentUser(user);
    // Also update the list of team members to keep it in sync
    setTeamMembers(prev => prev.map(m => m.id === user.id ? user : m));
  };

  const value = { currentUser, teamMembers, rolesMap, handleLogin, handleLogout, updateCurrentUser, hasPermission, isLoading };

  if (isLoading) {
      return <div className="flex h-screen w-full items-center justify-center"><LoadingSpinner className="h-10 w-10 text-sky-500" /></div>;
  }
  
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