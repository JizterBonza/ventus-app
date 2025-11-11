# Backend Deployment Guide for Render

This guide will help you deploy the `ventus-backend` service on Render.

## Option 1: Deploy via Blueprint (render.yaml) - Recommended

If you haven't deployed via Blueprint yet:

1. **Go to Render Dashboard**
   - Visit https://dashboard.render.com
   - Click "New +" → "Blueprint"

2. **Connect Your Repository**
   - Select your GitHub repository: `JizterBonza/ventus-app`
   - Render will detect `render.yaml` automatically
   - Click "Apply"

3. **This will create TWO services:**
   - `ventus-app` (frontend)
   - `ventus-backend` (backend)

4. **Configure Environment Variables for ventus-backend:**
   - Go to Render Dashboard → `ventus-backend` service
   - Click "Environment" tab
   - Add these variables:

   ```
   DATABASE_URL=postgresql://user:password@host:port/database
   JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long
   NODE_ENV=production
   ```

   **Where to get DATABASE_URL:**
   - If you have a Render PostgreSQL database:
     - Go to your database service in Render
     - Copy the "Internal Database URL" (if same region) or "External Database URL"
   - If you don't have a database yet, create one:
     - Render Dashboard → "New +" → "PostgreSQL"
     - Choose a name (e.g., `ventus-db`)
     - Select the same region as your backend service
     - Copy the connection string

5. **Deploy**
   - Render will automatically deploy both services
   - Wait for deployment to complete (3-5 minutes)

## Option 2: Manual Deployment (If Blueprint didn't work)

1. **Create Backend Service Manually**
   - Render Dashboard → "New +" → "Web Service"
   - Connect repository: `JizterBonza/ventus-app`
   - Click "Connect"

2. **Configure Service Settings:**
   - **Name:** `ventus-backend`
   - **Branch:** `master` (or your main branch)
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Region:** Same as your database (recommended: Oregon/US West)

3. **Build & Start Commands:**
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`

4. **Environment Variables:**
   - Click "Environment" tab
   - Add these variables:
     ```
     DATABASE_URL=postgresql://user:password@host:port/database
     JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long
     NODE_ENV=production
     ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment

## Required Environment Variables

### DATABASE_URL (Required)
- Format: `postgresql://username:password@host:port/database`
- Get from: Render Dashboard → Your PostgreSQL Database → Connection String
- Use **Internal Database URL** if backend and database are in the same region
- Use **External Database URL** if they're in different regions

### JWT_SECRET (Required)
- Generate a secure random string (minimum 32 characters)
- You can generate one using:
  ```bash
  openssl rand -base64 32
  ```
- Or use an online generator
- **Important:** Keep this secret! Don't share it publicly.

### NODE_ENV (Optional but recommended)
- Set to: `production`

### DATABASE_SSL (Optional)
- Only set if you need to override SSL settings
- Usually not needed - the code auto-detects this

## Verify Deployment

1. **Check Service Status**
   - Go to Render Dashboard → `ventus-backend`
   - Status should be "Live" (green)

2. **Test Health Endpoint**
   - Visit: `https://ventus-backend.onrender.com/api/health`
   - Should return:
     ```json
     {
       "status": "ok",
       "timestamp": "2024-01-01T00:00:00.000Z",
       "database": "connected",
       "environment": "production",
       "port": 5000
     }
     ```

3. **Check Logs**
   - Go to `ventus-backend` → "Logs" tab
   - Look for:
     ```
     === Backend Server Started ===
     ✓ Server running on http://0.0.0.0:5000
     ✓ Environment: production
     ✓ Database: Connected
     ```

## Troubleshooting

### Backend shows "Unavailable"
- Check logs for errors
- Verify all environment variables are set
- Ensure database is running and accessible

### Database Connection Failed
- Verify `DATABASE_URL` is correct
- Check database is in the same region (or use External URL)
- Ensure database is not paused (free tier databases pause after inactivity)

### CORS Errors
- The backend already allows requests from `*.onrender.com` domains
- If using a custom domain, update `backend/server.js` CORS configuration

### 404 Not Found
- Verify the service name is exactly `ventus-backend`
- Check that routes are prefixed with `/api/`
- Ensure the service is deployed and running

## Database Setup

If you need to initialize the database:

1. **Connect to your database** (using psql or a database client)
2. **Run the initialization script:**
   - You can use Render's Shell feature:
     - Go to `ventus-backend` → "Shell" tab
     - Run: `npm run init-db`
   - Or manually run the SQL from `backend/init-db.js`

## Service URL

Once deployed, your backend will be available at:
```
https://ventus-backend.onrender.com
```

API endpoints:
- Health: `https://ventus-backend.onrender.com/api/health`
- Auth: `https://ventus-backend.onrender.com/api/auth/*`

## Next Steps

After backend is deployed:
1. ✅ Verify health endpoint works
2. ✅ Test authentication endpoints
3. ✅ Update frontend if needed (should already be configured)
4. ✅ Test full authentication flow

## Quick Checklist

- [ ] Backend service created in Render
- [ ] Environment variables set (DATABASE_URL, JWT_SECRET)
- [ ] Service deployed successfully
- [ ] Health endpoint returns "ok"
- [ ] Database connection working
- [ ] Frontend can reach backend API

