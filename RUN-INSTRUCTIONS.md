# Fortune Tiles System - Running Instructions

## Prerequisites
Make sure you have the following installed:
- **Node.js** (version 14 or higher)
- **PostgreSQL** database
- **npm** (comes with Node.js)

## Quick Start (Using Batch Files)

### Option 1: Double-click the batch files
1. **Backend**: Double-click `start-backend.bat`
2. **Frontend**: Double-click `start-frontend.bat`

### Option 2: Manual Setup

## Backend Setup & Run

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   - Copy `.env.example` to `.env`
   - Configure your database connection in `.env`

4. **Start the backend server:**
   ```bash
   npm start
   # OR for development with auto-restart:
   npm run dev
   ```

   The backend will run on: **http://localhost:5000**

## Frontend Setup & Run

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the React development server:**
   ```bash
   npm start
   ```

   The frontend will run on: **http://localhost:3000**

## Database Setup

1. **Seed the database with sample data:**
   ```bash
   # From the root directory
   double-click seed-database.bat
   # OR manually:
   cd backend
   node seed-database.js
   ```

## Access the Application

1. **Frontend URL**: http://localhost:3000
2. **Backend API**: http://localhost:5000/api

## Default Login Credentials

- **Owner Account**: 
  - Email: owner@fortunetiles.com
  - Password: password123

- **Manager Account**:
  - Email: manager@fortunetiles.com  
  - Password: password123

## Troubleshooting

### Backend Issues:
- Make sure PostgreSQL is running
- Check database connection settings in `.env`
- Ensure all dependencies are installed: `npm install`

### Frontend Issues:
- Clear browser cache
- Make sure backend is running first
- Check console for any JavaScript errors
- Ensure all dependencies are installed: `npm install`

### Port Conflicts:
- Backend uses port 5000
- Frontend uses port 3000
- Make sure these ports are available

## Features Available:
- ✅ User Authentication & Role Management
- ✅ Product Management with Inventory Tracking
- ✅ Sales Management & Processing
- ✅ Business Intelligence Reports (with Naira currency)
- ✅ Dashboard with Real-time Statistics
- ✅ Export functionality (PDF/Excel)

## Recent Improvements:
- Currency formatting changed to Nigerian Naira (₦)
- Enhanced product inventory visibility
- Improved report calculations
- Modern navbar design
- Stock availability indicators
