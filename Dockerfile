# Use Node.js LTS Alpine
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package.json backend/package-lock.json ./

# Install dependencies
RUN npm install --production --no-optional

# Copy backend source code
COPY backend/ ./

# Create website-build directory if it doesn't exist (public folder already exists from backend copy)
RUN mkdir -p website-build

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Run migrations and start server
CMD ["sh", "-c", "npx sequelize-cli db:migrate --env production && node server.js"]