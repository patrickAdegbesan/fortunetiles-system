# 🚀 Vercel Deployment Guide for Fortune Tiles System

## Overview
This project consists of 3 components that can be deployed to Vercel:
- **Backend**: Node.js/Express API
- **Frontend**: React inventory management app
- **Website**: Vite-based marketing website

## Prerequisites
1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push your code to GitHub (Vercel integrates seamlessly)
3. **Database**: PostgreSQL or MySQL hosted elsewhere (AWS RDS, Railway, Supabase, etc.)
4. **Environment Variables**: Prepare `.env` values for each service

## Deployment Steps

### Step 1: Prepare Your GitHub Repository
```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit for Vercel deployment"
git remote add origin https://github.com/your-username/fortunetiles-system.git
git push -u origin main
```

### Step 2: Deploy Backend API

#### Option A: Deploy Backend as Main Vercel Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Select your GitHub repository
3. Configure project settings:
   - **Framework**: `Node.js`
   - **Root Directory**: `./backend`
   - **Build Command**: `npm run build` (or skip if not needed)
   - **Start Command**: `node server.js`

4. Add environment variables in Vercel dashboard:
   ```
   NODE_ENV=production
   DATABASE_URL=your_postgres_or_mysql_url
   JWT_SECRET=your_secret_key
   PORT=3000
   # Add other required variables from your .env
   ```

5. Deploy!

#### Option B: Deploy Backend to Separate Vercel Project
- Repeat Step 2 but point to backend folder
- Note the backend URL (e.g., `api.yourdomain.com`)

### Step 3: Deploy Frontend

1. Create a new Vercel project
2. Select the same GitHub repository
3. Configure:
   - **Framework**: `Create React App`
   - **Root Directory**: `./frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

4. Add environment variable:
   ```
   REACT_APP_API_URL=https://your-backend-url.vercel.app
   ```

5. Deploy!

### Step 4: Deploy Website

1. Create another new Vercel project
2. Configure:
   - **Framework**: `Vite`
   - **Root Directory**: `./website`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

3. Deploy!

## Environment Variables Reference

### Backend (.env)
```
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/dbname
# or for MySQL:
# DATABASE_URL=mysql://user:password@host:3306/dbname
JWT_SECRET=your_secret_key_here
PORT=3000
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

### Frontend (.env.local)
```
REACT_APP_API_URL=https://your-backend-url.vercel.app
```

### Website (.env)
```
VITE_API_URL=https://your-backend-url.vercel.app
```

## Important Notes

### Database Hosting
Vercel can't host databases. Use:
- **PostgreSQL**: Railway, Supabase, AWS RDS, Neon
- **MySQL**: PlanetScale, AWS RDS, DigitalOcean
- **SQLite**: Not recommended for production (Vercel's filesystem is ephemeral)

**Recommended**: Use Railway.app (free tier available)
```bash
# Railway deployment
npm i -g @railway/cli
railway login
railway init
railway up
```

### Cold Starts
Vercel serverless functions have cold starts. Optimize:
- Keep dependencies minimal
- Use connection pooling for database
- Consider Vercel's paid tier for faster cold starts

### Database Migrations
Run migrations before/after deployment:
```bash
# Locally or in CI/CD
npm run migrate
```

### File System
Vercel's serverless functions have read-only filesystem. Don't store files there:
- ❌ User uploaded images on disk
- ✅ Store images in S3, Cloudinary, or similar

### WebSocket Support
For real-time features, use:
- **Vercel Edge Functions** (WebSockets supported)
- **External service** (Socket.io hosted separately)
- **Supabase Realtime** (PostgreSQL-based)

## Configuration Files

### Backend `vercel.json`
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}
```

### Frontend `vercel.json`
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "rewrites": [
    {
      "source": "/:path*",
      "destination": "/index.html"
    }
  ]
}
```

### Website `vercel.json`
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

## Monitoring & Debugging

1. **Vercel Dashboard**
   - View logs: Settings → Function Logs
   - Monitor performance: Analytics tab
   - Check deployments: Deployments tab

2. **Local Testing**
   ```bash
   npm i -g vercel
   vercel dev  # Test locally with Vercel runtime
   ```

3. **Production Debugging**
   ```bash
   vercel logs  # View production logs
   vercel env list  # Check environment variables
   ```

## Custom Domain Setup

1. Go to Vercel Project Settings → Domains
2. Add your domain (e.g., `api.example.com`, `app.example.com`)
3. Update DNS records as instructed
4. Enable SSL (automatic)

## Cost Estimation

- **Free Tier**: 
  - 100 deployments/month
  - 6,000 function execution hours/month
  - 100GB bandwidth/month
  
- **Pro Tier** ($20/month):
  - Unlimited everything
  - Priority support

## Troubleshooting

### Build Fails
```bash
# Check build logs in Vercel dashboard
# Ensure all dependencies in package.json
# Verify Node version compatibility
```

### Database Connection Issues
- Verify DATABASE_URL in environment variables
- Check firewall/IP whitelist on database host
- Test connection locally: `npm run seed:test-connection`

### CORS Errors
- Update backend `.env`: `CORS_ORIGIN=https://your-frontend-url`
- Restart backend deployment

### Cold Start Timeout
- Reduce bundle size
- Move heavy operations to scheduled functions
- Consider upgrading to Pro tier

## Next Steps

1. ✅ Push code to GitHub
2. ✅ Set up PostgreSQL/MySQL database
3. ✅ Deploy backend first
4. ✅ Deploy frontend with backend URL
5. ✅ Deploy website
6. ✅ Configure custom domains
7. ✅ Set up monitoring/alerts

---

**Need Help?**
- Vercel Docs: https://vercel.com/docs
- Node.js Guide: https://vercel.com/docs/functions/nodejs
- Community: https://github.com/vercel/vercel/discussions
