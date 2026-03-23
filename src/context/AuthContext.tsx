import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

export interface AuthUser {
  email: string;
  name: string;
  picture: string;
  token: string;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('amber_auth_token');
    if (storedToken) {
      try {
        const decoded: any = jwtDecode(storedToken);
        // Check expiry
        if (decoded.exp * 1000 < Date.now()) {
          console.warn('Token expired. Logging out.');
          logout();
        } else {
          setCurrentUser({
            email: decoded.email,
            name: decoded.name,
            picture: decoded.picture,
            token: storedToken,
          });
        }
      } catch (e) {
        console.error('Invalid stored token', e);
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
      localStorage.setItem('amber_auth_token', token);
    } catch (e) {
      console.error('Failed to decode token during login', e);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('amber_auth_token');
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, isAuthenticated: !!currentUser }}>
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
