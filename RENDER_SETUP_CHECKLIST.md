# Render Auto-Deploy Setup Checklist

Use this checklist to quickly set up auto-deployment for ventus-app on Render.

## ☐ Pre-Setup Checklist

- [x] GitHub repository created: `https://github.com/JizterBonza/ventus-app.git`
- [x] Code is on `master` branch
- [x] `render.yaml` exists
- [x] `server.js` exists
- [x] `package.json` has correct scripts
- [ ] All changes committed and pushed to GitHub

## ☐ Render Account Setup

- [ ] Create Render account at [render.com](https://render.com)
- [ ] Connect GitHub account to Render
- [ ] Grant Render access to `ventus-app` repository

## ☐ Create Web Service

- [ ] Click "New +" → "Web Service"
- [ ] Select `JizterBonza/ventus-app` repository
- [ ] Click "Connect"

## ☐ Configure Service Settings

### Basic Configuration
- [ ] **Name:** `ventus-app`
- [ ] **Branch:** `master`
- [ ] **Runtime:** Node
- [ ] **Region:** Oregon (US West) or preferred

### Build Settings
- [ ] **Build Command:** `npm install && npm run build`
- [ ] **Start Command:** `npm run start:prod`

### Auto-Deploy (IMPORTANT!)
- [ ] **Auto-Deploy:** Set to **YES** ✅

### Environment Variables
- [ ] **NODE_ENV:** `production`

### Advanced Settings (Optional)
- [ ] **Health Check Path:** `/health`

## ☐ Deploy

- [ ] Review all settings
- [ ] Click "Create Web Service"
- [ ] Wait for initial deployment to complete
- [ ] Note your live URL: `https://ventus-app.onrender.com`

## ☐ Test Auto-Deploy

- [ ] Make a test commit:
  ```bash
  echo "\n## Test auto-deploy" >> README.md
  git add README.md
  git commit -m "test: verify auto-deploy"
  git push origin master
  ```
- [ ] Check Render dashboard for new deployment
- [ ] Verify deployment completes successfully
- [ ] Visit live URL to confirm changes

## ☐ Post-Setup

- [ ] Set up deployment notifications (optional)
- [ ] Configure custom domain (optional)
- [ ] Test `/health` endpoint
- [ ] Share live URL with team
- [ ] Document live URL in project README

## Verification

✅ Auto-deploy is working when:
- Pushing to `master` triggers automatic deployment
- Build logs appear in Render dashboard
- Live site updates after successful deployment
- Failed builds don't affect live site

## Quick Commands

```bash
# Push changes (triggers auto-deploy)
git add .
git commit -m "your message"
git push origin master

# Check current branch
git branch --show-current

# View commit history
git log --oneline -5
```

## Need Help?

📖 **Full Guide:** See `RENDER_AUTO_DEPLOY_GUIDE.md`  
🌐 **Render Docs:** https://render.com/docs  
💬 **Support:** https://community.render.com

---

## Expected Deployment Time

| Phase | Duration |
|-------|----------|
| Initial setup | 5-10 minutes |
| First deployment | 3-5 minutes |
| Subsequent deployments | 2-3 minutes |
| Cold start (free tier) | 30-60 seconds |

---

*Ready to deploy? Start with the first checkbox!* ✨

