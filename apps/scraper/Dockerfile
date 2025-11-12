# Use Python 3.9 as base image
FROM python:3.9-slim

# Install system dependencies required by Playwright/Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
  wget \
  gnupg \
  curl \
  ca-certificates \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libatspi2.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libx11-xcb1 \
  libxcb-dri3-0 \
  libxcomposite1 \
  libxdamage1 \
  libxkbcommon0 \
  libxrandr2 \
  libxshmfence1 \
  fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Ensure deterministic Python runtime behaviour
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Copy requirements file first for better caching
COPY crex_scraper_python/requirements.txt ./

# Install Python dependencies
RUN pip install --upgrade pip && \
  pip install --no-cache-dir -r requirements.txt

# Ensure Playwright installs browsers in a shared location baked into the image
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN mkdir -p ${PLAYWRIGHT_BROWSERS_PATH}

# Install Playwright Chromium browser during build so runtime is ready
RUN python -m playwright install chromium

# Copy the standalone helper modules (shared utilities, services, etc.)
COPY *.py ./

# Copy the entire scraper application package
COPY crex_scraper_python/ ./

# Make the start script executable if it exists
RUN if [ -f start.sh ]; then chmod +x start.sh; fi

# Create storage directory
RUN mkdir -p /app/storage

# Expose the port Flask runs on
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Set the default command
CMD ["python", "run_server.py"]
