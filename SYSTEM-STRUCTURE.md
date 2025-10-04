# Fortune et Feveur - System Configuration

## System Structure

The Fortune et Feveur platform consists of two main applications:

1. **Main Website (Fortune et Feveur)** - Accessible at root URL `/`
   - The public-facing website for customers and visitors
   - Located in the `website-build` directory

2. **Inventory System** - Accessible at `/inventory`
   - The internal inventory management system
   - Located in the `public` directory (built from the `frontend` directory)

## URLs

- Main website: `https://fortuneetfeveur.com/` or `http://localhost:5000/`
- Inventory system: `https://fortuneetfeveur.com/inventory` or `http://localhost:5000/inventory`
- Systems overview page: `https://fortuneetfeveur.com/systems` or `http://localhost:5000/systems`

## Download Configuration

The system has been optimized to efficiently download only the necessary resources:

- When accessing the main website, only the website assets are downloaded
- When accessing the inventory system, only the inventory system assets are downloaded
- Both applications use proper caching to minimize redundant downloads

## Legacy URLs

For backward compatibility, `/system` URLs are automatically redirected to `/inventory`.

## Building and Deployment

To build the frontend (inventory system):
```bash
cd frontend
npm run build
```

The build output will be placed in the `frontend/build` directory, which should be copied to the `backend/public` directory for serving at `/inventory`.

## Environment Configuration

The backend is configured to run in development mode by default. For production:

1. Set `NODE_ENV=production` in the environment
2. Make sure all static assets are properly built before deployment

## Performance Optimizations

The system includes several performance optimizations:
- HTTP compression for all responses
- Browser caching for static assets
- Optimized database connection pooling
- Lazy loading for images
- Reduced logging in production

## Troubleshooting

If you experience download issues:
1. Clear your browser cache
2. Ensure you're accessing the correct URL for the system you need
3. Check the server logs for any errors