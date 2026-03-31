# ============================================================
# Krpterisio Web Vulnerability Scanner — Cloud Run Dockerfile
# ============================================================

# --- Stage 1: Build the Vite Frontend ---
FROM node:20-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Stage 2: Production Runtime ---
FROM node:20-slim

# Install system dependencies: Chromium for Puppeteer + Python for AI analyzer
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    python3 \
    python3-pip \
    python3-venv \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libgbm1 \
    libasound2 \
    libatspi2.0-0 \
    libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies in a virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir google-genai

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy package files and install production + dev deps (ts-node needed at runtime)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Copy built frontend from builder stage
COPY --from=builder /app/dist ./dist

# Create required directories
RUN mkdir -p data/sessions reports public/reports

# Environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Start the server
CMD ["npm", "start"]
