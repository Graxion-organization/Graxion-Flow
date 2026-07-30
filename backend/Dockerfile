FROM node:22-slim

# Install system dependencies for Puppeteer (including unzip for Chrome extraction)
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
    unzip \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to skip downloading Chrome and use the installed Chromium instead
# This is the most stable and lightweight production approach
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY package*.json ./

# Ignore scripts to prevent the custom postinstall (which forces a chrome download) from running and failing
RUN npm ci --omit=dev --legacy-peer-deps --ignore-scripts

COPY . .
EXPOSE 5000
CMD ["npm", "start"]