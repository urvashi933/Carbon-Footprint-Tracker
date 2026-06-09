# Use the lightweight Node.js Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package config files
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Copy all application assets
COPY . .

# Expose backend port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
