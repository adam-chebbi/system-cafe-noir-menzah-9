import React, { createContext, useContext, useCallback, useState } from 'react';
import { User } from '../types/index';
import { api } from '../services/api';

/**
 * Session-only: closing the browser tab/app ends the session and requires the PIN again, but a
 * simple page refresh during a shift does not log the operator out.
 */
const SESSION_STORAGE_KEY = 'cafe_noir_session_user';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  authError: string | null;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function loadStoredUser(): User | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => loadStoredUser());
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const login = useCallback(async (pin: string): Promise<boolean> => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const result = await api.loginPin(pin);
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(result.user));
      setCurrentUser(result.user);
      return true;
    } catch (err: any) {
      setAuthError(err.message || 'Code PIN incorrect.');
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setCurrentUser(null);
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isAuthenticating,
        authError,
        login,
        logout,
        clearAuthError
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
