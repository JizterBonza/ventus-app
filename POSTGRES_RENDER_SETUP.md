# PostgreSQL + Backend + Frontend on Render - Complete Setup Guide

This guide will help you deploy the complete Ventus app stack on Render.com with PostgreSQL database, Node.js backend API, and React frontend.

---

## 📋 What We're Deploying

```
┌─────────────────────────────────────────┐
│         Render.com Platform             │
├─────────────────────────────────────────┤
│  1. PostgreSQL Database                 │
│     - User authentication data          │
│     - Persistent storage                │
│                                         │
│  2. Backend API (Node.js + Express)     │
│     - Authentication endpoints          │
│     - JWT token management              │
│     - Connected to PostgreSQL           │
│                                         │
│  3. Frontend (React + Static Hosting)   │
│     - Hotel booking UI                  │
│     - Connects to backend API           │
│     - Auto-deploy from GitHub           │
└─────────────────────────────────────────┘
```

---

## 🚀 Step-by-Step Deployment

### Step 1: Prepare Your Repository

1. **Ensure all code is committed:**
   ```bash
   git status
   git add .
   git commit -m "feat: add backend with PostgreSQL integration"
   git push origin master
   ```

2. **Verify file structure:**
   ```
   ventus-app/
   ├── backend/
   │   ├── server.js
   │   ├── init-db.js
   │   ├── package.json
   │   └── .gitignore
   ├── src/           (React frontend)
   ├── public/
   ├── package.json
   └── render.yaml
   ```

---

### Step 2: Create PostgreSQL Database on Render

