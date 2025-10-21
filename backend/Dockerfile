FROM node:20-alpine

# set working directory
WORKDIR /app

# install deps (use package-lock if present)
COPY package*.json ./
RUN npm ci --only=production

# copy app
COPY . .

# runtime env
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
