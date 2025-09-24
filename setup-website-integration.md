# Website Integration Setup Guide

## Option 1: Git Submodule Integration (Recommended)

This approach allows the other developer to maintain their website independently while you host everything on Heroku.

### Prerequisites:
- Other developer's website should be in a GitHub repository
- Their website should be production-ready (built/compiled if needed)

### Step 1: Add Website as Submodule

```bash
# Add their website repository as a submodule
git submodule add https://github.com/DEVELOPER_USERNAME/WEBSITE_REPO.git website

# Initialize and update the submodule
git submodule update --init --recursive
```

### Step 2: Update Backend to Serve Website

Update `backend/server.js` to serve the website alongside the inventory system:

```javascript
// Add this after your existing routes but before the fallback route
// Serve company website at root path
app.use('/', express.static(path.join(__dirname, '../website')));

// Serve inventory system at /inventory path
app.use('/inventory', express.static(path.join(__dirname, 'public')));

// API routes remain the same but prefixed
app.use('/inventory/api', /* your existing API routes */);
```

### Step 3: Update Frontend Build Process

Modify `package.json` heroku-postbuild script:

```json
{
  "scripts": {
    "heroku-postbuild": "cd backend && npm install && cd ../frontend && npm install && npm run build && cd ../backend && rm -rf ./public && mkdir -p ./public && cp -a ../frontend/build/. ./public/ && cd ../website && if [ -f 'package.json' ]; then npm install && npm run build; fi"
  }
}
```

### Step 4: Update Inventory Frontend Routes

Update frontend to work from `/inventory` path instead of root.

### Step 5: Pulling Updates

When the developer updates their website:

```bash
# Pull latest changes from their website
git submodule update --remote website

# Commit the update
git add .
git commit -m "Update website submodule"
git push heroku master
```

---

## Option 2: Webhook-Based Auto-Update

Set up automatic updates when the developer pushes changes.

### Step 1: Create Webhook Endpoint

Add to `backend/server.js`:

```javascript
const { exec } = require('child_process');

app.post('/webhook/website-update', (req, res) => {
  // Verify webhook (add security as needed)
  
  exec('git submodule update --remote website', (error, stdout, stderr) => {
    if (error) {
      console.error('Submodule update failed:', error);
      return res.status(500).json({ error: 'Update failed' });
    }
    
    console.log('Website updated:', stdout);
    res.json({ success: true, message: 'Website updated successfully' });
  });
});
```

### Step 2: Developer Sets Up Webhook

Developer adds webhook URL to their repository:
- URL: `https://your-app.herokuapp.com/webhook/website-update`
- Event: Push to main/master branch

---

## Option 3: Separate Heroku Apps with Routing

### Benefits:
- ✅ Complete separation of systems
- ✅ Independent deployments
- ✅ Developer maintains full control

### Setup:
1. **Create two Heroku apps:**
   - `company-website` (developer maintains)
   - `company-inventory` (your current app)

2. **Use Heroku's custom domain routing:**
   - `company.com` → Website app
   - `company.com/inventory` → Inventory app
   - `inventory.company.com` → Inventory app

---

## Recommended Implementation Plan

I recommend **Option 1 (Git Submodule)** because it:
- Gives you full control over hosting
- Allows developer independence
- Maintains single deployment
- Is cost-effective (single Heroku dyno)

Would you like me to implement Option 1 for your project? I'll need:

1. The GitHub repository URL of the developer's website
2. Whether their website needs a build process (React, Vue, etc.) or is static HTML/CSS/JS
3. Your preference for URL structure:
   - `yoursite.com` = website, `yoursite.com/inventory` = inventory system
   - OR `yoursite.com` = inventory, `yoursite.com/website` = website

Let me know which option you prefer and I'll help you set it up!