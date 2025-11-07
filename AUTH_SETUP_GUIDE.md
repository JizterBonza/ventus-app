# Authentication System Setup Guide

## Quick Start

This guide provides step-by-step instructions to use and test the authentication system in the Ventus Hotel Booking App.

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Running the App](#running-the-app)
4. [Testing Authentication](#testing-authentication)
5. [User Guide](#user-guide)
6. [Developer Guide](#developer-guide)
7. [Backend Integration](#backend-integration)
8. [FAQ](#faq)

---

## Overview

### Features Implemented

✅ **User Registration (Signup)**
- Create new user accounts
- Form validation with password strength requirements
- Automatic login after successful signup

✅ **User Login**
- Email and password authentication
- Remember me functionality
- Redirect to previous page after login

✅ **User Logout**
- Secure logout with data cleanup
- Automatic navigation update

✅ **Protected Routes**
- Routes that require authentication
- Automatic redirect to login
- Preserve intended destination

✅ **User Menu**
- User avatar with dropdown
- Quick access to profile, bookings, favorites, settings
- Logout button

✅ **Persistent Authentication**
- Stay logged in across page reloads
- Automatic session restoration

---

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Git

### Steps

1. **Clone the repository** (if not already done):
   ```bash
   git clone https://github.com/JizterBonza/ventus-app.git
   cd ventus-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **No additional configuration needed!**
   - Authentication is ready to use out of the box
   - Currently uses mock authentication (no backend required)

---

## Running the App

### Development Mode

```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm run start:prod
```

---

## Testing Authentication

### Test Scenario 1: User Signup

1. **Navigate to Signup page:**
   - Click "Sign Up" in the navigation
   - Or go to: [http://localhost:3000/signup](http://localhost:3000/signup)

2. **Fill out the registration form:**
   ```
   First Name: John
   Last Name: Doe
   Email: john.doe@example.com
   Phone: +1234567890 (optional)
   Password: Test123! (must meet requirements)
   Confirm Password: Test123!
   ☑ Agree to Terms and Conditions
   ```

3. **Click "Create Account"**

4. **Expected Result:**
   - Success message or redirect
   - Automatically logged in
   - User menu appears in navigation
   - Redirected to home page

### Test Scenario 2: User Login

1. **Navigate to Login page:**
   - Click "Login" in the navigation
   - Or go to: [http://localhost:3000/login](http://localhost:3000/login)

2. **Enter credentials:**
   ```
   Email: any-email@example.com
   Password: any-password-6-chars
   ```
   *Note: Mock authentication accepts any valid format*

3. **Click "Login"**

4. **Expected Result:**
   - Successfully logged in
   - User menu appears
   - Redirected to home or previous page

### Test Scenario 3: Protected Route Access

1. **Without Login:**
   - Try to access: [http://localhost:3000/booking/123](http://localhost:3000/booking/123)
   - Should redirect to login page
   - Login page saves your intended destination

2. **After Login:**
   - Complete login
   - Automatically redirected back to booking page
   - Can now access the protected route

3. **With Active Session:**
   - Already logged in
   - Access protected route directly
   - No redirect, immediate access

### Test Scenario 4: User Logout

1. **Click on user menu** (avatar in navigation)

2. **Click "Logout"** button at bottom of menu

3. **Expected Result:**
   - Logged out successfully
   - User menu disappears
   - Login/Signup buttons appear
   - Cannot access protected routes anymore

### Test Scenario 5: Session Persistence

1. **Log in to the app**

2. **Refresh the page** (F5 or Cmd+R)

3. **Expected Result:**
   - Still logged in
   - User menu still shows
   - Session persists across reloads

4. **Close and reopen browser:**
   - Still logged in (localStorage persists)

---

## User Guide

### For End Users

#### Creating an Account

1. Click **"Sign Up"** in the top navigation
2. Fill in all required fields:
   - First and last name
   - Email address
   - Password (minimum 6 characters with uppercase, lowercase, and number)
   - Confirm password
3. Optionally add phone number
4. Check the Terms and Conditions checkbox
5. Click **"Create Account"**
6. You'll be automatically logged in

#### Logging In

1. Click **"Login"** in the top navigation
2. Enter your email and password
3. Optionally check "Remember me"
4. Click **"Login"**
5. You'll be redirected to your previous page or home

#### Using the User Menu

Once logged in, click on your avatar (with your initials) in the top-right corner to access:

- **My Profile** - View and edit your profile
- **My Bookings** - See your booking history
- **Favorites** - View saved hotels
- **Settings** - Manage account settings
- **Logout** - Sign out of your account

#### Booking Hotels (Protected)

1. Search for hotels on the home page
2. Click on a hotel to view details
3. Click **"Book Now"**
4. If not logged in, you'll be redirected to login
5. After login, you'll return to complete your booking

---

## Developer Guide

### Authentication State

Access authentication state anywhere in your app:

```typescript
import { useAuth } from '../contexts/AuthContext';

const MyComponent = () => {
  const { user, isAuthenticated, isLoading, error } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!isAuthenticated) return <div>Please log in</div>;
  
  return <div>Welcome, {user.firstName}!</div>;
};
```

### Authentication Methods

```typescript
const { login, signup, logout, clearError } = useAuth();

// Login
await login({ 
  email: 'user@example.com', 
  password: 'password123' 
});

// Signup
await signup({
  email: 'user@example.com',
  password: 'password123',
  confirmPassword: 'password123',
  firstName: 'John',
  lastName: 'Doe',
  phone: '+1234567890',
  agreeToTerms: true
});

// Logout
logout();

// Clear errors
clearError();
```

### Creating Protected Routes

Wrap any route with `ProtectedRoute` component:

```typescript
import ProtectedRoute from './components/shared/ProtectedRoute';

<Route 
  path="/protected-page" 
  element={
    <ProtectedRoute>
      <MyProtectedPage />
    </ProtectedRoute>
  } 
/>
```

### Checking Authentication in Components

```typescript
import { useAuth } from '../contexts/AuthContext';

const MyComponent = () => {
  const { isAuthenticated, user } = useAuth();
  
  return (
    <div>
      {isAuthenticated ? (
        <p>Welcome back, {user?.firstName}!</p>
      ) : (
        <p>Please log in to continue</p>
      )}
    </div>
  );
};
```

### Accessing User Data

```typescript
const { user } = useAuth();

// User properties:
user.id            // Unique user ID
user.email         // Email address
user.firstName     // First name
user.lastName      // Last name
user.phone         // Phone number (optional)
user.avatar        // Avatar URL (optional)
user.createdAt     // Account creation date
```

---

## Backend Integration

### Current Setup: Mock Authentication

The app currently uses **mock authentication** for development:
- No backend server required
- Data stored in browser localStorage
- Works for testing and development

### Integrating with Real Backend

#### Step 1: Set Environment Variable

Create `.env` file in project root:

```env
REACT_APP_AUTH_API_URL=https://your-backend-api.com/auth
```

#### Step 2: Update Authentication Service

Open `src/utils/authService.ts` and follow the integration comments to:

1. Replace mock authentication with real API calls
2. Update endpoints for login, signup, logout
3. Add token validation logic
4. Handle API errors appropriately

#### Step 3: Required Backend Endpoints

Your backend must provide:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/login` | POST | User login |
| `/auth/signup` | POST | User registration |
| `/auth/verify` | GET | Verify authentication token |
| `/auth/logout` | POST | User logout |

#### Step 4: Expected Response Format

**Success Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "avatar": "https://example.com/avatar.jpg",
    "createdAt": "2025-11-07T00:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Invalid credentials",
  "message": "Email or password is incorrect"
}
```

#### Step 5: Test Backend Integration

1. Update `.env` with your API URL
2. Restart the development server
3. Test login with real credentials
4. Verify token is stored correctly
5. Test protected routes
6. Test logout functionality

---

## FAQ

### General Questions

**Q: Do I need a backend to use authentication?**  
A: No, the app currently works with mock authentication. You can test all features without a backend.

**Q: Where is user data stored?**  
A: Currently in browser localStorage. When integrated with backend, tokens will be validated server-side.

**Q: Is the authentication secure?**  
A: Mock authentication is for development only. For production, integrate with a secure backend with proper encryption.

**Q: Can users stay logged in after closing the browser?**  
A: Yes, authentication persists using localStorage until user logs out.

### Login/Signup Issues

**Q: What are the password requirements?**  
A: Minimum 6 characters with at least one uppercase, one lowercase, and one number.

**Q: Can I use any email for testing?**  
A: Yes, mock authentication accepts any valid email format.

**Q: What happens if I forget my password?**  
A: Password reset functionality is planned for future implementation.

**Q: Can I use social login (Google, Facebook)?**  
A: Social login UI is present but not functional yet. Planned for future implementation.

### Technical Issues

**Q: Why am I logged out after refresh?**  
A: Check browser localStorage. Clear cache and try logging in again.

**Q: Protected routes not working?**  
A: Ensure you're logged in and AuthProvider wraps all routes in App.tsx.

**Q: User menu not showing after login?**  
A: Check browser console for errors. Verify authentication state updates correctly.

**Q: TypeScript errors in authentication code?**  
A: Ensure all dependencies are installed: `npm install`

### Development Questions

**Q: How do I add new protected routes?**  
A: Wrap route with `<ProtectedRoute>` component. See Developer Guide above.

**Q: How do I access user data in my components?**  
A: Use `useAuth()` hook to access user and authentication state.

**Q: Can I customize the login/signup pages?**  
A: Yes, edit `src/pages/Login.tsx` and `src/pages/Signup.tsx`.

**Q: How do I add more fields to signup?**  
A: Update `SignupData` type in `src/types/auth.ts` and modify the signup form.

---

## Quick Reference

### Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/login` | Public | Login page |
| `/signup` | Public | Signup page |
| `/booking/:id` | Protected | Hotel booking (requires login) |
| `/booking-test` | Protected | Booking test page |

### Authentication Hook

```typescript
const {
  user,              // Current user object
  isAuthenticated,   // Boolean: logged in?
  isLoading,         // Boolean: checking auth?
  error,             // String: error message
  login,             // Function: log in user
  signup,            // Function: create account
  logout,            // Function: log out user
  clearError         // Function: clear errors
} = useAuth();
```

### Storage Keys

```
localStorage:
  - ventus_auth_token  (Authentication token)
  - ventus_auth_user   (User data JSON)
```

---

## Troubleshooting

### Problem: Can't log in

**Solutions:**
1. Check email format is valid
2. Password must be at least 6 characters
3. Clear browser cache and localStorage
4. Check browser console for errors

### Problem: Logged out after refresh

**Solutions:**
1. Check localStorage is not disabled
2. Verify `ventus_auth_token` and `ventus_auth_user` exist
3. Clear cache and log in again

### Problem: Protected routes accessible without login

**Solutions:**
1. Verify routes are wrapped with `<ProtectedRoute>`
2. Check AuthProvider wraps all routes
3. Ensure authentication state is correct

### Problem: User menu not appearing

**Solutions:**
1. Check `isAuthenticated` is true
2. Verify user data exists
3. Check Navigation component imports
4. Review browser console for errors

---

## Support

### Documentation

- **Technical Details:** See `AUTH_IMPLEMENTATION_GUIDE.md`
- **API Integration:** See Backend Integration section above
- **Render Deployment:** See `RENDER_AUTO_DEPLOY_GUIDE.md`

### Getting Help

1. Check this setup guide
2. Review implementation guide for technical details
3. Check browser console for errors
4. Verify localStorage data
5. Contact development team

---

## Next Steps

### For Users
1. ✅ Create an account
2. ✅ Log in
3. ✅ Browse hotels
4. ✅ Make bookings
5. ✅ Manage your profile

### For Developers
1. ✅ Understand authentication flow
2. ✅ Test all features
3. ⏳ Integrate with backend (when ready)
4. ⏳ Implement additional features:
   - Password reset
   - Email verification
   - Social authentication
   - Profile management
   - Two-factor authentication

### For Deployment
1. ✅ Test authentication in development
2. ✅ Configure environment variables
3. ⏳ Integrate with production backend
4. ⏳ Deploy to Render.com (auto-deploy configured)
5. ⏳ Test in production environment

---

**Congratulations! Your authentication system is ready to use! 🎉**

Start by creating an account at [http://localhost:3000/signup](http://localhost:3000/signup)

---

*Last Updated: November 7, 2025*
*Version: 1.0*

