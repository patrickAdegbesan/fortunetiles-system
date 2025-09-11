# Fortune Tiles Inventory Management System - Backend API

A professional inventory and sales tracking system for tile importation business.

## Features

- **User Management**: Role-based access (owner, manager, staff)
- **Product Catalog**: Manage tile products with specifications
- **Inventory Tracking**: Real-time stock levels across multiple locations
- **Sales Management**: Complete sales workflow with automatic inventory updates
- **Audit Trail**: Full logging of all inventory changes
- **Dashboard Analytics**: Business insights and reporting

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT tokens with bcrypt password hashing
- **Validation**: Built-in Sequelize validations

## Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Database Setup**:
   - Install PostgreSQL
   - Create database: `fortunetiles_db`
   - Update `.env` with your database credentials

3. **Environment Configuration**:
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

## Default Admin Account

- **Email**: admin@fortunetiles.com
- **Password**: admin123
- **Role**: owner

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Create new user

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Inventory
- `GET /api/inventory` - Get inventory levels
- `POST /api/inventory/log` - Log inventory change
- `GET /api/inventory/logs` - Get change history

### Sales
- `GET /api/sales` - Get all sales
- `POST /api/sales` - Create new sale
- `GET /api/sales/:id` - Get single sale

### Locations
- `GET /api/locations` - Get all locations
- `POST /api/locations` - Create new location
- `PUT /api/locations/:id` - Update location

### Dashboard
- `GET /api/dashboard` - Get business analytics

## Database Schema

### Models
- **User**: Staff accounts with role-based permissions
- **Location**: Warehouse/showroom locations
- **Product**: Tile products with specifications
- **Inventory**: Current stock levels per location
- **InventoryLog**: Audit trail of all stock changes
- **Sale**: Customer transactions
- **SaleItem**: Individual items within sales

### Key Features
- Automatic password hashing
- Inventory transaction logging
- Stock level validation
- Comprehensive audit trail
