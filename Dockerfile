# Simple Node.js backend deployment
FROM node:20-alpine

WORKDIR /app

# Copy entire repository first
COPY . .

# Navigate to backend
WORKDIR /app/backend

# Install production dependencies
RUN npm ci --only=production

# Install sequelize-cli for migrations
RUN npm install sequelize-cli

# Go back to app root
WORKDIR /app

# Make start script executable
RUN chmod +x start.sh

# Create directories for static assets (will be built separately)
RUN mkdir -p public website-build

# Environment variables
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Start from app root, then run backend server
CMD ["sh", "-c", "cd backend && node server.js"]