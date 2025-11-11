import { User, LoginCredentials, SignupData, AuthResponse } from '../types/auth';

// Local storage keys
const AUTH_TOKEN_KEY = 'ventus_auth_token';
const AUTH_USER_KEY = 'ventus_auth_user';

// API configuration
const AUTH_API_URL = process.env.REACT_APP_AUTH_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://ventus-backend.onrender.com/api/auth'  // Update with your Render backend URL
    : '/api/auth');  // Use proxy in development (configured in package.json)

/**
 * Login user with email and password
 */
export const loginUser = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    console.log('Login attempt:', credentials.email);

    // Call actual backend API
    let response;
    try {
      response = await fetch(`${AUTH_API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
    } catch (fetchError) {
      // Network error - backend might not be running or CORS issue
      console.error('Network error during login:', fetchError);
      return {
        success: false,
        error: 'Unable to connect to the server. Please ensure the backend server is running.'
      };
    }

    // Check if response is ok before parsing JSON
    if (!response.ok) {
      let errorMessage = 'Login failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (parseError) {
        // If response is not JSON, use status text
        errorMessage = response.statusText || `Server error (${response.status})`;
      }
      return {
        success: false,
        error: errorMessage
      };
    }

    const data = await response.json();

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
    console.log('API URL:', AUTH_API_URL);
    console.log('Full signup URL:', `${AUTH_API_URL}/signup`);

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
    let response;
    try {
      response = await fetch(`${AUTH_API_URL}/signup`, {
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
    } catch (fetchError) {
      // Network error - backend might not be running or CORS issue
      console.error('Network error during signup:', fetchError);
      return {
        success: false,
        error: 'Unable to connect to the server. Please ensure the backend server is running.'
      };
    }

    // Check if response is ok before parsing JSON
    if (!response.ok) {
      let errorMessage = 'Signup failed';
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      
      try {
        if (isJson) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } else {
          // If response is not JSON, provide more helpful error messages
          if (response.status === 404) {
            errorMessage = 'API endpoint not found. Please ensure the backend server is running on port 5000 and the API URL is correct.';
          } else if (response.status === 500) {
            errorMessage = 'Server error. Please try again later.';
          } else {
            errorMessage = response.statusText || `Server error (${response.status})`;
          }
        }
      } catch (parseError) {
        // If parsing fails, use status-based messages
        if (response.status === 404) {
          errorMessage = 'API endpoint not found. Please ensure the backend server is running on port 5000.';
        } else if (response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = response.statusText || `Server error (${response.status})`;
        }
      }
      
      console.error('Signup API error:', {
        status: response.status,
        statusText: response.statusText,
        url: `${AUTH_API_URL}/signup`,
        contentType,
        errorMessage
      });
      
      return {
        success: false,
        error: errorMessage
      };
    }

    let result;
    try {
      result = await response.json();
    } catch (jsonError) {
      console.error('Error parsing JSON response:', jsonError);
      return {
        success: false,
        error: 'Invalid response from server'
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
    let response;
    try {
      response = await fetch(`${AUTH_API_URL}/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (fetchError) {
      // Network error - backend might not be running
      console.error('Network error during token verification:', fetchError);
      return null;
    }

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

