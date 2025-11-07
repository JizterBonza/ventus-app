import { User, LoginCredentials, SignupData, AuthResponse } from '../types/auth';

// Local storage keys
const AUTH_TOKEN_KEY = 'ventus_auth_token';
const AUTH_USER_KEY = 'ventus_auth_user';

// API configuration
const AUTH_API_URL = process.env.REACT_APP_AUTH_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://ventus-backend.onrender.com/api/auth'  // Update with your Render backend URL
    : 'http://localhost:5000/api/auth');

/**
 * Login user with email and password
 */
export const loginUser = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    console.log('Login attempt:', credentials.email);

    // Call actual backend API
    const response = await fetch(`${AUTH_API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Login failed'
      };
    }

    // Store auth token and user data
    if (data.token) {
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    }
    if (data.user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
    }

    return {
      success: true,
      user: data.user,
      token: data.token,
      message: data.message || 'Login successful'
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed'
    };
  }
};

/**
 * Sign up a new user
 */
export const signupUser = async (data: SignupData): Promise<AuthResponse> => {
  try {
    console.log('Signup attempt:', data.email);

    // Client-side validation
    if (data.password !== data.confirmPassword) {
      return {
        success: false,
        error: 'Passwords do not match'
      };
    }

    if (!data.agreeToTerms) {
      return {
        success: false,
        error: 'You must agree to the terms and conditions'
      };
    }

    // Call actual backend API
    const response = await fetch(`${AUTH_API_URL}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Signup failed'
      };
    }

    // Store auth token and user data
    if (result.token) {
      localStorage.setItem(AUTH_TOKEN_KEY, result.token);
    }
    if (result.user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(result.user));
    }

    return {
      success: true,
      user: result.user,
      token: result.token,
      message: result.message || 'Signup successful'
    };
  } catch (error) {
    console.error('Signup error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Signup failed'
    };
  }
};

/**
 * Logout user
 */
export const logoutUser = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  console.log('User logged out');
};

/**
 * Get current user from localStorage
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const userStr = localStorage.getItem(AUTH_USER_KEY);
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (!userStr || !token) {
      return null;
    }

    // Verify token with backend
    const response = await fetch(`${AUTH_API_URL}/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      logoutUser();
      return null;
    }

    const data = await response.json();
    
    // Update localStorage with fresh user data
    if (data.user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
    }
    
    return data.user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Get auth token
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  const user = localStorage.getItem(AUTH_USER_KEY);
  return !!(token && user);
};

// Helper functions
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const generateUserId = (): string => {
  return 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

const generateMockToken = (): string => {
  return 'mock_token_' + Math.random().toString(36).substr(2) + Date.now().toString(36);
};

