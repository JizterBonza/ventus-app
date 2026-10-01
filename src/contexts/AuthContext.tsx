import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { AuthState, LoginCredentials, SignupData, AuthContextType } from '../types/auth';
import { loginUser, signupUser, logoutUser, getCurrentUser } from '../utils/authService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setAuthState({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkAuth();
  }, []);

  const refreshUser = useCallback(async () => {
    const user = await getCurrentUser();
    if (user) {
      if (user.membership?.expiresAt && !(Date.parse(user.membership.expiresAt) > Date.now())) user.membershipActive = false;
      setAuthState(prev => ({ ...prev, user, isAuthenticated: true }));
    }
  }, []);

  // Expiry also applies to tabs left open. The server independently enforces access.
  useEffect(() => {
    const expiry = authState.user?.membership?.expiresAt;
    if (!expiry || !authState.user?.membershipActive) return;
    let timer: ReturnType<typeof setTimeout>;
    const checkExpiry = () => {
      const remaining = Date.parse(expiry) - Date.now();
      if (!Number.isFinite(remaining) || remaining <= 0) {
        setAuthState(prev => ({ ...prev, user: prev.user ? { ...prev.user, membershipActive: false } : null }));
        void refreshUser();
      } else {
        timer = setTimeout(checkExpiry, Math.min(remaining, 2147483647));
      }
    };
    checkExpiry();
    const onFocus = () => { clearTimeout(timer); checkExpiry(); void refreshUser(); };
    window.addEventListener('focus', onFocus);
    return () => { clearTimeout(timer); window.removeEventListener('focus', onFocus); };
  }, [authState.user?.membership?.expiresAt, authState.user?.membershipActive, refreshUser]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await loginUser(credentials);
      
      if (response.success && response.user) {
        setAuthState({
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: response.error || 'Login failed'
        }));
      }
      return response;
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed'
      }));
      return { success: false, error: error instanceof Error ? error.message : 'Login failed' };
    }
  }, []);

  const signup = useCallback(async (data: SignupData) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await signupUser(data);
      
      if (response.success && response.user) {
        setAuthState({
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: response.error || 'Signup failed'
        }));
      }
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Signup failed'
      }));
    }
  }, []);

  const logout = useCallback(() => {
    logoutUser();
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
  }, []);

  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  const value: AuthContextType = useMemo(() => ({
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    hasActiveMembership: Boolean(authState.user?.membershipActive && (!authState.user.membership?.expiresAt || Date.parse(authState.user.membership.expiresAt) > Date.now())),
    isLoading: authState.isLoading,
    error: authState.error,
    login,
    signup,
    logout,
    clearError,
    refreshUser
  }), [authState.user, authState.isAuthenticated, authState.isLoading, authState.error, login, signup, logout, clearError, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
