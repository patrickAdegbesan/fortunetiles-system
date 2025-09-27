# Fortune Tiles Deployment Guide

This guide covers deploying Fortune Tiles with **cloud hosting + desktop app + mobile PWA + local backups**.

## 🚀 Quick Deploy to Heroku (Recommended)

### Prerequisites
- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed
- Git repository initialized

### Step 1: Create Heroku App
```bash
# Navigate to project root
cd fortunetiles-system

# Login to Heroku
heroku login

# Create app (replace 'your-app-name' with your desired name)
heroku create your-app-name

# Add Heroku Postgres
heroku addons:create heroku-postgresql:mini -a your-app-name
```

### Step 2: Configure Buildpacks (for monorepo)
```bash
# Add subdir buildpack to point to backend folder
heroku buildpacks:add -a your-app-name https://github.com/timanovsky/subdir-heroku-buildpack

# Set backend as the project path
heroku config:set -a your-app-name PROJECT_PATH=backend

# Add Node.js buildpack
heroku buildpacks:add -a your-app-name heroku/nodejs
```

### Step 3: Set Environment Variables
```bash
heroku config:set -a your-app-name NODE_ENV=production
heroku config:set -a your-app-name JWT_SECRET=your-super-secure-jwt-secret-here
heroku config:set -a your-app-name CLIENT_URL=https://your-app-name.herokuapp.com
```

### Step 4: Deploy
```bash
# Add Heroku remote
heroku git:remote -a your-app-name

# Deploy
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

### Step 5: Verify Deployment
```bash
# Check logs
heroku logs --tail -a your-app-name

# Open app
heroku open -a your-app-name
```

## 📱 Mobile Access (PWA)

Your app is now a Progressive Web App! Users can:

1. **Install on iPhone/iPad:**
   - Open Safari → Navigate to your app
   - Tap Share button → "Add to Home Screen"

2. **Install on Android:**
   - Open Chrome → Navigate to your app
   - Tap menu → "Add to Home screen" or "Install app"

3. **Features:**
   - Works offline (limited functionality)
   - App-like experience
   - Push notifications ready (if implemented)

## 💻 Desktop App Setup

### For End Users (Download & Install)
1. Navigate to `desktop-app/` folder
2. Install dependencies: `npm install`
3. Update the app URL in `main.js`:
   ```javascript
   const appUrl = 'https://your-app-name.herokuapp.com';
   ```
4. Build installer: `npm run build-win`
5. Distribute the installer from `desktop-app/dist/`

### For Development
```bash
cd desktop-app
npm install
npm start  # Run in development mode
```

### Building Desktop Installer
```bash
cd desktop-app
npm install
npm run build-win  # Creates Windows installer
```

## 💾 Backup System

### Automatic Cloud Backups
- Heroku Postgres automatically creates daily backups
- Access via: `heroku pg:backups -a your-app-name`

### Manual Local Backups

#### Via Desktop App
- File Menu → "Backup Data" (Ctrl+B)
- Saves JSON export to local file

#### Via Web Interface
- Login as Owner/Manager
- Navigate to: `https://your-app-name.herokuapp.com/api/backup/export`
- Downloads complete data export as JSON

#### Via API (for scripts)
```bash
# Get auth token first (login via web interface, check localStorage)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://your-app-name.herokuapp.com/api/backup/export \
     -o backup-$(date +%Y-%m-%d).json
```

## 🔧 Configuration

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes (auto-set by Heroku) |
| `JWT_SECRET` | Secret for JWT tokens | Yes |
| `NODE_ENV` | Environment (production) | Yes |
| `CLIENT_URL` | Frontend URL for CORS | Yes |

### Database Migrations
Migrations run automatically on deployment via the `release` phase in `Procfile`.

Manual migration:
```bash
heroku run npx sequelize-cli db:migrate -a your-app-name
```

## 🛠 Maintenance

### Viewing Logs
```bash
heroku logs --tail -a your-app-name
```

### Database Access
```bash
heroku pg:psql -a your-app-name
```

### Scaling
```bash
# Scale to multiple dynos
heroku ps:scale web=2 -a your-app-name

# Upgrade database
heroku addons:upgrade heroku-postgresql:standard-0 -a your-app-name
```

## 🔒 Security Checklist

- ✅ JWT secrets are secure and not hardcoded
- ✅ Database uses SSL in production
- ✅ CORS configured for your domain only
- ✅ Passwords excluded from backup exports
- ✅ Role-based access control implemented
- ✅ HTTPS enforced (automatic on Heroku)

## 📊 Monitoring

### Health Check
- Endpoint: `https://your-app-name.herokuapp.com/health`
- Should return: `{"status":"ok"}`

### Uptime Monitoring
Consider adding:
- [UptimeRobot](https://uptimerobot.com/) (free)
- [Pingdom](https://www.pingdom.com/)
- [StatusCake](https://www.statuscake.com/)

## 🆘 Troubleshooting

### Common Issues

**Build Fails:**
- Check `heroku logs --tail` during deployment
- Verify `PROJECT_PATH=backend` is set
- Ensure `frontend/package.json` has valid dependencies

**Database Connection Issues:**
- Verify `DATABASE_URL` is set: `heroku config -a your-app-name`
- Check SSL configuration in `backend/config/database.js`

**Desktop App Can't Connect:**
- Update URL in `desktop-app/main.js`
- Check CORS settings in backend
- Verify app is deployed and accessible

**PWA Not Installing:**
- Check `manifest.json` is valid
- Verify HTTPS is working
- Test service worker registration

### Getting Help
1. Check Heroku logs: `heroku logs --tail -a your-app-name`
2. Test API endpoints directly
3. Verify environment variables are set correctly
4. Check database connectivity

## 🎯 Next Steps

1. **Custom Domain:** Add your own domain via Heroku
2. **SSL Certificate:** Automatic with custom domains
3. **CDN:** Consider Cloudflare for global performance
4. **Monitoring:** Set up error tracking (Sentry, Rollbar)
5. **Backups:** Schedule automated local backups
6. **Updates:** Set up CI/CD for automatic deployments

---

**Default Login:**
- Email: [Contact system administrator for access]
- Password: `admin123`

**Support:** Update this section with your contact information.
