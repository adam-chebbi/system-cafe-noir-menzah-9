import React, { createContext, useContext } from 'react';
import { User } from '../types/index';
import { api } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentUser: User = {
      id: 'usr_victor',
      name: 'Victor Noir',
      email: 'victor@cafenoirstudio.fr',
      role: 'admin',
      pin: '',
      phone: '+33 6 12 34 56 78',
      hourlyRate: 28.0,
      active: true,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      createdAt: '2025-01-01T08:00:00.000Z'
    };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: true
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
