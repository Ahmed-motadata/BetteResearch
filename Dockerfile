FROM node:20-alpine

# Add dependencies for Electron with GUI on Alpine
RUN apk update && apk upgrade && \
    apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ttf-freefont \
    xauth \
    xvfb \
    libdrm \
    mesa-gbm \
    libxslt \
    libxcomposite \
    libxdamage \
    libxi \
    libxtst \
    dbus \
    eudev \
    libx11 \
    libxcb \
    libxkbcommon \
    libxrandr \
    libxcursor \
    libxdmcp \
    libxext \
    libxfixes \
    libxrender \
    libxshmfence \
    tzdata \
    shadow

# Create a non-root user with specific UID/GID for better security
RUN addgroup -S appgroup -g 1000 && \
    adduser -S appuser -G appgroup -u 1000 -h /home/appuser

# Set strict directory permissions
RUN mkdir -p /app && \
    chown -R appuser:appgroup /app

# Set working directory
WORKDIR /app

# Copy package files with explicit owner
COPY --chown=appuser:appgroup package*.json ./

# Install app dependencies with production flag, audit, and cache clean
RUN npm ci --omit=dev && \
    npm audit fix --production && \
    npm cache clean --force

# Copy app source with explicit ownership
COPY --chown=appuser:appgroup . .

# Set environment variables
ENV DISPLAY=:0 \
    NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn

# Set up runtime security measures
# Disable process memory dumps which can leak sensitive info
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
ENV NODE_OPTIONS="--max-http-header-size=16384 --no-experimental-fetch"

# Switch to non-root user
USER appuser:appgroup

# Command to run app
CMD ["npm", "start"]