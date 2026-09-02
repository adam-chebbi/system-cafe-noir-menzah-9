import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index';
import { api } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  loginWithPin: (pin: string) => Promise<boolean>;
  logout: () => void;
  users: User[];
  refreshUsers: () => Promise<void>;
  isPinModalOpen: boolean;
  setIsPinModalOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('cafe_noir_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) { return null; }
    }
    // Default to Victor Noir (Fondateur & Manager) for immediate seamless tablet use
    return {
      id: 'usr_victor',
      name: 'Victor Noir',
      email: 'victor@cafenoirstudio.fr',
      role: 'admin',
      pin: '1234',
      phone: '+33 6 12 34 56 78',
      hourlyRate: 28.0,
      active: true,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      createdAt: '2025-01-01T08:00:00.000Z'
    };
  });

  const [users, setUsers] = useState<User[]>([]);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);

  const refreshUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const loginWithPin = async (pin: string): Promise<boolean> => {
    try {
      const res = await api.loginPin(pin);
      if (res && res.success && res.user) {
        setCurrentUser(res.user);
        localStorage.setItem('cafe_noir_user', JSON.stringify(res.user));
        return true;
      }
      return false;
    } catch (err: any) {
      // Normal failed attempt - don't crash console
      console.warn('PIN login attempt not recognized:', err?.message || err);
      return false;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('cafe_noir_user');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        loginWithPin,
        logout,
        users,
        refreshUsers,
        isPinModalOpen,
        setIsPinModalOpen
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
