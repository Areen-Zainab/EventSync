# Configuration Files Summary

This document explains all the configuration files created for Vercel + Railway deployment.

---

## Frontend Configuration Files

### `frontend/.env.local`
**Purpose**: Local development environment variables  
**Used by**: Development (`npm run dev`)  
**Contents**:
- `NEXT_PUBLIC_API_URL=http://localhost:5000` - Points to local backend

### `frontend/.env.production`
**Purpose**: Production environment variables template  
**Used by**: Vercel deployment  
**Contents**:
- `NEXT_PUBLIC_API_URL=https://your-railway-backend.railway.app` - Points to Railway backend

**Note**: This file is a template. In Vercel, set the actual URL via dashboard:
1. Vercel dashboard → Settings → Environment Variables
2. Add `NEXT_PUBLIC_API_URL` with your Railway backend URL
3. Vercel will use this value during builds

### `frontend/.env.example`
**Purpose**: Template for developers  
**Used by**: Reference only  
**Contents**: Example env vars structure for new team members

---

## Backend Configuration Files

### `backend/.env.local`
**Purpose**: Local development environment variables  
**Used by**: Development (`npm run dev`)  
**Contents**:
- Database connection (localhost PostgreSQL)
- `FRONTEND_URL=http://localhost:3000`
- Optional email config for testing

### `backend/.env.production`
**Purpose**: Production environment variables template  
**Used by**: Railway deployment  
**Contents**:
- `NODE_ENV=production`
- `FRONTEND_URL=https://your-vercel-frontend.vercel.app`
- Database connection variables (Railway provides these)

**Note**: This file is a template. In Railway, set vars via dashboard:
1. Railway dashboard → Variables
2. Add each variable with actual values
3. Railway will inject them during runtime

### `backend/.env.example`
**Purpose**: Template for developers  
**Used by**: Reference only  
**Contents**: Example env vars structure

---

## Root Configuration Files

### `vercel.json`
**Purpose**: Tells Vercel how to build and serve your Next.js frontend  
**Used by**: Vercel deployment  
**Contents**:
```json
{
  "version": 2,
  "buildCommand": "cd frontend && npm run build",
  "devCommand": "cd frontend && npm run dev", 
  "outputDirectory": "frontend/.next",
  "installCommand": "npm install --prefix ./frontend"
}
```

**Why it's needed**: Your frontend is in a subfolder. Vercel uses this to know:
- Where to find the Next.js project (`frontend/`)
- How to build it (`npm run build`)
- Where the output goes (`.next/`)

### `railway.json`
**Purpose**: Tells Railway how to build and start your backend  
**Used by**: Railway deployment  
**Contents**:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "startCommand": "npm install && npm start",
    "restartPolicyMaxRetries": 5
  }
}
```

**Why it's needed**: Railway uses this to:
- Install dependencies
- Start your Express server
- Restart on failures

### `.gitignore` (Updated)
**Purpose**: Prevents committing sensitive files to GitHub  
**Contains**: 
- `.env` files (all variants)
- `node_modules/`
- Build outputs (`.next/`, `dist/`)
- IDE files (`.vscode/`, `.idea/`)
- OS files (`.DS_Store`, `Thumbs.db`)

**Important**: Never commit `.env.local` or `.env.production` files with real credentials!

---

## Deployment Configuration Files

### `DEPLOYMENT_GUIDE.md`
**Purpose**: Step-by-step deployment instructions  
**Covers**:
- Connecting Railway to GitHub
- Setting up PostgreSQL on Railway
- Deploying backend to Railway
- Importing project to Vercel
- Setting environment variables
- Testing the connection
- Troubleshooting common issues

**Read this first!** Follow the 3 parts:
1. Backend on Railway
2. Frontend on Vercel  
3. Connect them together

### `DEPLOYMENT_CHECKLIST.md`
**Purpose**: Checklist to ensure nothing is missed during deployment  
**Covers**:
- Pre-deployment checks
- Phase-by-phase deployment steps
- Testing procedures
- Post-deployment monitoring

**Use this during deployment** to track progress and avoid mistakes.

---

## Updated Configuration Files

### `frontend/next.config.ts` (Updated)
**Changes**:
- Updated CSP (Content Security Policy) to allow `wss:` (WebSocket Secure)
- Changed `connect-src` to include `https: wss:` instead of just `http://localhost:5000`
- Allows both localhost dev and production HTTPS connections

**Why**: Enables:
- Socket.IO real-time connections in production
- CORS headers for API calls to production backend

### `.gitignore` (Updated)
**Changes**:
- More comprehensive environment variable patterns
- Better organization with comments
- Covers all common build outputs and IDE files

---

## How Environment Variables Work

### Local Development
```
frontend/.env.local
  ↓
npm run dev (frontend reads this)
  ↓
Connects to http://localhost:5000

backend/.env.local
  ↓
npm run dev (backend reads this)
  ↓
Connects to localhost PostgreSQL
```

### Production (Vercel + Railway)
```
Vercel Dashboard → Environment Variables
  ↓
Vercel reads NEXT_PUBLIC_API_URL during build
  ↓
Frontend hardcodes Railway backend URL in bundle

Railway Dashboard → Variables
  ↓
Railway injects FRONTEND_URL at runtime
  ↓
Backend CORS middleware allows Vercel domain
```

---

## Variable Substitution Guide

Replace these placeholders with actual values:

### After Railway Deployment
- `your-railway-backend-url.railway.app` → Your actual Railway URL
- `your_railway_db_host` → Railway provides `DB_HOST`
- `your_railway_db_user` → Railway provides `DB_USER`
- `your_railway_db_password` → Railway provides `DB_PASSWORD`

### After Vercel Deployment
- `your-vercel-frontend.vercel.app` → Your actual Vercel URL
- Update backend's `FRONTEND_URL` in Railway dashboard

---

## Quick Start Commands

### Local Testing
```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend  
npm run dev

# Access
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
```

### Production URLs
- Frontend: `https://your-project.vercel.app`
- Backend: `https://your-project.railway.app`
- Database: Managed by Railway (no public URL needed)

---

## Security Notes

⚠️ **Never commit or share**:
- `.env.local` files
- `.env.production` files with real credentials
- Database passwords
- API keys or secrets

✅ **Safe to commit**:
- `.env.example` (template without values)
- Configuration files (`vercel.json`, `railway.json`)
- Deployment guides

---

## Next Steps

1. **Read** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
2. **Follow** [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
3. **Deploy** frontend on Vercel
4. **Deploy** backend on Railway
5. **Test** API connections
6. **Monitor** logs and performance

---

## Support

For issues or questions:
- Check deployment logs in Railway/Vercel dashboards
- Review error messages in browser console (F12)
- Refer back to troubleshooting sections in DEPLOYMENT_GUIDE.md
