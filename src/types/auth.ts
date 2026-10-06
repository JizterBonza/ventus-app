// Authentication types for the Ventus App

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  cityOfResidence?: string;
  avatar?: string;
  createdAt: string;
  membershipActive: boolean;
  trial?: { eligible: boolean; used: boolean; expiresAt: string | null };
  membership?: {
    id: string;
    planId: string;
    status: string;
    amountPaid: number;
    currency: string;
    paymentProvider: string;
    startsAt: string;
    expiresAt: string | null;
    recurring?: boolean;
    billingStatus?: string | null;
    trialEndsAt?: string | null;
    cancelAtPeriodEnd?: boolean;
    renewalAmount?: number | null;
  } | null;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone?: string;
  cityOfResidence: string;
  agreeToTerms: boolean;
}

export interface AuthResponse {
  success: boolean;
  code?: string;
  requiresEmailVerification?: boolean;
  verificationEmailSent?: boolean;
  user?: User;
  token?: string;
  message?: string;
  error?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  hasActiveMembership: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}
