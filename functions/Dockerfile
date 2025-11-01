# Use the official Node.js runtime as a base image
FROM node:22

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY index.js ./

# Expose port
EXPOSE 8080

# Set environment variable
ENV PORT=8080

# Start command - Firebase Functions v2 uses onRequest which needs special handling
# For Cloud Run, we'll need a wrapper
CMD ["node", "index.js"]

