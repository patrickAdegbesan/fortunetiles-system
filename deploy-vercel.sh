#!/bin/bash

# Fortune Tiles System - Vercel Deployment Quick Start
# This script helps you deploy the Fortune Tiles System to Vercel

echo "🚀 Fortune Tiles System - Vercel Deployment Quick Start"
echo "=================================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

echo ""
echo "📋 Deployment Options:"
echo "1. Deploy Backend API"
echo "2. Deploy Frontend App"
echo "3. Deploy Website"
echo "4. Deploy All (recommended)"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo "🔧 Deploying Backend..."
        cd backend
        vercel
        ;;
    2)
        echo "🎨 Deploying Frontend..."
        cd frontend
        vercel
        ;;
    3)
        echo "🌐 Deploying Website..."
        cd website
        vercel
        ;;
    4)
        echo "📦 Deploying All Services..."
        echo ""
        
        echo "🔧 Deploying Backend..."
        cd backend
        vercel --prod
        BACKEND_URL=$(vercel ls | grep -oP '(?<=vercel.app)' | head -1)
        cd ..
        
        echo ""
        echo "🎨 Deploying Frontend..."
        cd frontend
        echo "Enter your Backend URL:"
        read backend_url
        vercel env add REACT_APP_API_URL "$backend_url"
        vercel --prod
        cd ..
        
        echo ""
        echo "🌐 Deploying Website..."
        cd website
        vercel env add VITE_API_URL "$backend_url"
        vercel --prod
        cd ..
        
        echo ""
        echo "✅ All services deployed!"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "📊 Next Steps:"
echo "1. Configure environment variables in Vercel dashboard"
echo "2. Set up your database (Railway, Supabase, etc.)"
echo "3. Update CORS settings in backend"
echo "4. Add custom domains if desired"
echo ""
echo "📖 For more info, see: VERCEL_DEPLOYMENT_GUIDE.md"
