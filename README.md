# 📦 Inventory Management System

A modern, full-stack inventory management and point-of-sale system built with React, Node.js, and Electron. Features real-time inventory tracking, sales processing, comprehensive reporting, and cross-platform support.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![Electron](https://img.shields.io/badge/Electron-28.x-purple.svg)](https://electronjs.org/)

## ✨ Features

### 🏪 Inventory Management
- Real-time stock tracking across multiple locations
- Product catalog with categories and attributes
- Low stock alerts and inventory notifications
- Bulk import/export functionality
- Product image management

### 💰 Point of Sale
- Fast checkout with cart management
- Receipt generation and printing
- Customer management
- Sales history and transaction tracking
- Return processing

### 📊 Analytics & Reporting
- Real-time dashboard with key metrics
- Sales reports with date range filtering
- Inventory analytics and insights
- Export to PDF and Excel formats
- Custom reporting capabilities

### 👥 User Management
- Role-based access control (Owner, Manager, Staff)
- Multi-user authentication
- Activity tracking and audit logs
- Secure password management

### 📱 Cross-Platform
- **Web Application**: Responsive web interface
- **Progressive Web App**: Installable on mobile devices
- **Desktop App**: Native Windows application
- **Offline Support**: Limited functionality without internet

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or higher
- PostgreSQL or MySQL database
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/inventory-system.git
   cd inventory-system
   ```

2. **Install dependencies**
   ```bash
   # Install all dependencies
   npm run install:all
   ```

3. **Database Setup**
   - Create a PostgreSQL/MySQL database
   - Copy `.env.example` to `.env` in the backend directory
   - Configure your database connection

4. **Seed the database**
   ```bash
   npm run seed
   ```

5. **Start the development servers**
   ```bash
   npm start
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Login Credentials
- No default production credentials are shipped.
- For development seeding, set `SEED_ADMIN_USER=true` and `ADMIN_PASSWORD=...` in `backend/.env` (see `backend/.env.example`).

## 🏗️ Architecture

### Backend (Node.js/Express)
- RESTful API with Express.js
- Sequelize ORM for database operations
- JWT authentication
- File upload handling
- Email notifications

### Frontend (React)
- Modern React 18 with hooks
- React Router for navigation
- Axios for API communication
- Responsive design with CSS
- PWA capabilities

### Desktop App (Electron)
- Cross-platform desktop application
- Auto-updater functionality
- Native system integration
- Offline data backup

## 📋 API Documentation

The backend provides a comprehensive REST API:

### Authentication
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/reset-password` - Password reset

### Products & Inventory
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `GET /api/inventory` - Inventory levels

### Sales & Transactions
- `GET /api/sales` - Sales history
- `POST /api/sales` - Process sale
- `GET /api/transactions` - Transaction details

### Reports
- `GET /api/reports/sales` - Sales analytics
- `GET /api/reports/inventory` - Inventory reports

## 🛠️ Development

### Available Scripts

```bash
# Start all services
npm start

# Start backend only
npm run backend

# Start frontend only
npm run frontend

# Build for production
npm run build

# Run tests
npm test
```

### Project Structure
```
inventory-system/
├── backend/          # Node.js/Express API server
├── frontend/         # React web application
├── desktop-app/      # Electron desktop app
├── package.json      # Root package configuration
└── README.md         # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by real-world inventory management needs
- Community contributions welcome

---

**Ready to streamline your inventory management?** Give it a star ⭐ and start using this system today!
