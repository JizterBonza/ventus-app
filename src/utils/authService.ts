import { User, LoginCredentials, SignupData, AuthResponse } from '../types/auth';

// Local storage keys
const AUTH_TOKEN_KEY = 'ventus_auth_token';
const AUTH_USER_KEY = 'ventus_auth_user';

// API configuration
// Priority: 1. Environment variable, 2. Production URL, 3. Development proxy
const getApiUrl = () => {
  // Check for explicit environment variable first
  if (process.env.REACT_APP_AUTH_API_URL) {
    return process.env.REACT_APP_AUTH_API_URL;
  }
  
  // In production, use the backend URL
  if (process.env.NODE_ENV === 'production') {
    return 'https://ventus-backend.onrender.com/api/auth';
  }
  
  // In development, use proxy
  return '/api/auth';
};

const AUTH_API_URL = getApiUrl();
const SUBSCRIPTIONS_API_URL = AUTH_API_URL.replace(/\/auth\/?$/, '/subscriptions');

// Log API URL in development for debugging
if (process.env.NODE_ENV === 'development') {
  console.log('Auth API URL:', AUTH_API_URL);
}

/**
 * Login user with email and password
 */
export const loginUser = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    const normalizedCredentials = {
      ...credentials,
      email: credentials.email.trim().toLowerCase()
    };
    console.log('Login attempt:', normalizedCredentials.email);

    // Call actual backend API
    let response;
    try {
      response = await fetch(`${AUTH_API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(normalizedCredentials)
      });
    } catch (fetchError) {
      // Network error - backend might not be running or CORS issue
      console.error('Network error during login:', fetchError);
      console.error('Attempted URL:', `${AUTH_API_URL}/login`);
      console.error('Error details:', fetchError instanceof Error ? fetchError.message : String(fetchError));
      
      // Provide more specific error message
      let errorMessage = 'Unable to connect to the server. Please ensure the backend server is running.';
      if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
        errorMessage = `Cannot reach backend server at ${AUTH_API_URL}. Please check if the backend is running and the URL is correct.`;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }

    // Check if response is ok before parsing JSON
    if (!response.ok) {
      let errorMessage = 'Login failed';
      let errorCode: string | undefined;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
        errorCode = errorData.code;
      } catch (parseError) {
        // If response is not JSON, use status text
        errorMessage = response.statusText || `Server error (${response.status})`;
      }
      return {
        success: false,
        error: errorMessage,
        code: errorCode
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
    const normalizedEmail = data.email.trim().toLowerCase();
    console.log('Signup attempt:', normalizedEmail);
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
          email: normalizedEmail,
          password: data.password,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          phone: data.phone?.trim(),
          cityOfResidence: data.cityOfResidence.trim(),
          agreeToTerms: data.agreeToTerms
        })
      });
    } catch (fetchError) {
      // Network error - backend might not be running or CORS issue
      console.error('Network error during signup:', fetchError);
      console.error('Attempted URL:', `${AUTH_API_URL}/signup`);
      console.error('Error details:', fetchError instanceof Error ? fetchError.message : String(fetchError));
      
      // Provide more specific error message
      let errorMessage = 'Unable to connect to the server. Please ensure the backend server is running.';
      if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
        errorMessage = `Cannot reach backend server at ${AUTH_API_URL}. Please check if the backend is running and the URL is correct.`;
      }
      
      return {
        success: false,
        error: errorMessage
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
      requiresEmailVerification: result.requiresEmailVerification,
      verificationEmailSent: result.verificationEmailSent,
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

/**
 * Update user email
 */
export const updateUserEmail = async (newEmail: string, currentPassword: string): Promise<AuthResponse> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        error: 'You must be logged in to update your email'
      };
    }

    const response = await fetch(`${AUTH_API_URL}/update-email`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        email: newEmail,
        currentPassword
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || 'Failed to update email'
      };
    }

    const data = await response.json();
    
    // Update localStorage with new user data
    if (data.user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
    }

    return {
      success: true,
      user: data.user,
      message: data.message || 'Email updated successfully'
    };
  } catch (error) {
    console.error('Update email error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update email'
    };
  }
};

/**
 * Update user password
 */
export const updateUserPassword = async (currentPassword: string, newPassword: string): Promise<AuthResponse> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        error: 'You must be logged in to update your password'
      };
    }

    const response = await fetch(`${AUTH_API_URL}/update-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        currentPassword,
        newPassword
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || 'Failed to update password'
      };
    }

    const data = await response.json();

    return {
      success: true,
      message: data.message || 'Password updated successfully'
    };
  } catch (error) {
    console.error('Update password error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update password'
    };
  }
};

/**
 * Request a one-time password reset email. The backend deliberately returns
 * the same success message whether or not the address belongs to an account.
 */
export const requestPasswordReset = async (email: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${AUTH_API_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await response.json().catch(() => ({}));
    return response.ok
      ? { success: true, message: data.message }
      : { success: false, error: data.error || 'Unable to send the reset email' };
  } catch (error) {
    console.error('Request password reset error:', error);
    return { success: false, error: 'Unable to connect to the password reset service' };
  }
};

