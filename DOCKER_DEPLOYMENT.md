# Docker Deployment Guide

## Quick Start

### Using Docker Compose (Recommended)

1. **Set environment variables** (optional):
   ```bash
   export SESSION_SECRET="your-super-secret-key-here"
   ```

2. **Start the application**:
   ```bash
   docker-compose up -d
   ```

3. **Access the application**:
   - Open your browser and go to: http://localhost:3000

4. **Stop the application**:
   ```bash
   docker-compose down
   ```

5. **Stop and remove all data**:
   ```bash
   docker-compose down -v
   ```

### Using Docker CLI Only

1. **Create a network**:
   ```bash
   docker network create battleship-network
   ```

2. **Start MongoDB**:
   ```bash
   docker run -d \
     --name battleship-mongodb \
     --network battleship-network \
     -p 27017:27017 \
     -v mongodb_data:/data/db \
     mongo:7-jammy
   ```

3. **Build the application**:
   ```bash
   docker build -t battleship-app .
   ```

4. **Run the application**:
   ```bash
   docker run -d \
     --name battleship-app \
     --network battleship-network \
     -p 3000:3000 \
     -e MONGODB_URI=mongodb://battleship-mongodb:27017/web-design-project \
     -e SESSION_SECRET=your-secret-key \
     -e NODE_ENV=production \
     battleship-app
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://mongodb:27017/web-design-project` |
| `SESSION_SECRET` | Secret key for sessions | (required) |
| `PORT` | Application port | `3000` |

## Docker Commands Reference

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f mongodb
```

### Check status
```bash
docker-compose ps
```

### Restart services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart app
```

### Access container shell
```bash
# App container
docker-compose exec app sh

# MongoDB container
docker-compose exec mongodb mongosh
```

### Rebuild after code changes
```bash
docker-compose up -d --build
```

## Production Deployment

### On a VPS/Cloud Server

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd CI-0126-web-design-final-project
   ```

2. **Create production environment file**:
   ```bash
   echo "SESSION_SECRET=$(openssl rand -base64 32)" > .env.production
   ```

3. **Deploy with Docker Compose**:
   ```bash
   docker-compose --env-file .env.production up -d
   ```

4. **Set up reverse proxy** (optional, with Nginx):
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Using Docker Hub

1. **Tag your image**:
   ```bash
   docker tag battleship-app yourusername/battleship-app:latest
   ```

2. **Push to Docker Hub**:
   ```bash
   docker push yourusername/battleship-app:latest
   ```

3. **Pull and run on server**:
   ```bash
   docker pull yourusername/battleship-app:latest
   docker-compose up -d
   ```

## Backup and Restore

### Backup MongoDB data
```bash
docker-compose exec mongodb mongodump --out /data/backup
docker cp battleship-mongodb:/data/backup ./mongodb-backup
```

### Restore MongoDB data
```bash
docker cp ./mongodb-backup battleship-mongodb:/data/backup
docker-compose exec mongodb mongorestore /data/backup
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs app

# Check MongoDB connection
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

### Port already in use
```bash
# Change ports in docker-compose.yml
# For app: "3001:3000"
# For MongoDB: "27018:27017"
```

### Clear all data and restart
```bash
docker-compose down -v
docker-compose up -d
```

## Health Checks

Both services include health checks:
- **App**: HTTP request to port 3000 every 30s
- **MongoDB**: Ping command every 10s

Check health status:
```bash
docker-compose ps
```

## Security Notes

1. **Always change the SESSION_SECRET** in production
2. Don't expose MongoDB port (27017) in production - comment out the ports in docker-compose.yml
3. Use environment variables for sensitive data
4. Enable HTTPS with a reverse proxy (Nginx/Caddy)
5. Regularly update Docker images for security patches
