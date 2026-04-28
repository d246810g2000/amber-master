import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

export interface AuthUser {
  email: string;
  name: string;
  picture: string;
  token: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  login: (token: string) => void;
  loginWithUser: (user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('amber_auth_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user && typeof user === 'object' && user.email) {
          setCurrentUser(user);
        } else {
          logout();
        }
      } catch (e) {
        console.error('Invalid stored user', e);
        logout();
      }
    }
  }, []);

  const login = (token: string) => {
    try {
      const decoded: any = jwtDecode(token);
      const user: AuthUser = {
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        token: token,
      };
      setCurrentUser(user);
      localStorage.setItem('amber_auth_user', JSON.stringify(user));
      localStorage.setItem('amber_auth_token', token);
    } catch (e) {
      console.error('Failed to decode token during login', e);
    }
  };

  const loginWithUser = (user: AuthUser) => {
    setCurrentUser(user);
    localStorage.setItem('amber_auth_user', JSON.stringify(user));
    if (user.token) {
      localStorage.setItem('amber_auth_token', user.token);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('amber_auth_user');
    localStorage.removeItem('amber_auth_token');
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, loginWithUser, logout, isAuthenticated: !!currentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