export const resendVerificationEmail = async (email: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${AUTH_API_URL}/resend-verification`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
    });
    const data = await response.json().catch(() => ({}));
    return response.ok
      ? { success: true, message: data.message }
      : { success: false, error: data.error || 'Unable to send a new confirmation link.' };
  } catch {
    return { success: false, error: 'Unable to connect to the email service. Please try again.' };
  }
};

export const verifyEmail = async (token: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${AUTH_API_URL}/verify-email`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token })
    });
    const data = await response.json().catch(() => ({}));
    return response.ok
      ? { success: true, message: data.message }
      : { success: false, error: data.error || 'This confirmation link is invalid or has expired.' };
  } catch {
    return { success: false, error: 'Unable to confirm your email. Please try again.' };
  }
};

export const validatePasswordResetToken = async (token: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${AUTH_API_URL}/reset-password/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    const data = await response.json().catch(() => ({}));
    return response.ok
      ? { success: true }
      : { success: false, error: data.error || 'This reset link is invalid or has expired' };
  } catch (error) {
    console.error('Validate password reset token error:', error);
    return { success: false, error: 'Unable to validate the reset link' };
  }
};

export const resetPassword = async (token: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${AUTH_API_URL}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });
    const data = await response.json().catch(() => ({}));
    return response.ok
      ? { success: true, message: data.message }
      : { success: false, error: data.error || 'Unable to reset the password' };
  } catch (error) {
    console.error('Reset password error:', error);
    return { success: false, error: 'Unable to connect to the password reset service' };
  }
};

export interface MembershipCheckoutConfig {
  plan: {
    id: string;
    name: string;
    price: number;
    currency: 'GBP';
    interval: 'yearly';
  };
  paypal: {
    configured: boolean;
    clientId: string | null;
    environment: 'sandbox' | 'live';
  };
}

export interface MembershipQuote {
  planId: string;
  basePrice: number;
  finalPrice: number;
  currency: 'GBP';
  couponValid: boolean;
  discountPercent: number;
  couponDescription: string;
}

const parseApiResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data as T;
};

const membershipAuthHeaders = () => {
  const token = getAuthToken();
  if (!token) throw new Error('Please log in to continue with membership checkout.');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
};

export const getMembershipCheckoutConfig = async (): Promise<MembershipCheckoutConfig> => {
  const response = await fetch(`${SUBSCRIPTIONS_API_URL}/config`, { cache: 'no-store' });
  const data = await parseApiResponse<{ success: boolean } & MembershipCheckoutConfig>(response);
  return { plan: data.plan, paypal: data.paypal };
};

export const getMembershipQuote = async (couponCode?: string): Promise<MembershipQuote> => {
  const response = await fetch(`${SUBSCRIPTIONS_API_URL}/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId: 'travel-yearly', couponCode })
  });
  const data = await parseApiResponse<{ success: boolean; quote: MembershipQuote }>(response);
  return data.quote;
};

export const createPayPalMembershipOrder = async (couponCode?: string): Promise<string> => {
  const response = await fetch(`${SUBSCRIPTIONS_API_URL}/paypal/order`, {
    method: 'POST',
    headers: membershipAuthHeaders(),
    body: JSON.stringify({ planId: 'travel-yearly', couponCode })
  });
  const data = await parseApiResponse<{ success: boolean; orderId: string }>(response);
  return data.orderId;
};

export const capturePayPalMembershipOrder = async (orderId: string): Promise<void> => {
  const response = await fetch(`${SUBSCRIPTIONS_API_URL}/paypal/capture`, {
    method: 'POST',
    headers: membershipAuthHeaders(),
    body: JSON.stringify({ orderId })
  });
  await parseApiResponse(response);
};

export const activateComplimentaryMembership = async (couponCode: string): Promise<void> => {
  const response = await fetch(`${SUBSCRIPTIONS_API_URL}/complimentary`, {
    method: 'POST',
    headers: membershipAuthHeaders(),
    body: JSON.stringify({ planId: 'travel-yearly', couponCode })
  });
  await parseApiResponse(response);
};

export const getSubscriptionStatus = async (): Promise<{ hasActiveSubscription: boolean }> => {
  const response = await fetch(`${SUBSCRIPTIONS_API_URL}/status`, {
    headers: membershipAuthHeaders(),
    cache: 'no-store'
  });
  return parseApiResponse(response);
};

/**
 * Subscribe user to a plan with optional coupon code
 */
export const subscribeUser = async (
  planId: string, 
  couponCode?: string,
  paymentDetails?: {
    type: 'paypal';
    orderId: string;
  }
): Promise<{ success: boolean; subscriptionId?: string; message?: string; error?: string }> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        error: 'You must be logged in to subscribe'
      };
    }

    // Build subscription API URL
    const subscriptionApiUrl = AUTH_API_URL.replace('/auth', '/subscriptions');

    const response = await fetch(`${subscriptionApiUrl}/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        planId,
        couponCode,
        paymentDetails
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || 'Failed to process subscription'
      };
    }

    const data = await response.json();

    return {
      success: true,
      subscriptionId: data.subscriptionId,
      message: data.message || 'Subscription successful!'
    };
  } catch (error) {
    console.error('Subscription error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process subscription'
    };
  }
};