1. **Log into Render:** [https://render.com](https://render.com)

2. **Create New PostgreSQL Database:**
   - Click **"New +"** → **"PostgreSQL"**
   
3. **Configure Database:**
   ```
   Name:               ventus-database
   Database:           ventus_db
   User:               (auto-generated)
   Region:             Oregon (US West) - same as your services
   PostgreSQL Version: 15 (or latest)
   Plan:               Free (or paid for production)
   ```

4. **Create Database**
   - Click **"Create Database"**
   - Wait for database to be provisioned (~2 minutes)

5. **Copy Connection Details:**
   Once created, go to database page and copy:
   - **Internal Database URL** (for backend connection)
   - **External Database URL** (for local testing)

   Format: `postgresql://user:password@host:port/database`

---

### Step 3: Deploy Backend API

1. **Create New Web Service:**
   - Click **"New +"** → **"Web Service"**
   - Connect to your GitHub repository: `ventus-app`

2. **Configure Backend Service:**
   ```
   Name:               ventus-backend
   Region:             Oregon (US West)
   Branch:             master
   Root Directory:     backend
   Runtime:            Node
   Build Command:      npm install
   Start Command:      node server.js
   Plan:               Free (or paid)
   ```

3. **Add Environment Variables:**
   Click **"Advanced"** → **"Add Environment Variable"**
   
   Add these variables:
   
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | `postgresql://ventus_database_user:GA2Fi8db98gIW0GmZ6f7U6lIkORDnNzs@dpg-d46q1t8gjchc73ekv27g-a/ventus_database` |
   | `JWT_SECRET` | `your-secret-key-12345` |
   | `NODE_ENV` | `production` |
   
   **Note:** The `DATABASE_URL` above is the internal database URL. Use this exact value for the backend service.

4. **Create Web Service**
   - Click **"Create Web Service"**
   - Wait for build and deployment (~3-5 minutes)

5. **Note Your Backend URL:**
   - Once deployed, copy the URL (e.g., `https://ventus-backend.onrender.com`)
   - You'll need this for the frontend

---

### Step 4: Initialize Database Schema

1. **Connect to your backend service:**
   - Go to your backend service in Render dashboard
   - Click **"Shell"** tab (or use Render Shell feature)

2. **Run database initialization:**
   ```bash
   npm run init-db
   ```

   This will:
   - Create the `users` table
   - Set up indexes
   - Prepare database for authentication

   **Expected output:**
   ```
   === Initializing Database ===
   Dropping existing users table if exists...
   Creating users table...
   Creating index on email...
   ✓ Database initialized successfully!
   ```

   **Alternative: Run locally with External Database URL**
   ```bash
   cd backend
   # Create .env file
   echo "DATABASE_URL=<paste-external-database-url-here>" > .env
   npm install
   npm run init-db
   ```

---

### Step 5: Deploy Frontend

1. **Update Frontend Environment:**
   
   **Option A: Update directly in code** (already done)
   - Frontend `authService.ts` is configured to use:
     - Production: `https://ventus-backend.onrender.com/api/auth`
     - Development: `http://localhost:5000/api/auth`

   **Option B: Use environment variable**
   - Update `src/utils/authService.ts` if your backend URL is different
   - Or set `REACT_APP_AUTH_API_URL` in Render environment

2. **Create Frontend Web Service:**
   - Click **"New +"** → **"Web Service"**
   - Connect to same GitHub repository: `ventus-app`

3. **Configure Frontend Service:**
   ```
   Name:               ventus-app
   Region:             Oregon (US West)
   Branch:             master
   Root Directory:     (leave empty - root)
   Runtime:            Node
   Build Command:      npm install && npm run build
   Start Command:      npm run start:prod
   Plan:               Free (or paid)
   ```

4. **Add Environment Variables (Optional):**
   
   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `REACT_APP_AUTH_API_URL` | `https://ventus-backend.onrender.com/api/auth` |

5. **Enable Auto-Deploy:**
   - Ensure **"Auto-Deploy"** is set to **"Yes"**
   - This enables automatic deployment on git push

6. **Create Web Service**
   - Click **"Create Web Service"**
   - Wait for build and deployment (~5-7 minutes)

---

### Step 6: Update Backend URL in Frontend (If Needed)

If your backend URL is different from `https://ventus-backend.onrender.com`:

1. **Update `src/utils/authService.ts`:**
   ```typescript
   const AUTH_API_URL = process.env.REACT_APP_AUTH_API_URL || 
     (process.env.NODE_ENV === 'production' 
       ? 'https://YOUR-ACTUAL-BACKEND-URL.onrender.com/api/auth'
       : 'http://localhost:5000/api/auth');
   ```

2. **Commit and push:**
   ```bash
   git add src/utils/authService.ts
   git commit -m "update: configure backend URL for production"
   git push origin master
   ```

3. **Wait for auto-deploy** (~3-5 minutes)

---

## ✅ Verification & Testing

### Test Backend API

1. **Health Check:**
   ```bash
   curl https://ventus-backend.onrender.com/api/health
   ```
   
   Expected response:
   ```json
   {
     "status": "ok",
     "timestamp": "2025-11-07T...",
     "database": "connected"
   }
   ```

2. **Test Signup:**
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

### Test Frontend

1. **Open your frontend URL:**
   - Go to `https://ventus-app.onrender.com` (or your URL)

2. **Test Signup:**
   - Click **"Sign Up"**
   - Fill in the form
   - Click **"Create Account"**
   - Should see success and be logged in

3. **Test Login:**
   - Logout if logged in
   - Click **"Login"**
   - Enter credentials from signup
   - Should successfully log in

4. **Test Protected Routes:**
   - Try accessing `/booking/123`
   - Should require login if not authenticated
   - Should access if authenticated

---

## 🔧 Local Development with Production Database

Want to test locally with the production database?

1. **Get External Database URL** from Render dashboard

2. **Create `backend/.env`:**
   ```env
   DATABASE_URL=postgresql://user:password@host:port/ventus_db
   JWT_SECRET=your-jwt-secret
   NODE_ENV=development
   PORT=5000
   ```

3. **Start backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

4. **Start frontend:**
   ```bash
   # In root directory
   npm start
   ```

5. **Frontend will connect to local backend** (http://localhost:5000)

---

## 📊 Service URLs Summary

After deployment, you'll have:

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | `https://ventus-app.onrender.com` | React app |
| Backend | `https://ventus-backend.onrender.com` | API server |
| Database | Internal connection only | PostgreSQL |

**API Endpoints:**
- `GET  /api/health` - Health check
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET  /api/auth/verify` - Verify token
- `GET  /api/auth/user` - Get current user
- `POST /api/auth/logout` - Logout

---

## 🔒 Security Checklist

Before going live:

- [ ] Change `JWT_SECRET` to a secure random string
- [ ] Verify database connection uses SSL
- [ ] Test authentication flow end-to-end
- [ ] Verify protected routes work correctly
- [ ] Test CORS is properly configured
- [ ] Check error messages don't expose sensitive data
- [ ] Verify passwords are properly hashed
- [ ] Test token expiration (7 days default)

---

## 🐛 Troubleshooting

### Backend Deployment Failed

**Check build logs:**
1. Go to backend service → **"Logs"** tab
2. Look for errors in build process
3. Common issues:
   - Missing dependencies in `package.json`
   - Database connection issues
   - Port binding errors

**Solutions:**
- Verify `backend/package.json` has all dependencies
- Check `DATABASE_URL` environment variable is set
- Ensure `PORT` is set or defaults to 10000

### Database Connection Errors

**Error: "Error connecting to the database"**

**Solutions:**
1. Verify `DATABASE_URL` is set correctly in backend environment
2. Use **Internal Database URL** (not external)
3. Check database is running in Render dashboard
4. Verify SSL settings match environment

### Frontend Can't Connect to Backend

**Error: "Failed to fetch" or CORS errors**

**Solutions:**
1. Check backend URL is correct in `authService.ts`
2. Verify backend service is running
3. Test backend health endpoint directly
4. Check browser console for actual error
5. Verify CORS is enabled in backend (`cors` middleware)

### Authentication Not Working

**Issue: Can't login or signup**

**Solutions:**
1. Check backend logs for errors
2. Verify database was initialized (`npm run init-db`)
3. Test API endpoints directly with curl
4. Check JWT_SECRET is set
5. Verify password meets requirements (6+ chars)

### Auto-Deploy Not Triggering

**Solutions:**
1. Check "Auto-Deploy" is enabled in service settings
2. Verify GitHub webhook exists (Settings → Webhooks)
3. Make sure changes are pushed to correct branch (`master`)
4. Check for build errors in previous deployments

---

## 💰 Render Free Tier Limits

**PostgreSQL:**
- 1 GB storage
- 90 days of data retention
- Expires after 90 days on free tier

**Web Services (Frontend + Backend):**
- 750 hours/month shared across services
- Services spin down after 15 min inactivity
- Cold start delay (~30 seconds)

**Recommendations:**
- **For production:** Upgrade to paid tier ($7/month per service)
- **For development:** Free tier is perfect for testing

---

## 🔄 Updates & Maintenance

### Deploying Updates

1. **Make changes locally**
2. **Commit and push:**
   ```bash
   git add .
   git commit -m "your changes"
   git push origin master
   ```
3. **Automatic deployment:**
   - Frontend redeploys automatically
   - Backend redeploys automatically
   - No manual intervention needed! 🎉

### Database Migrations

When adding new tables or columns:

1. **Create migration script** in `backend/migrations/`
2. **Run on production:**
   - Use Render Shell
   - Or connect via external URL and run locally

### Monitoring

**Check Service Health:**
- Render Dashboard → Your Service → **"Logs"**
- Monitor requests and errors
- Set up notifications for deployments

**Check Database:**
- Render Dashboard → Database → **"Metrics"**
- Monitor connections and storage usage

---

## 📚 Additional Resources

- **Render Documentation:** [https://render.com/docs](https://render.com/docs)
- **PostgreSQL Docs:** [https://www.postgresql.org/docs/](https://www.postgresql.org/docs/)
- **Express.js Guide:** [https://expressjs.com/](https://expressjs.com/)
- **JWT Documentation:** [https://jwt.io/](https://jwt.io/)

---

## 🎉 Success!

Your complete stack is now deployed:

✅ **PostgreSQL Database** - Persistent user storage  
✅ **Backend API** - Authentication server  
✅ **React Frontend** - User interface  
✅ **Auto-Deploy** - Updates automatically from GitHub

**Next Steps:**
1. Test all authentication features
2. Share your live URL with users
3. Monitor logs and performance
4. Consider upgrading to paid tier for production use

---

*Last Updated: November 7, 2025*

