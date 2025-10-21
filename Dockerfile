# Simple Node.js backend deployment
FROM node:20-alpine

WORKDIR /app

# Install production dependencies first
COPY backend/package*.json ./
RUN npm ci --only=production

# Install sequelize-cli for migrations
RUN npm install sequelize-cli

# Copy backend source
COPY backend/ ./

# Copy startup script
COPY start.sh ./
RUN chmod +x start.sh

# Create directories for static assets (will be built separately)
RUN mkdir -p public website-build

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["./start.sh"]