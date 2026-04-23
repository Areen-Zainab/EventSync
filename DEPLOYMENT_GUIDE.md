# EventSync Deployment Guide

This guide covers deploying **Frontend on Vercel** and **Backend on Railway** with PostgreSQL.

---

## Prerequisites

- GitHub account with the EventSync repo pushed
- Vercel account (free tier available)
- Railway account (free tier available)
- PostgreSQL database (Railway provides this)

---

## Part 1: Backend Deployment to Railway

### Step 1: Connect Railway to GitHub

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Create a new project → "Deploy from GitHub"
4. Select your EventSync repository

### Step 2: Configure Backend in Railway

1. In Railway project dashboard, click "Add Service"
2. Select "GitHub Repo"
3. Configure the service:
   - **Root Directory**: `backend/`
   - **Start Command**: `npm install && npm start`

### Step 3: Add PostgreSQL Database

1. In Railway, click "Add Service" → "PostgreSQL"
2. Railway automatically creates a PostgreSQL instance
3. The database URL will be available as environment variable

### Step 4: Set Environment Variables in Railway

In Railway dashboard, go to Variables and add:

```
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-vercel-frontend.vercel.app
```

**Important**: Replace `your-vercel-frontend.vercel.app` with your actual Vercel domain (you'll get this in Part 2)

For Database, Railway provides these automatically:
- `DATABASE_URL` - Use this, or Railway creates individual vars
- Or manually add if needed:
  - `DB_HOST`
  - `DB_PORT`
  - `DB_USER`
  - `DB_PASSWORD`
  - `DB_NAME`

### Step 5: Deploy

1. Click "Deploy" - Railway will build and deploy automatically
2. Once deployed, Railway gives you the backend URL (e.g., `https://eventsync-backend-production.railway.app`)
3. **Copy this URL** - you'll need it for the frontend

---

## Part 2: Frontend Deployment to Vercel

### Step 1: Connect Vercel to GitHub

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Import Project"
4. Select your EventSync repository

### Step 2: Configure Frontend in Vercel

When importing, Vercel should auto-detect it's a Next.js project:
- **Project Name**: EventSync (or your choice)
- **Framework Preset**: Next.js
- **Root Directory**: `frontend/` (select this)
- **Build Command**: `npm run build` (should be auto-filled)
- **Start Command**: `npm start` (should be auto-filled)

### Step 3: Set Environment Variables

In Vercel dashboard for your project:

**Go to Settings → Environment Variables**

Add the backend URL from Railway:

```
NEXT_PUBLIC_API_URL=https://your-railway-backend-url.railway.app
```

Replace with your actual Railway backend URL from Part 1, Step 5.

### Step 4: Deploy

1. Click "Deploy"
2. Vercel will build and deploy automatically
3. Once deployed, you'll get your Vercel frontend URL (e.g., `https://eventsync-frontend.vercel.app`)
4. **Copy this URL**

---

## Part 3: Connect Frontend & Backend

### Update Backend CORS on Railway

1. Go back to Railway dashboard
2. Update `FRONTEND_URL` environment variable with your Vercel URL:
   ```
   FRONTEND_URL=https://your-vercel-frontend.vercel.app
   ```
3. Click "Deploy" to redeploy with new environment variable

### Update Frontend API URL (if needed)

If you need to change the backend URL later:
1. In Vercel dashboard, update `NEXT_PUBLIC_API_URL`
2. Redeploy

---

## Testing the Connection

### Test Backend

1. Go to your Railway backend URL: `https://your-backend.railway.app/api`
2. You should see the API response or a welcome message

### Test Frontend

1. Go to your Vercel frontend URL: `https://your-frontend.vercel.app`
2. Open browser DevTools (F12) → Console
3. Try logging in or navigating to check if API calls work

### Monitor Logs

**Railway Logs:**
- Dashboard → Deployments → View Logs

**Vercel Logs:**
- Dashboard → Deployments → Select deployment → View Log

---

## Environment Variables Summary

### Frontend (.env.production)
```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

### Backend (.env.production)
```
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-frontend.vercel.app
DB_HOST=<Railway PostgreSQL Host>
DB_PORT=5432
DB_USER=<Railway PostgreSQL User>
DB_PASSWORD=<Railway PostgreSQL Password>
DB_NAME=eventsync
```

---

## Troubleshooting

### Frontend can't connect to backend
- Check `NEXT_PUBLIC_API_URL` in Vercel is correct
- Verify backend `FRONTEND_URL` CORS is set to your Vercel domain
- Check Railway logs for errors

### Database connection fails
- Verify `DATABASE_URL` or individual DB vars in Railway
- Check database is running in Railway
- Run `setup-notifications-db.js` in Railway if schema isn't initialized

### Socket.IO not connecting
- Ensure backend `FRONTEND_URL` matches your frontend domain
- Check Socket.IO CORS settings in `backend/src/server.js`

### Deployment fails
- Check logs in Railway/Vercel dashboards
- Ensure `package.json` scripts are correct
- Verify root directories are set correctly

---

## Local Development

Before deploying, test locally:

```bash
# Terminal 1: Backend
cd backend
npm install
npm run dev

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

---

## Optional: Custom Domain

Once everything works, add a custom domain:

**Vercel:**
1. Settings → Domains → Add custom domain

**Railway:**
1. Settings → Domain → Add custom domain

---

## Next Steps

- Monitor both deployments for errors
- Set up CI/CD for automatic deployments on push
- Consider adding monitoring/alerts (Sentry, LogRocket)
- Test all features (auth, real-time chat, notifications)
