# EventSync Deployment Checklist

Complete this checklist to deploy EventSync to Vercel (Frontend) + Railway (Backend).

---

## Phase 1: Preparation

- [ ] Code is pushed to GitHub
- [ ] `.env.local` files are in `.gitignore` (they won't be committed)
- [ ] Backend is tested locally (`npm run dev` in `backend/`)
- [ ] Frontend is tested locally (`npm run dev` in `frontend/`)
- [ ] Read [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

## Phase 2: Railway Backend Deployment

### Setup Railway Account & Database
- [ ] Create Railway account at railway.app
- [ ] Create new Railway project
- [ ] Connect to GitHub repository
- [ ] Add PostgreSQL database service
- [ ] Set backend root directory to `backend/`

### Configure Environment Variables in Railway
- [ ] `NODE_ENV=production`
- [ ] `PORT=5000`
- [ ] `FRONTEND_URL=` (leave empty for now, update after Vercel deployment)
- [ ] Database variables (Railway provides these automatically):
  - [ ] `DB_HOST`
  - [ ] `DB_PORT`
  - [ ] `DB_USER`
  - [ ] `DB_PASSWORD`
  - [ ] `DB_NAME`

### Deploy Backend
- [ ] Click "Deploy" in Railway
- [ ] Wait for deployment to complete
- [ ] **Copy Railway backend URL** (e.g., `https://eventsync-backend-production.railway.app`)
- [ ] Test backend: Visit `https://your-backend-url/api` (should respond)

### Initialize Database (if needed)
- [ ] SSH into Railway container OR use Railway CLI to run setup script
- [ ] Or ensure schema is created during application startup

---

## Phase 3: Vercel Frontend Deployment

### Setup Vercel Project
- [ ] Create Vercel account at vercel.com
- [ ] Import GitHub repository
- [ ] Select `frontend/` as root directory
- [ ] Vercel should auto-detect Next.js framework

### Configure Environment Variables in Vercel
- [ ] `NEXT_PUBLIC_API_URL=` (use Railway backend URL from Phase 2)

### Deploy Frontend
- [ ] Click "Deploy" in Vercel
- [ ] Wait for deployment to complete
- [ ] **Copy Vercel frontend URL** (e.g., `https://eventsync.vercel.app`)
- [ ] Test frontend loads (should see login page)

---

## Phase 4: Connect Frontend & Backend

### Update Backend CORS
- [ ] Go back to Railway dashboard
- [ ] Update `FRONTEND_URL` environment variable with Vercel URL from Phase 3
- [ ] Redeploy backend with new environment variable
- [ ] Wait for deployment

### Verify API Connection
- [ ] Open frontend in browser (Vercel URL)
- [ ] Open DevTools (F12) → Console tab
- [ ] Try login or navigate to dashboard
- [ ] Check if API calls work (no CORS errors)
- [ ] If errors appear, check both `FRONTEND_URL` (backend) and `NEXT_PUBLIC_API_URL` (frontend)

---

## Phase 5: Testing

### Test Authentication
- [ ] Sign up with new account
- [ ] Login with credentials
- [ ] Logout
- [ ] Token is stored/cleared properly

### Test Core Features
- [ ] Create an event
- [ ] Add team members to event
- [ ] Send chat messages (real-time updates)
- [ ] Create tasks from chat
- [ ] Update task status
- [ ] Receive notifications

### Test Real-Time Features
- [ ] Open app in multiple browser tabs
- [ ] Send chat message in one tab
- [ ] Verify message appears in other tabs instantly
- [ ] Update task status - should reflect immediately

### Check Logs for Errors
- [ ] Railway logs: No database connection errors
- [ ] Railway logs: No CORS errors
- [ ] Vercel logs: No 404 or API connection errors
- [ ] Browser console: No unhandled errors

---

## Phase 6: Post-Deployment

### Monitoring
- [ ] Set up Railway monitoring/alerts
- [ ] Set up Vercel error tracking (optional: Sentry integration)
- [ ] Review both dashboards weekly for errors

### Optional Enhancements
- [ ] Add custom domain (instead of railway.app/vercel.app)
- [ ] Enable auto-redeploy on GitHub push
- [ ] Set up staging environment for testing

### Scaling Considerations
- [ ] Monitor Railway resource usage
- [ ] Consider upgrading if hitting limits
- [ ] Set up database backups

---

## Troubleshooting

If deployment fails, check:

1. **Frontend won't load**
   - Vercel build logs for errors
   - Check `NEXT_PUBLIC_API_URL` is set correctly
   
2. **API calls fail (CORS errors)**
   - Verify `FRONTEND_URL` in Railway matches Vercel domain exactly
   - Check backend CORS middleware in `src/app.js`
   - Verify `NEXT_PUBLIC_API_URL` in Vercel is correct
   
3. **Database connection fails**
   - Verify Railway PostgreSQL is running
   - Check DB credentials in Railway environment variables
   - Ensure database schema is initialized
   
4. **Real-time (Socket.IO) doesn't work**
   - Check `FRONTEND_URL` CORS setting in Railway
   - Verify Socket.IO is properly configured in backend
   - Check WebSocket support (Vercel/Railway support it)

---

## Deployment URLs

Once complete, add these to your notes:

- **Frontend (Vercel)**: `https://`
- **Backend (Railway)**: `https://`
- **Custom Domain (Optional)**: `https://`

---

## Quick Reference: Environment Variables

### Frontend (.env.production on Vercel)
```
NEXT_PUBLIC_API_URL=https://your-railway-backend.railway.app
```

### Backend (.env.production on Railway)
```
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-vercel-frontend.vercel.app
DB_HOST=<Railway provides>
DB_PORT=5432
DB_USER=<Railway provides>
DB_PASSWORD=<Railway provides>
DB_NAME=eventsync
```

---

## Need Help?

- Read [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed steps
- Check Railway documentation: https://docs.railway.app
- Check Vercel documentation: https://vercel.com/docs
- Review backend logs: Railway Dashboard → Deployments → Logs
- Review frontend logs: Vercel Dashboard → Deployments → View Log
