import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { TeamMember, Role, Permission } from '../types';
import { fetchTeamMembers, fetchRoles } from '../services/apiService';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface AuthContextType {
  currentUser: TeamMember | null;
  teamMembers: TeamMember[];
  rolesMap: Record<string, Role>;
  handleLogin: (user: TeamMember) => void;
  handleLogout: () => void;
  hasPermission: (permission: Permission) => boolean;
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300">
        <LoadingSpinner className="w-10 h-10" />
        <p className="mt-4">جارٍ تحميل التطبيق...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ currentUser, teamMembers, rolesMap, handleLogin, handleLogout, hasPermission }}>
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