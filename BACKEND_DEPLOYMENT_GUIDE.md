# 🚀 Backend Deployment Guide - Quick Start

This guide will help you deploy the Ventus backend to Render.com in 10 minutes.

---

## 📋 Prerequisites

- ✅ GitHub repository: `ventus-app` is connected to Render
- ✅ PostgreSQL database already created on Render
- ✅ You have the internal database URL

---

## 🎯 Step-by-Step: Deploy Backend

### Step 1: Create New Web Service

1. **Go to Render Dashboard:** [https://dashboard.render.com](https://dashboard.render.com)
2. **Click "New +"** → **"Web Service"**

### Step 2: Connect GitHub Repository

1. **Find your repository:** `ventus-app`
2. **Click "Connect"** next to it

### Step 3: Configure Backend Service

Fill in these settings:

```
Name:               ventus-backend
Region:             Oregon (US West) - or same as your database
Branch:             master
Root Directory:     backend
Runtime:            Node
Build Command:      npm install
Start Command:      npm start
Plan:               Free (or paid for production)
Auto-Deploy:        Yes
```

### Step 4: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add these **3 environment variables**:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://ventus_database_user:GA2Fi8db98gIW0GmZ6f7U6lIkORDnNzs@dpg-d46q1t8gjchc73ekv27g-a/ventus_database` |
| `JWT_SECRET` | `your-secret-key-12345` |
| `NODE_ENV` | `production` |

**Important Notes:**
- Use the **Internal Database URL** (provided above)
- The `DATABASE_URL` is the internal connection string from your PostgreSQL database
- `JWT_SECRET` should be changed to a more secure value in production

### Step 5: Create Web Service

1. **Review all settings**
2. **Click "Create Web Service"**
3. **Wait for deployment** (~3-5 minutes)

---

## ✅ Verify Deployment

### 1. Check Backend Health

Once deployed, test the health endpoint:

```bash
curl https://ventus-backend.onrender.com/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-07T...",
  "database": "connected"
}
```

### 2. Initialize Database Schema

After backend is deployed, initialize the database:

1. **Go to your backend service** in Render dashboard
2. **Click "Shell"** tab
3. **Run:**
   ```bash
   npm run init-db
   ```

**Expected output:**
```
=== Initializing Database ===
Dropping existing users table if exists...
Creating users table...
Creating index on email...
✓ Database initialized successfully!
```

### 3. Test Authentication

Test signup endpoint:

```bash
curl -X POST https://ventus-backend.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

---

## 🔗 Service URLs

After deployment:

| Service | URL | Purpose |
|---------|-----|---------|
| Backend API | `https://ventus-backend.onrender.com` | Authentication server |
| Health Check | `https://ventus-backend.onrender.com/api/health` | Check backend status |
| Database | Internal only | PostgreSQL |

---

## 📝 API Endpoints

Your backend provides these endpoints:

- `GET  /api/health` - Health check
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET  /api/auth/verify` - Verify token (requires auth)
- `GET  /api/auth/user` - Get current user (requires auth)
- `POST /api/auth/logout` - Logout (requires auth)

---

## 🔧 Configuration Summary

**Root Directory:** `backend`  
**Build Command:** `npm install`  
**Start Command:** `npm start`  
**Port:** Auto-configured by Render (default: 10000)

**Environment Variables:**
- ✅ `DATABASE_URL` - PostgreSQL connection string
- ✅ `JWT_SECRET` - Secret key for JWT tokens
- ✅ `NODE_ENV` - Set to `production`

---

## 🐛 Troubleshooting

### Backend Won't Start

**Check:**
1. Build logs in Render dashboard
2. Verify `DATABASE_URL` is correct (use internal URL)
3. Check `JWT_SECRET` is set
4. Verify `Root Directory` is set to `backend`

### Database Connection Failed

**Solutions:**
1. Use **Internal Database URL** (not external)
2. Verify database service is running
3. Check `DATABASE_URL` environment variable is set correctly
4. Ensure database was created in the same region

### Build Fails

**Common Issues:**
- Missing dependencies in `backend/package.json`
- Node version mismatch
- Build command incorrect

**Solution:**
- Check build logs for specific error
- Verify `backend/package.json` has all dependencies
- Ensure `Root Directory` is set to `backend`

---

## 🔄 Updating Backend

After making changes:

1. **Commit and push:**
   ```bash
   git add .
   git commit -m "update: backend changes"
   git push origin master
   ```

2. **Auto-deploy will trigger** (~3-5 minutes)

3. **Check deployment status** in Render dashboard

---

## 🔒 Security Notes

- ✅ Passwords are hashed with bcrypt
- ✅ JWT tokens expire after 7 days
- ✅ HTTPS is automatically enabled by Render
- ⚠️ **Change `JWT_SECRET` to a secure random string in production**
- ⚠️ Never commit `.env` files to git

---

## 📚 Next Steps

After backend is deployed:

1. ✅ Initialize database schema (`npm run init-db`)
2. ✅ Test authentication endpoints
3. ✅ Update frontend to use backend URL
4. ✅ Deploy frontend (if not already done)

See `POSTGRES_RENDER_SETUP.md` for complete deployment guide.

---

## 💡 Quick Reference

| Action | Location |
|--------|----------|
| View logs | Backend service → Logs tab |
| Run commands | Backend service → Shell tab |
| Update env vars | Backend service → Environment tab |
| View deployments | Backend service → Events tab |

---

*Last Updated: November 7, 2025*  
*Ready to deploy! 🚀*
