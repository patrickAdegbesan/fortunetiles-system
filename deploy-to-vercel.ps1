# Fortune Tiles System - Automated Vercel Deployment
Write-Host "🚀 Fortune Tiles System - Automated Vercel Deployment" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

$PROJECT_NAME = "fortunetiles-system"

Write-Host "📋 Project Name: $PROJECT_NAME" -ForegroundColor Yellow
Write-Host ""

Write-Host "🏗️  Building project..." -ForegroundColor Yellow
Write-Host "   Installing backend dependencies..." -ForegroundColor Gray
Set-Location backend
npm install --silent
Set-Location ..

Write-Host "   Installing frontend dependencies..." -ForegroundColor Gray
Set-Location frontend
npm install --silent
Set-Location ..

Write-Host "   Building frontend..." -ForegroundColor Gray
Set-Location frontend
npm run build
Set-Location ..

Write-Host "   Copying frontend build to backend/public..." -ForegroundColor Gray
if (Test-Path "backend\public") {
    Remove-Item -Recurse -Force "backend\public"
}
New-Item -ItemType Directory -Force -Path "backend\public" | Out-Null
Copy-Item -Path "frontend\build\*" -Destination "backend\public" -Recurse -Force

Write-Host "✅ Build completed!" -ForegroundColor Green

Write-Host ""
Write-Host "🚀 Deploying to Vercel..." -ForegroundColor Yellow

Set-Location backend
vercel --yes --prod --name $PROJECT_NAME
Set-Location ..

Write-Host ""
Write-Host "📊 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Configure environment variables in Vercel dashboard"
Write-Host "   2. Set up your database"
Write-Host "   3. Visit your deployment URL above"
Write-Host ""
