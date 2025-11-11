# Render Deployment Troubleshooting Guide

## Issue: "Unable to connect to the server"

This guide helps you resolve connection issues between your frontend and backend on Render.

## ✅ Fixed Issues

1. **Health Check Path**: Updated `render.yaml` to use `/api/health` instead of `/health` for the backend service.

## 🔧 Required Steps to Fix

### 1. Set Environment Variables in Render Dashboard

Go to your **ventus-backend** service in Render dashboard and add these environment variables:

#### Required Variables:
- `DATABASE_URL` - Your PostgreSQL database connection string
  - Format: `postgresql://user:password@host:port/database`
  - Get this from: Render Dashboard → Your Database → Internal Database URL (for services in same region) or External Database URL
  
- `JWT_SECRET` - A secure random string for JWT token signing
  - Generate one: `openssl rand -base64 32` or use an online generator
  - Example: `your-super-secret-jwt-key-min-32-chars-long`

#### Optional Variables:
- `DATABASE_SSL` - Set to `true` or `false` if you need to override SSL settings
- `PORT` - Usually auto-set by Render, but you can override if needed (default: 5000)

### 2. Verify Backend Service Status

1. Go to Render Dashboard → **ventus-backend** service
2. Check the **Logs** tab for any errors:
   - Look for database connection errors
   - Check if the server started successfully
   - Verify it's listening on the correct port

3. Check the **Events** tab:
   - Ensure the service deployed successfully
   - Look for any build or deployment failures

### 3. Test Backend Health Endpoint

Once deployed, test the health endpoint:
```
https://ventus-backend.onrender.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "environment": "production",
  "port": 5000
}
```

### 4. Verify Backend URL in Frontend

The frontend is configured to use:
- Production: `https://ventus-backend.onrender.com/api/auth`
- Development: `/api/auth` (via proxy)

Make sure your backend service name matches `ventus-backend` in Render, or update the URL in `src/utils/authService.ts` line 17.

### 5. Check CORS Configuration

The backend allows requests from:
- `https://ventus-app.onrender.com`
- `https://ventus-travel-staging.onrender.com`
- Any `.onrender.com` subdomain

If your frontend URL is different, update the `allowedOrigins` array in `backend/server.js` (lines 16-20).

### 6. Database Connection Issues

If you see database connection errors:

1. **Verify DATABASE_URL format**:
   - Internal URL (same region): `postgresql://user:password@host:port/database`
   - External URL (different region): `postgresql://user:password@host:port/database?sslmode=require`

2. **Check SSL settings**:
   - Render databases usually require SSL
   - The code auto-detects this, but you can set `DATABASE_SSL=true` if needed

3. **Test database connection**:
   - Use the health endpoint: `/api/health`
   - Check logs for connection errors

### 7. Common Issues and Solutions

#### Issue: Backend service shows "Unavailable"
- **Solution**: Check logs for startup errors, verify environment variables are set

#### Issue: "Database connection failed"
- **Solution**: 
  - Verify `DATABASE_URL` is correct
  - Check database is running and accessible
  - Ensure SSL settings are correct

#### Issue: "CORS error" in browser console
- **Solution**: 
  - Add your frontend URL to `allowedOrigins` in `backend/server.js`
  - Or update the regex pattern to match your domain

#### Issue: "404 Not Found" when calling API
- **Solution**: 
  - Verify backend service is running
  - Check the service URL matches what frontend expects
  - Ensure routes are prefixed with `/api/`

#### Issue: Backend starts but immediately crashes
- **Solution**: 
  - Check logs for missing environment variables
  - Verify all dependencies are installed
  - Check for syntax errors in `server.js`

#### Issue: "nodemon: not found" when running `npm run dev` in Render shell
- **Problem**: `nodemon` is in `devDependencies` and Render's production installs skip dev dependencies
- **Solution**: 
  - **For production**: Use `npm start` instead (which uses `node server.js`)
  - **For debugging in shell**: Install dev dependencies first:
    ```bash
    npm install --include=dev
    npm run dev
    ```
  - **Note**: In production, Render automatically runs `npm start` as configured in `render.yaml`. You should only use `npm run dev` for local debugging in the shell.

### 8. Manual Testing

Test the backend API directly using curl or Postman:

```bash
# Health check
curl https://ventus-backend.onrender.com/api/health

# Login (example)
curl -X POST https://ventus-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### 9. Deployment Checklist

Before deploying, ensure:
- [ ] All environment variables are set in Render dashboard
- [ ] Database is created and accessible
- [ ] `render.yaml` has correct health check path
- [ ] Backend service name matches frontend configuration
- [ ] CORS origins include your frontend URL
- [ ] All npm dependencies are in `package.json`

### 10. Viewing Logs

To debug issues, check logs in Render:
1. Go to your service → **Logs** tab
2. Look for:
   - Server startup messages
   - Database connection status
   - Error messages
   - Request logs

## Still Having Issues?

1. **Check Render Status**: Visit https://status.render.com
2. **Review Logs**: Check both frontend and backend service logs
3. **Test Locally**: Run backend locally with production environment variables
4. **Verify URLs**: Ensure all URLs match between services

## Quick Fix Commands

If you need to restart services:
1. Render Dashboard → Your Service → Manual Deploy → Clear build cache & deploy
2. Or use Render CLI: `render services:restart ventus-backend`

