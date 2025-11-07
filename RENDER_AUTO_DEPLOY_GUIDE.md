# Render Auto-Deploy Setup Guide

This guide will help you set up automatic deployment from GitHub to Render.com for the Ventus Hotel Booking App.

## Prerequisites

✅ GitHub repository: `https://github.com/JizterBonza/ventus-app.git`  
✅ Repository is on `master` branch  
✅ `render.yaml` configuration file exists  
✅ Express.js server configured in `server.js`  

## Step 1: Sign Up/Log In to Render

1. Go to [https://render.com](https://render.com)
2. Sign up for a free account or log in if you already have one
3. **Recommended**: Sign up using your GitHub account for easier integration

## Step 2: Connect GitHub to Render

### If you signed up with GitHub:
- Your account is already connected ✅

### If you signed up with email:
1. Go to **Account Settings** → **Connected Accounts**
2. Click **Connect GitHub**
3. Authorize Render to access your GitHub repositories
4. Choose whether to grant access to:
   - **All repositories** (easier)
   - **Only select repositories** (select `ventus-app`)

## Step 3: Create a New Web Service

1. From your Render Dashboard, click **"New +"** button
2. Select **"Web Service"**
3. You'll see a list of your GitHub repositories

### Connect Your Repository:
1. Find **`JizterBonza/ventus-app`** in the list
2. Click **"Connect"** next to it

*If you don't see the repository:*
- Click **"Configure account"** 
- Grant Render access to the repository
- Refresh the page

## Step 4: Configure Your Web Service

Fill in the following settings:

### Basic Settings:
```
Name:               ventus-app
Region:             Oregon (US West) or closest to your users
Branch:             master
Runtime:            Node
```

### Build & Deploy Settings:
```
Build Command:      npm install && npm run build
Start Command:      npm run start:prod
```

### Environment:
```
NODE_ENV:           production
```

### Plan:
```
Instance Type:      Free (or choose paid plan for better performance)
```

### Advanced Settings (Optional but Recommended):
```
Auto-Deploy:        Yes (This enables auto-deploy!)
Health Check Path:  /health
```

## Step 5: Enable Auto-Deploy

**This is the key step for automatic deployment:**

1. In the web service configuration, look for **"Auto-Deploy"**
2. Make sure the toggle is set to **"Yes"** ✅
3. This means every push to the `master` branch will automatically trigger a deployment

## Step 6: Add Environment Variables (Optional)

If you need to add API keys or other sensitive data:

1. Scroll to **"Environment Variables"**
2. Click **"Add Environment Variable"**
3. Add any required variables:
   ```
   Key: NODE_ENV
   Value: production
   ```

## Step 7: Deploy

1. Review all settings
2. Click **"Create Web Service"**
3. Render will:
   - Clone your repository
   - Run `npm install && npm run build`
   - Start the server with `npm run start:prod`
   - Provide you with a live URL (e.g., `https://ventus-app.onrender.com`)

## Step 8: Verify Auto-Deploy is Working

### Test the Auto-Deploy Feature:

1. Make a small change to your local repository:
   ```bash
   # Example: Update README.md
   echo "\n## Updated via auto-deploy" >> README.md
   git add README.md
   git commit -m "Test auto-deploy"
   git push origin master
   ```

2. Go to your Render Dashboard
3. You should see a new deployment automatically starting
4. Watch the build logs in real-time

### Expected Behavior:
- ✅ Every push to `master` triggers a new deployment
- ✅ Build logs are visible in the Render dashboard
- ✅ If build succeeds, new version goes live automatically
- ✅ If build fails, previous version stays live

## Step 9: Monitor Deployments

### View Deployment History:
1. Go to your service in Render Dashboard
2. Click on **"Events"** tab
3. See all deployments with:
   - Commit message
   - Build status
   - Deployment time
   - Build logs

### View Live Logs:
1. Click on **"Logs"** tab
2. See real-time server logs
3. Monitor errors and requests

## Auto-Deploy Workflow

Here's what happens automatically:

```
1. You push code to GitHub master branch
   ↓
2. GitHub webhook notifies Render
   ↓
3. Render pulls latest code
   ↓
4. Runs: npm install && npm run build
   ↓
5. If build succeeds:
   - Stops old server
   - Starts new server with: npm run start:prod
   - Updates live URL
   ↓
6. If build fails:
   - Keeps previous version running
   - Sends notification (if configured)
```

## Configuration Files

Your project already has the necessary files:

### 1. `render.yaml` (Infrastructure as Code)
```yaml
services:
  - type: web
    name: ventus-app
    buildCommand: npm install && npm run build
    startCommand: npm run start:prod
    envVars:
      - key: NODE_ENV
        value: production
```

### 2. `package.json` Scripts
```json
{
  "scripts": {
    "start": "craco start",
    "build": "craco build",
    "serve": "node server.js",
    "start:prod": "node server.js"
  }
}
```

### 3. `server.js` (Production Server)
- Serves React build files
- Handles client-side routing
- Health check endpoint at `/health`
- Proper error handling

## Troubleshooting

### Issue: Auto-deploy not triggering

**Solution:**
1. Check **Service Settings** → **Auto-Deploy** is enabled
2. Verify GitHub webhook exists:
   - Go to GitHub repo → Settings → Webhooks
   - Should see a Render webhook
3. Check branch name matches (master vs main)

### Issue: Build failing

**Solution:**
1. Check build logs in Render dashboard
2. Common issues:
   - Missing dependencies in `package.json`
   - Build script errors
   - Node version mismatch
3. Test build locally: `npm run build`

### Issue: Deployment succeeds but app not working

**Solution:**
1. Check live logs for errors
2. Verify environment variables are set
3. Test health endpoint: `https://your-app.onrender.com/health`
4. Check CORS configuration for API calls

### Issue: Want to deploy from a different branch

**Solution:**
1. Go to **Service Settings**
2. Change **Branch** from `master` to your desired branch
3. Save changes

## Disabling Auto-Deploy

If you want to manually deploy:

1. Go to **Service Settings**
2. Set **Auto-Deploy** to **"No"**
3. Use **"Manual Deploy"** button to deploy when ready

## Manual Deploy Options

Even with auto-deploy enabled, you can manually deploy:

1. **Manual Deploy** button in dashboard
2. **Deploy Latest Commit** - deploys HEAD of selected branch
3. **Clear Build Cache & Deploy** - fresh build

## Rollback to Previous Version

If a deployment causes issues:

1. Go to **Events** tab
2. Find a previous successful deployment
3. Click **"Rollback to this version"**
4. Confirm rollback

## Notifications

Set up notifications for deployment events:

1. Go to **Service Settings** → **Notifications**
2. Add email addresses or Slack webhooks
3. Choose which events to notify:
   - Deployment started
   - Deployment succeeded
   - Deployment failed

## Custom Domain Setup (Optional)

1. Go to **Settings** → **Custom Domains**
2. Click **"Add Custom Domain"**
3. Enter your domain (e.g., `ventus.com`)
4. Follow DNS configuration instructions
5. SSL certificate is automatically provisioned

## Performance Optimization

### Free Tier Considerations:
- Services spin down after 15 minutes of inactivity
- First request after inactivity may be slow (cold start)
- Limited to 750 hours per month

### Paid Tier Benefits:
- Always-on services (no cold starts)
- Unlimited hours
- Better performance
- More resources

## Monitoring Your App

### Health Checks:
- Render automatically pings `/health` endpoint
- Configure in Service Settings
- Server must respond within timeout

### Metrics:
- CPU usage
- Memory usage
- Response times
- Error rates

## Best Practices

1. **Test locally before pushing:**
   ```bash
   npm run build
   npm run start:prod
   ```

2. **Use meaningful commit messages:**
   ```bash
   git commit -m "feat: add hotel search filtering"
   ```

3. **Create feature branches:**
   ```bash
   git checkout -b feature/new-feature
   # Make changes, test
   git push origin feature/new-feature
   # Create PR, merge to master (triggers deploy)
   ```

4. **Monitor deployments:**
   - Check build logs after each push
   - Test live site after deployment
   - Keep Render dashboard open during active development

5. **Environment variables:**
   - Never commit secrets to git
   - Use Render environment variables
   - Update in Render dashboard, not in code

## Useful Commands

```bash
# Check current branch
git branch --show-current

# Push to trigger deployment
git push origin master

# View recent commits
git log --oneline -5

# Check remote repository
git remote -v

# Pull latest changes
git pull origin master
```

## Support Resources

- **Render Documentation:** [https://render.com/docs](https://render.com/docs)
- **Render Community:** [https://community.render.com](https://community.render.com)
- **GitHub Webhook Docs:** [https://docs.github.com/en/webhooks](https://docs.github.com/en/webhooks)

## Summary

✅ **Auto-deploy is now configured!**

Every time you:
```bash
git add .
git commit -m "Your commit message"
git push origin master
```

Render will automatically:
1. Detect the push via GitHub webhook
2. Clone the latest code
3. Build the React app
4. Deploy to production
5. Update your live site

**Your live URL:** `https://ventus-app.onrender.com` (or your custom domain)

**No manual deployment needed!** 🎉

---

## Quick Reference Card

| Action | Command/Location |
|--------|-----------------|
| Enable auto-deploy | Service Settings → Auto-Deploy: Yes |
| View deployments | Events tab in dashboard |
| View logs | Logs tab in dashboard |
| Manual deploy | Manual Deploy button |
| Rollback | Events tab → Previous deployment → Rollback |
| Add env vars | Environment tab |
| Custom domain | Settings → Custom Domains |
| Health check | `/health` endpoint |

---

*Last Updated: November 7, 2025*

