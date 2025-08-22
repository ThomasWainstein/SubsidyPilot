# Use Node.js 18 Alpine for smaller size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy server package files first for better caching
COPY server/package*.json ./

# Install dependencies
RUN npm install --only=production && npm cache clean --force

# Copy server source code
COPY server/ ./

# Debug: List files and check structure
RUN echo "=== FILES IN /app ===" && ls -la /app
RUN echo "=== PACKAGE.JSON CONTENT ===" && cat /app/package.json
RUN echo "=== CHECK INDEX.JS EXISTS ===" && ls -la /app/index.js || echo "index.js NOT FOUND"
RUN echo "=== NPM START TEST ===" && npm run start --version || echo "npm start failed"

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Change ownership to non-root user
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const options = { hostname: 'localhost', port: 8080, path: '/health', timeout: 2000 }; const req = http.request(options, (res) => process.exit(res.statusCode === 200 ? 0 : 1)); req.on('error', () => process.exit(1)); req.end();"

# Start the server using npm start (recommended by Google Cloud support)
CMD ["npm", "start"]