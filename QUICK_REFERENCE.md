# EventSync Deployment Quick Reference

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Internet / GitHub                         │
└─────────────────┬──────────────────────┬────────────────────┘
                  │                      │
                  ▼                      ▼
        ┌─────────────────┐    ┌─────────────────┐
        │ Vercel          │    │ Railway         │
        │ (Frontend)      │    │ (Backend)       │
        │ Next.js         │    │ Node.js/Express │
        │ React 19        │    │ Socket.IO       │
        └────────┬────────┘    └────────┬────────┘
                 │                      │
                 │ NEXT_PUBLIC_API_URL  │
                 │ (hardcoded in build) │
                 │                      │
                 └──────────────────────│
                                        │
                         ┌──────────────┴──────────────┐
                         │    Railway PostgreSQL       │
                         │    Database                 │
                         └─────────────────────────────┘
```

## Files Created

| File | Purpose | Platform |
|------|---------|----------|
| `frontend/.env.local` | Local dev config | Your machine |
| `frontend/.env.production` | Production template | Reference only |
| `frontend/.env.example` | Template for team | Git repo |
| `backend/.env.local` | Local dev config | Your machine |
| `backend/.env.production` | Production template | Reference only |
| `backend/.env.example` | Template for team | Git repo |
| `vercel.json` | Vercel build config | Git repo |
| `railway.json` | Railway deploy config | Git repo |
| `.gitignore` | Git exclusions | Git repo |
| `DEPLOYMENT_GUIDE.md` | Step-by-step guide | Git repo |
| `DEPLOYMENT_CHECKLIST.md` | Deployment checklist | Git repo |
| `CONFIGURATION_GUIDE.md` | Config explanation | Git repo |

## Deployment Workflow

### Step 1: Backend on Railway ⚙️
```
1. Go to railway.app
2. New Project → Deploy from GitHub
3. Select backend/ folder
4. Add PostgreSQL
5. Set environment variables:
   - NODE_ENV=production
   - PORT=5000
   - FRONTEND_URL=(leave empty for now)
6. Deploy → Get URL
7. Copy URL: https://your-backend.railway.app
```

### Step 2: Frontend on Vercel 🎨
```
1. Go to vercel.com
2. Import Project
3. Select frontend/ root directory
4. Add environment variable:
   - NEXT_PUBLIC_API_URL=https://your-backend.railway.app
5. Deploy → Get URL
6. Copy URL: https://your-frontend.vercel.app
```

### Step 3: Connect Them 🔗
```
1. Go back to Railway dashboard
2. Update FRONTEND_URL=https://your-frontend.vercel.app
3. Redeploy backend
4. Test: Open frontend → Try login
5. Open DevTools (F12) → Check API calls work
```

## Environment Variables Reference

### Frontend (Vercel)
```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```
✅ Set in Vercel Dashboard → Settings → Environment Variables

### Backend (Railway)
```
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-frontend.vercel.app
DB_HOST=<Railway provides>
DB_PORT=5432
DB_USER=<Railway provides>
DB_PASSWORD=<Railway provides>
DB_NAME=eventsync
```
✅ Set in Railway Dashboard → Variables

## Quick Commands

### Local Development
```bash
# Terminal 1: Backend
cd backend && npm install && npm run dev
# Runs on http://localhost:5000

# Terminal 2: Frontend
cd frontend && npm install && npm run dev
# Runs on http://localhost:3000
```

### Test Connection
```bash
# In browser console (Vercel frontend)
fetch('https://your-backend.railway.app/api')
  .then(r => r.json())
  .then(console.log)
```

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| Frontend can't connect to backend | Check `NEXT_PUBLIC_API_URL` in Vercel |
| CORS error in console | Update `FRONTEND_URL` in Railway |
| Database won't connect | Verify Railway PostgreSQL is running |
| Socket.IO not working | Check WebSocket (wss://) in CSP headers |
| Build fails in Vercel | Check Vercel logs, ensure frontend/ is root dir |
| Build fails in Railway | Check Railway logs, ensure backend/ has package.json |

## Monitoring & Logs

### Railway Logs
```
Dashboard → Select Project → Deployments → View Logs
```
Look for:
- ✅ `[SERVER] Running successfully on port 5000`
- ❌ Database connection errors
- ❌ CORS errors

### Vercel Logs
```
Dashboard → Deployments → Select Deployment → View Log
```
Look for:
- ✅ `✓ Build completed`
- ❌ Build errors
- ❌ Missing environment variables

### Browser Console (Frontend)
```
Open frontend URL → F12 (DevTools) → Console tab
```
Look for:
- ✅ No red errors
- ❌ CORS errors
- ❌ 404 API errors

## Important URLs

```
Frontend (after Vercel deploy):
https://your-project.vercel.app

Backend (after Railway deploy):  
https://your-project.railway.app

Database (Railway managed):
No public URL - only accessible from Railway backend
```

## File Structure After Setup

```
EventSync-main/
├── .gitignore                    ← Updated
├── vercel.json                   ← New
├── railway.json                  ← New
├── DEPLOYMENT_GUIDE.md          ← New
├── DEPLOYMENT_CHECKLIST.md      ← New
├── CONFIGURATION_GUIDE.md       ← New
├── QUICK_REFERENCE.md          ← This file
│
├── frontend/
│   ├── .env.local               ← New (dev config)
│   ├── .env.production          ← New (template)
│   ├── .env.example             ← New (template)
│   ├── next.config.ts           ← Updated
│   └── ... (other files)
│
└── backend/
    ├── .env.local               ← New (dev config)
    ├── .env.production          ← New (template)
    ├── .env.example             ← New (template)
    ├── src/
    │   ├── server.js
    │   └── ... (other files)
    └── ... (other files)
```

## What NOT to Commit to Git

❌ `.env.local` - Contains your local secrets
❌ `.env.production` - Contains production secrets  
❌ `.env` - Any local env file
❌ `node_modules/` - Build dependencies
❌ `.next/` - Build output
❌ `.vercel/` - Vercel cache

✅ DO commit `.env.example` - For team reference

## Next Steps

1. ✅ Review this quick reference
2. ✅ Read `DEPLOYMENT_GUIDE.md` for detailed steps
3. ✅ Use `DEPLOYMENT_CHECKLIST.md` during deployment
4. ✅ Deploy backend to Railway
5. ✅ Deploy frontend to Vercel
6. ✅ Connect them (update env vars)
7. ✅ Test features
8. ✅ Monitor logs

## Support & Help

- **General Vercel Help**: https://vercel.com/docs
- **General Railway Help**: https://docs.railway.app
- **Node.js on Railway**: https://docs.railway.app/guides/nodejs
- **Next.js on Vercel**: https://vercel.com/docs/frameworks/nextjs

---

**Status**: ✅ Configuration files created and ready for deployment
**Last Updated**: April 2026
**Next Action**: Follow DEPLOYMENT_GUIDE.md steps
