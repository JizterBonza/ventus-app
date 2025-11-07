import { User, LoginCredentials, SignupData, AuthResponse } from '../types/auth';

// Local storage keys
const AUTH_TOKEN_KEY = 'ventus_auth_token';
const AUTH_USER_KEY = 'ventus_auth_user';

// API configuration (to be replaced with actual backend)
const AUTH_API_URL = process.env.REACT_APP_AUTH_API_URL || '/api/auth';

/**
 * Login user with email and password
 */
export const loginUser = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    // TODO: Replace with actual API call
    // For now, using mock authentication
    console.log('Login attempt:', credentials.email);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock validation
    if (!credentials.email || !credentials.password) {
      return {
        success: false,
        error: 'Email and password are required'
      };
    }

    if (!isValidEmail(credentials.email)) {
      return {
        success: false,
        error: 'Invalid email format'
      };
    }

    if (credentials.password.length < 6) {
      return {
        success: false,
        error: 'Password must be at least 6 characters'
      };
    }

    // Mock user data
    const mockUser: User = {
      id: generateUserId(),
      email: credentials.email,
      firstName: 'John',
      lastName: 'Doe',
      createdAt: new Date().toISOString()
    };

    const mockToken = generateMockToken();

    // Store in localStorage
    localStorage.setItem(AUTH_TOKEN_KEY, mockToken);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(mockUser));

    return {
      success: true,
      user: mockUser,
      token: mockToken,
      message: 'Login successful'
    };

    // Actual API call (uncomment when backend is ready):
    /*
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
        error: data.message || 'Login failed'
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
    */
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

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Validation
    if (!data.email || !data.password || !data.firstName || !data.lastName) {
      return {
        success: false,
        error: 'All fields are required'
      };
    }

    if (!isValidEmail(data.email)) {
      return {
        success: false,
        error: 'Invalid email format'
      };
    }

    if (data.password.length < 6) {
      return {
        success: false,
        error: 'Password must be at least 6 characters'
      };
    }

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

    // Mock user data
    const mockUser: User = {
      id: generateUserId(),
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      createdAt: new Date().toISOString()
    };

    const mockToken = generateMockToken();

    // Store in localStorage
    localStorage.setItem(AUTH_TOKEN_KEY, mockToken);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(mockUser));

    return {
      success: true,
      user: mockUser,
      token: mockToken,
      message: 'Signup successful'
    };

    // Actual API call (uncomment when backend is ready):
    /*
    const response = await fetch(`${AUTH_API_URL}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Signup failed'
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
    */
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

    const user = JSON.parse(userStr) as User;
    return user;

    // TODO: Verify token with backend
    /*
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
    return data.user;
    */
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

