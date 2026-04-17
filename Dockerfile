# Multi-stage production Dockerfile
FROM node:18-alpine AS base

# Install dependencies for building
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3000

# Production stage
FROM node:18-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S kafkauser -u 1001

WORKDIR /app

# Copy production dependencies
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package*.json ./

# Copy application code
COPY --chown=kafkauser:nodejs . .

# Create logs directory
RUN mkdir -p logs && chown kafkauser:nodejs logs

# Switch to non-root user
USER kafkauser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Expose port
EXPOSE 3000

# Default command (can be overridden)
CMD ["node", "src/applications/dashboard.js"]