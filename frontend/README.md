# Fortune Tiles - React Frontend

A modern React web dashboard for the Fortune Tiles Inventory Management System.

## Features

- **Authentication**: Secure login with JWT tokens
- **Dashboard**: Real-time business analytics and insights
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Clean, professional interface with gradient themes
- **Real-time Data**: Live inventory and sales tracking

## Tech Stack

- **React 19** with functional components and hooks
- **React Router DOM** for navigation
- **Axios** for API communication
- **Context API** for state management
- **CSS3** with modern styling and animations

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Navbar.js       # Navigation bar
│   └── ProtectedRoute.js # Route protection
├── contexts/           # React Context providers
│   └── AuthContext.js  # Authentication state
├── pages/              # Page components
│   ├── Login.js        # Login page
│   └── Dashboard.js    # Main dashboard
├── services/           # API service layer
│   └── api.js          # Axios configuration and API calls
├── styles/             # CSS stylesheets
│   ├── Login.css       # Login page styles
│   ├── Dashboard.css   # Dashboard styles
│   └── Navbar.css      # Navigation styles
└── utils/              # Utility functions
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- Backend API running on `http://localhost:5000`

### Installation

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm start
   ```

3. **Open Browser**:
   Navigate to `http://localhost:3000`

### Default Login Credentials
- **Email**: [Contact system administrator for access]
- **Password**: admin123

## Available Scripts

### `npm start`
Runs the app in development mode on `http://localhost:3000`

### `npm run build`
Builds the app for production to the `build` folder

### `npm test`
Launches the test runner

## API Integration

The frontend communicates with the backend API through:

- **Authentication**: Login/logout functionality
- **Dashboard Data**: Real-time business metrics
- **Inventory Management**: Stock levels and changes
- **Sales Tracking**: Transaction history
- **Product Management**: Tile catalog

## Key Components

### AuthContext
Manages user authentication state across the application:
- User login/logout
- Token management
- Protected route access

### Dashboard
Main application interface featuring:
- Business summary cards
- Low stock alerts
- Recent activity feed
- Quick statistics

### API Service
Centralized API communication with:
- Automatic token injection
- Error handling
- Request/response interceptors

## Styling

The application uses a modern design system with:
- **Color Scheme**: Purple gradient theme
- **Typography**: System fonts for optimal readability
- **Layout**: CSS Grid and Flexbox
- **Responsive**: Mobile-first approach

## Development

To extend the application:

1. **Add New Pages**: Create components in `src/pages/`
2. **Add Routes**: Update `App.js` with new routes
3. **API Calls**: Add functions to `src/services/api.js`
4. **Styling**: Create CSS files in `src/styles/`

## Production Build

```bash
npm run build
```

This creates an optimized production build in the `build` folder ready for deployment.

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
