# Authentication System Implementation Guide

## Overview

The Ventus Hotel Booking App now includes a comprehensive authentication system with login, signup, and protected routes functionality. This guide provides detailed technical information about the implementation.

## Table of Contents

1. [Architecture](#architecture)
2. [Components](#components)
3. [Authentication Flow](#authentication-flow)
4. [API Integration](#api-integration)
5. [Protected Routes](#protected-routes)
6. [User Interface](#user-interface)
7. [Security Considerations](#security-considerations)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                     React Application                    │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐  │
│  │              AuthProvider (Context)               │  │
│  │  - Manages authentication state globally          │  │
│  │  - Provides auth methods to entire app            │  │
│  └───────────────────────────────────────────────────┘  │
│                          ▼                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │           Authentication Components               │  │
│  │  - Login Page                                     │  │
│  │  - Signup Page                                    │  │
│  │  - UserMenu                                       │  │
│  │  - ProtectedRoute                                 │  │
│  └───────────────────────────────────────────────────┘  │
│                          ▼                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │            Authentication Service                 │  │
│  │  - loginUser()                                    │  │
│  │  - signupUser()                                   │  │
│  │  - logoutUser()                                   │  │
│  │  - getCurrentUser()                               │  │
│  └───────────────────────────────────────────────────┘  │
│                          ▼                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Local Storage                        │  │
│  │  - ventus_auth_token                              │  │
│  │  - ventus_auth_user                               │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ▼
        ┌─────────────────────────────────┐
        │     Backend API (Future)        │
        │  - User authentication          │
        │  - Token validation             │
        │  - User management              │
        └─────────────────────────────────┘
```

### File Structure

```
src/
├── types/
│   └── auth.ts                    # TypeScript interfaces and types
├── contexts/
│   └── AuthContext.tsx            # Authentication context provider
├── utils/
│   └── authService.ts             # Authentication API service
├── components/
│   ├── layout/
│   │   ├── Header.tsx             # Updated with auth UI
│   │   └── Navigation.tsx         # Updated with auth links
│   └── shared/
│       ├── ProtectedRoute.tsx     # Route protection component
│       └── UserMenu.tsx           # User dropdown menu
├── pages/
│   ├── Login.tsx                  # Login page
│   └── Signup.tsx                 # Signup page
└── App.tsx                        # Updated with auth routing
```

---

## Components

### 1. AuthContext (`src/contexts/AuthContext.tsx`)

**Purpose:** Provides global authentication state and methods throughout the application.

**Key Features:**
- Centralized authentication state management
- Persistent authentication across page reloads
- Context-based state sharing
- Automatic authentication check on mount

**State:**
```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
```

**Methods:**
```typescript
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}
```

**Usage:**
```typescript
import { useAuth } from '../contexts/AuthContext';

const MyComponent = () => {
  const { user, isAuthenticated, login, logout } = useAuth();
  // Use authentication state and methods
};
```

### 2. Authentication Service (`src/utils/authService.ts`)

**Purpose:** Handles all authentication-related API calls and local storage operations.

**Key Functions:**

#### `loginUser(credentials: LoginCredentials)`
- Validates user credentials
- Authenticates user with backend (or mock data)
- Stores auth token and user data in localStorage
- Returns AuthResponse with success/error

#### `signupUser(data: SignupData)`
- Validates signup data
- Creates new user account
- Automatically logs in the user
- Returns AuthResponse with success/error

#### `logoutUser()`
- Clears authentication data from localStorage
- Removes tokens and user information

#### `getCurrentUser()`
- Retrieves current user from localStorage
- Validates stored authentication
- Returns User object or null

#### `isAuthenticated()`
- Quick check if user is logged in
- Returns boolean

**Current Implementation:**
- Uses **mock authentication** for development
- Stores data in **localStorage**
- Ready for backend integration

**Backend Integration (Future):**
```typescript
// Replace mock authentication with actual API calls
const response = await fetch(`${AUTH_API_URL}/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(credentials)
});
```

### 3. Login Page (`src/pages/Login.tsx`)

**Features:**
- Email and password fields
- Form validation
- "Remember me" checkbox
- "Forgot password" link
- Social login buttons (placeholder)
- Loading states
- Error handling
- Redirects to previous page after login

**Validation:**
- Email format validation
- Password minimum length (6 characters)
- Real-time field validation
- Clear error messages

### 4. Signup Page (`src/pages/Signup.tsx`)

**Features:**
- Multi-field registration form
  - First name and last name
  - Email address
  - Phone number (optional)
  - Password with strength requirements
  - Password confirmation
- Password visibility toggle
- Terms and conditions checkbox
- Social signup buttons (placeholder)
- Comprehensive validation
- Loading states
- Error handling

**Validation:**
- All required fields validation
- Email format validation
- Phone number format validation
- Password strength requirements:
  - Minimum 6 characters
  - Must contain uppercase letter
  - Must contain lowercase letter
  - Must contain number
- Password match confirmation
- Terms agreement requirement

### 5. ProtectedRoute Component (`src/components/shared/ProtectedRoute.tsx`)

**Purpose:** Protects routes that require authentication.

**Features:**
- Checks authentication status
- Shows loading state while checking
- Redirects to login if not authenticated
- Preserves intended destination
- Returns to original page after login

**Usage:**
```typescript
<Route 
  path="/booking/:hotelId" 
  element={
    <ProtectedRoute>
      <Booking />
    </ProtectedRoute>
  } 
/>
```

### 6. UserMenu Component (`src/components/shared/UserMenu.tsx`)

**Features:**
- User avatar with initials fallback
- Dropdown menu with:
  - User name and email display
  - My Profile link
  - My Bookings link
  - Favorites link
  - Settings link
  - Logout button
- Click outside to close
- Smooth animations
- Responsive design

### 7. Navigation Updates (`src/components/layout/Navigation.tsx`)

**Changes:**
- Conditionally shows login/signup or user menu
- Integrates authentication state
- Styled signup button
- User menu integration
- Loading state handling

---

## Authentication Flow

### Login Flow

```
1. User visits /login
   ↓
2. User enters credentials
   ↓
3. Form validation checks
   ↓
4. Submit to authService.loginUser()
   ↓
5. API validates credentials (or mock validation)
   ↓
6. On success:
   - Store token in localStorage
   - Store user data in localStorage
   - Update AuthContext state
   - Redirect to home or previous page
   ↓
7. On failure:
   - Display error message
   - Keep user on login page
```

### Signup Flow

```
1. User visits /signup
   ↓
2. User fills registration form
   ↓
3. Form validation checks all fields
   ↓
4. Submit to authService.signupUser()
   ↓
5. API creates account (or mock creation)
   ↓
6. On success:
   - Automatically log in user
   - Store token and user data
   - Update AuthContext state
   - Redirect to home page
   ↓
7. On failure:
   - Display error message
   - Keep user on signup page
```

### Protected Route Flow

```
1. User tries to access protected route (e.g., /booking/123)
   ↓
2. ProtectedRoute component checks authentication
   ↓
3. If authenticated:
   - Render the protected component
   ↓
4. If not authenticated:
   - Save intended destination
   - Redirect to /login
   ↓
5. After successful login:
   - Redirect back to intended destination
```

### Logout Flow

```
1. User clicks logout in UserMenu
   ↓
2. authService.logoutUser() called
   ↓
3. Clear localStorage:
   - Remove auth token
   - Remove user data
   ↓
4. Update AuthContext state
   ↓
5. User menu closes
   ↓
6. Navigation shows login/signup buttons
```

---

## API Integration

### Current Implementation

The authentication system currently uses **mock authentication** for development purposes.

**Mock Features:**
- Simulates API delays (1 second)
- Validates email format and password length
- Generates mock user data
- Creates mock authentication tokens
- Stores data in localStorage

### Backend Integration

To integrate with a real backend, update `src/utils/authService.ts`:

#### 1. Set API Base URL

```typescript
const AUTH_API_URL = process.env.REACT_APP_AUTH_API_URL || 'https://your-api.com/auth';
```

#### 2. Replace Mock Login

Uncomment and customize the API call in `loginUser()`:

```typescript
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

// Store tokens
localStorage.setItem(AUTH_TOKEN_KEY, data.token);
localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));

return {
  success: true,
  user: data.user,
  token: data.token
};
```

#### 3. Replace Mock Signup

Similar to login, update `signupUser()` with actual API endpoint.

#### 4. Add Token Validation

Update `getCurrentUser()` to verify tokens with backend:

```typescript
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
```

### Expected API Endpoints

| Endpoint | Method | Purpose | Request Body |
|----------|--------|---------|--------------|
| `/auth/login` | POST | User login | `{ email, password }` |
| `/auth/signup` | POST | User registration | `{ email, password, firstName, lastName, phone }` |
| `/auth/verify` | GET | Token verification | Headers: `Authorization: Bearer {token}` |
| `/auth/logout` | POST | User logout | Headers: `Authorization: Bearer {token}` |
| `/auth/forgot-password` | POST | Password reset | `{ email }` |

### Expected Response Format

```typescript
// Success Response
{
  success: true,
  user: {
    id: "string",
    email: "string",
    firstName: "string",
    lastName: "string",
    phone: "string",
    avatar: "string",
    createdAt: "string"
  },
  token: "string",
  message: "string"
}

// Error Response
{
  success: false,
  error: "string",
  message: "string"
}
```

---

## Protected Routes

### Configuration

Protected routes are defined in `src/App.tsx`:

```typescript
{/* Protected Routes - Require Authentication */}
<Route 
  path="/booking/:hotelId" 
  element={
    <ProtectedRoute>
      <Booking />
    </ProtectedRoute>
  } 
/>
```

### Adding New Protected Routes

1. Wrap the component with `ProtectedRoute`:

```typescript
import ProtectedRoute from './components/shared/ProtectedRoute';

<Route 
  path="/my-profile" 
  element={
    <ProtectedRoute>
      <Profile />
    </ProtectedRoute>
  } 
/>
```

2. The route will automatically:
   - Check authentication
   - Redirect to login if needed
   - Preserve the intended destination
   - Return to the page after login

### Currently Protected Routes

- `/booking/:hotelId` - Hotel booking page
- `/booking-test` - Booking test page

### Recommended Protected Routes

Consider protecting these routes when implemented:
- `/profile` - User profile
- `/my-bookings` - User's booking history
- `/favorites` - Saved hotels
- `/settings` - Account settings
- `/payment-methods` - Saved payment methods

---

## User Interface

### Login Page (`/login`)

**Features:**
- Clean, modern design
- Banner header with background image
- Centered login form
- Social login buttons
- Link to signup page
- Responsive layout

**User Experience:**
- Clear error messages
- Loading indicator during authentication
- Remember me option
- Forgot password link
- Automatic redirect after login

### Signup Page (`/signup`)

**Features:**
- Two-column layout for name fields
- Password strength requirements displayed
- Password visibility toggle
- Terms and conditions checkbox
- Social signup buttons
- Link to login page

**User Experience:**
- Real-time validation feedback
- Clear password requirements
- Visual feedback for errors
- Loading indicator
- Automatic login after signup

### User Menu

**Features:**
- Avatar with initials or image
- User info display
- Quick access links
- Styled dropdown
- Logout button

**Menu Items:**
- My Profile
- My Bookings
- Favorites
- Settings
- Logout

---

## Security Considerations

### Current Implementation

1. **Client-Side Validation**
   - Email format validation
   - Password strength requirements
   - Form field validation

2. **Token Storage**
   - Stored in localStorage
   - Automatically included in requests (when backend integrated)
   - Cleared on logout

3. **Password Requirements**
   - Minimum 6 characters
   - Must contain uppercase, lowercase, and number
   - Password confirmation required

### Production Recommendations

1. **HTTPS Only**
   - Always use HTTPS in production
   - Never send credentials over HTTP

2. **Secure Token Storage**
   - Consider httpOnly cookies instead of localStorage
   - Implement token refresh mechanism
   - Set appropriate token expiration

3. **Backend Validation**
   - Never trust client-side validation alone
   - Implement server-side validation
   - Sanitize all inputs

4. **Password Security**
   - Use bcrypt or similar for hashing
   - Implement rate limiting
   - Add CAPTCHA for signup
   - Implement account lockout after failed attempts

5. **Session Management**
   - Implement refresh tokens
   - Auto-logout on inactivity
   - Secure session handling

6. **XSS Protection**
   - Sanitize all user inputs
   - Use Content Security Policy
   - Escape output data

7. **CSRF Protection**
   - Implement CSRF tokens
   - Validate request origins

8. **API Security**
   - Use API rate limiting
   - Implement proper CORS
   - Validate all API requests

---

## Testing

### Manual Testing Checklist

#### Login Functionality
- [ ] Can access login page at `/login`
- [ ] Form validation works for invalid inputs
- [ ] Error messages display correctly
- [ ] Can log in with valid credentials
- [ ] Redirects to home after successful login
- [ ] "Remember me" functionality works
- [ ] Forgot password link is present
- [ ] Social login buttons are visible

#### Signup Functionality
- [ ] Can access signup page at `/signup`
- [ ] All form fields validate correctly
- [ ] Password strength requirements work
- [ ] Password visibility toggle works
- [ ] Passwords must match
- [ ] Terms checkbox is required
- [ ] Can create account with valid data
- [ ] Automatically logs in after signup
- [ ] Social signup buttons are visible

#### Protected Routes
- [ ] Cannot access protected routes when logged out
- [ ] Redirects to login when accessing protected route
- [ ] Returns to intended page after login
- [ ] Can access protected routes when logged in

#### User Menu
- [ ] User menu appears when logged in
- [ ] Shows correct user information
- [ ] All menu links are functional
- [ ] Dropdown closes when clicking outside
- [ ] Logout button works correctly
- [ ] Returns to guest navigation after logout

#### Navigation
- [ ] Login/Signup buttons show when logged out
- [ ] User menu shows when logged in
- [ ] Navigation state persists on page reload
- [ ] Mobile menu works correctly

### Automated Testing (Future)

Create tests for:

1. **Unit Tests**
   - Authentication service functions
   - Form validation logic
   - Context state management

2. **Integration Tests**
   - Login flow
   - Signup flow
   - Logout flow
   - Protected route access

3. **E2E Tests**
   - Complete user journeys
   - Cross-browser compatibility
   - Responsive design

---

## Troubleshooting

### Common Issues

#### 1. "User not authenticated" after refresh

**Cause:** localStorage data was cleared or corrupted

**Solution:**
- Check browser localStorage for `ventus_auth_token` and `ventus_auth_user`
- Clear localStorage and log in again
- Ensure browser allows localStorage

#### 2. Infinite redirect loop

**Cause:** Authentication state not properly initialized

**Solution:**
- Check `isLoading` state in ProtectedRoute
- Ensure AuthProvider wraps all routes
- Verify authentication check completes

#### 3. Protected routes accessible without login

**Cause:** ProtectedRoute not properly implemented

**Solution:**
- Ensure routes are wrapped with `<ProtectedRoute>`
- Check AuthContext is providing correct state
- Verify isAuthenticated is set correctly

#### 4. User menu not showing

**Cause:** isAuthenticated not true after login

**Solution:**
- Check login success response
- Verify AuthContext state updates
- Check localStorage has user data
- Ensure Navigation has correct conditional rendering

#### 5. Form validation not working

**Cause:** Validation logic not triggered

**Solution:**
- Check validation functions are called on submit
- Ensure validation errors state is set
- Verify error messages are displayed
- Check field names match validation keys

#### 6. TypeScript errors

**Cause:** Type mismatches or missing types

**Solution:**
- Ensure all interfaces are imported
- Check type definitions in `src/types/auth.ts`
- Verify Context types match usage
- Run `npm run build` to check for errors

### Debug Mode

Enable debug logging:

```typescript
// In authService.ts
console.log('Login attempt:', credentials);
console.log('Auth response:', response);
console.log('Current user:', user);
```

### Browser DevTools

1. **Check localStorage:**
   - Open DevTools → Application → Local Storage
   - Look for `ventus_auth_token` and `ventus_auth_user`

2. **Check Context state:**
   - Use React DevTools
   - Inspect AuthProvider component
   - Check state values

3. **Network requests:**
   - Open Network tab
   - Monitor API calls (when backend integrated)
   - Check request/response data

---

## Future Enhancements

### Planned Features

1. **Password Reset**
   - Forgot password flow
   - Email verification
   - Password reset page

2. **Email Verification**
   - Send verification email on signup
   - Verify email before full access
   - Resend verification email

3. **Social Authentication**
   - Google OAuth
   - Facebook Login
   - Apple Sign In

4. **Two-Factor Authentication (2FA)**
   - SMS verification
   - Authenticator app support
   - Backup codes

5. **Profile Management**
   - Edit profile page
   - Avatar upload
   - Password change
   - Account deletion

6. **Session Management**
   - Refresh tokens
   - Auto-logout on inactivity
   - Multiple device sessions

7. **Account Security**
   - Login history
   - Active sessions management
   - Security notifications

8. **User Roles**
   - Admin users
   - Guest users
   - Premium users
   - Role-based access control

---

## Support

For authentication-related issues:

1. Check this implementation guide
2. Review the setup guide (`AUTH_SETUP_GUIDE.md`)
3. Check browser console for errors
4. Verify localStorage data
5. Test with mock authentication first
6. Contact development team for backend integration support

---

*Last Updated: November 7, 2025*
*Version: 1.0*

