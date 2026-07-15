const fs = require('fs');
const path = require('path');

const projectRoot = 'c:/whatsapp-saas';

const files = {
  'backend/Dockerfile': `FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]`,

  'frontend/Dockerfile': `FROM node:22-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`,

  'frontend/nginx.conf': `server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}`,

  'docker-compose.yml': `version: '3.8'

services:
  backend:
    build: ./backend
    restart: always
    environment:
      - NODE_ENV=production
      - PORT=5000
      - MONGODB_URI=mongodb://mongo:27017/whatsapp-saas
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    ports:
      - "5000:5000"
    depends_on:
      - mongo
      - redis

  frontend:
    build: ./frontend
    restart: always
    ports:
      - "3000:80"
    depends_on:
      - backend

  mongo:
    image: mongo:6.0
    restart: always
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

  redis:
    image: redis:7-alpine
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

volumes:
  mongo-data:
  redis-data:`,

  'nginx/nginx.conf': `user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log notice;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    upstream backend {
        server backend:5000;
    }

    upstream frontend {
        server frontend:80;
    }

    server {
        listen 80;
        server_name example.com; # Replace with actual domain

        # Redirect HTTP to HTTPS (uncomment when SSL is ready)
        # return 301 https://$host$request_uri;

        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}`,

  'backend/ecosystem.config.js': `module.exports = {
  apps: [{
    name: "whatsapp-saas-backend",
    script: "src/server.js",
    instances: "max",
    exec_mode: "cluster",
    watch: false,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production",
      PORT: 5000
    }
  }, {
    name: "whatsapp-broadcast-worker",
    script: "src/workers/broadcastWorker.js",
    instances: 1, // Keep strictly to 1 to respect Meta rate limits sequentially if needed
    watch: false,
    env: {
      NODE_ENV: "production"
    }
  }]
};`,

  '.github/workflows/deploy.yml': `name: Deploy to Production

on:
  push:
    branches: [ "main" ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '22'

    - name: Install dependencies and build
      run: |
        cd frontend
        npm ci
        npm run build
        cd ../backend
        npm ci

    - name: Deploy via SSH
      uses: appleboy/ssh-action@v0.1.10
      with:
        host: \${{ secrets.SERVER_HOST }}
        username: \${{ secrets.SERVER_USER }}
        key: \${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /opt/whatsapp-saas
          git pull origin main
          docker-compose up -d --build
          # Or if using pm2:
          # cd backend && npm ci && pm2 reload ecosystem.config.js
`
};

// Create dirs
fs.mkdirSync(path.join(projectRoot, 'nginx'), { recursive: true });
fs.mkdirSync(path.join(projectRoot, '.github', 'workflows'), { recursive: true });

for (const [filename, code] of Object.entries(files)) {
  fs.writeFileSync(path.join(projectRoot, filename), code);
  console.log('Created ' + filename);
}
