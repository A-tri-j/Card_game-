# 🚀 Cardly – Production Deployment Guide

This guide details all production deployment options for **Cardly (Card Game Tracker)**, including Docker, Vercel + Render/Railway, Render Blueprints, and Ubuntu VPS.

---

## 📋 System Architecture

- **Frontend**: React + Vite (Static SPA, served via Nginx or Vercel/Netlify)
- **Backend**: Python 3.11+ FastAPI + Uvicorn + SQLAlchemy
- **Database**: PostgreSQL 14+ (Managed or Containerized)
- **Migrations**: Alembic (auto-executing on service startup)

---

## 🐳 Option 1: Full-Stack Docker Compose (Fastest & Simplest)

Deploy the entire production stack (PostgreSQL + FastAPI + Nginx React SPA) on any machine or VPS with a single command.

### 1. Prerequisites
- Docker Engine & Docker Compose installed.

### 2. Run the Stack
From the project root directory:

```bash
# Build and start all 3 services in the background
docker compose up --build -d
```

### 3. Verification
- **Frontend**: Visit [http://localhost:3000](http://localhost:3000)
- **Backend API Docs**: Visit [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Check**: Visit [http://localhost:8000/health](http://localhost:8000/health)
- **Database Health**: Visit [http://localhost:8000/health/db](http://localhost:8000/health/db)

### 4. Useful Docker Commands
```bash
# View live logs
docker compose logs -f

# View backend logs specifically
docker compose logs -f backend

# Stop all containers
docker compose down

# Stop and reset database volume
docker compose down -v
```

---

## ☁️ Option 2: Free Cloud Tier (Vercel + Render + Neon/Supabase)

This is the most popular, high-performance, and cost-effective production deployment.

### Step 1: Set up PostgreSQL Database (Neon or Supabase)
1. Create a free PostgreSQL database on [Neon.tech](https://neon.tech) or [Supabase.com](https://supabase.com).
2. Copy your connection string (e.g. `postgresql://user:pass@ep-xyz.neon.tech/card_game_tracker?sslmode=require`).

### Step 2: Deploy Backend (Render or Railway)
1. Push your repository to GitHub.
2. Log into [Render.com](https://render.com) and click **New +** → **Web Service**.
3. Select your GitHub repository:
   - **Root Directory**: `backend`
   - **Runtime**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `./start.sh` (or `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`)
4. Add the following **Environment Variables**:
   - `DATABASE_URL`: `your_neon_or_supabase_postgres_url` (Supports both `postgresql://` and `postgres://`)
   - `APP_NAME`: `Cardly API`
   - `FRONTEND_ORIGINS`: `https://your-frontend-app.vercel.app,http://localhost:5173`
5. Click **Create Web Service**. Wait for the build and migration to succeed.
6. Note your backend URL: e.g. `https://cardly-api.onrender.com`.

### Step 3: Deploy Frontend (Vercel)
1. Log into [Vercel.com](https://vercel.com) and click **Add New...** → **Project**.
2. Import your GitHub repository:
   - **Root Directory**: Select `frontend`
   - **Framework Preset**: `Vite` (automatically detected)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add the **Environment Variable**:
   - `VITE_API_BASE_URL`: `https://cardly-api.onrender.com` (Your Render backend URL, without trailing slash)
4. Click **Deploy**.
5. Once deployed, update your Render backend's `FRONTEND_ORIGINS` variable with your actual Vercel domain!

> [!NOTE]
> `frontend/vercel.json` is already configured with SPA rewrites so refreshing on deep links like `/home` or `/rules/29` works smoothly without 404 errors.

---

## ⚡ Option 3: 1-Click Render Blueprint (render.yaml)

The repository includes a ready-to-use [`render.yaml`](file:///c:/Users/USER/OneDrive/Desktop/card-game-tracker/render.yaml).

1. Push your project to GitHub.
2. In Render, click **Blueprints** → **New Blueprint Instance**.
3. Select your repository.
4. Render will automatically parse `render.yaml` and provision:
   - Managed PostgreSQL database (`cardly-postgres`)
   - FastAPI Web Service with automatic migrations (`cardly-api`)
   - React Static Web App with rewrite rules (`cardly-web`)
5. Click **Apply**. Everything is wired up automatically.

---

## 🖥️ Option 4: Linux VPS Deployment (Ubuntu + Systemd + Nginx)

If hosting on an Ubuntu VPS (DigitalOcean, Linode, AWS EC2, Hetzner):

### 1. Install System Dependencies
```bash
sudo apt update && sudo apt install -y python3-pip python3-venv git nginx postgresql postgresql-contrib
```

### 2. Configure PostgreSQL
```bash
sudo -u postgres psql -c "CREATE USER cardly WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "CREATE DATABASE card_game_tracker OWNER cardly;"
```

### 3. Set Up Backend
```bash
cd /var/www/card-game-tracker/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run migrations
alembic upgrade head
```

### 4. Create Systemd Service (`/etc/systemd/system/cardly-api.service`)
```ini
[Unit]
Description=Cardly FastAPI Service
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/card-game-tracker/backend
Environment="DATABASE_URL=postgresql://cardly:your_password@localhost:5432/card_game_tracker"
Environment="FRONTEND_ORIGINS=https://yourdomain.com"
ExecStart=/var/www/card-game-tracker/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cardly-api
```

### 5. Build and Serve Frontend
```bash
cd /var/www/card-game-tracker/frontend
npm ci
VITE_API_BASE_URL="https://yourdomain.com/api" npm run build
sudo cp -r dist/* /var/www/html/
```

### 6. Configure Nginx (`/etc/nginx/sites-available/cardly`)
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:8000/health;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/cardly /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

# Install free SSL certificate with Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 🛡️ Production Verification Checklist

Before opening the app to players:

- [ ] **Run Unit Tests**:
  - Backend: `cd backend && pytest` (56/56 passing)
  - Frontend: `cd frontend && npm test` (19/19 passing)
- [ ] **Verify Production Build**:
  - `cd frontend && npm run build` (Builds cleanly with zero errors)
- [ ] **Database Connection Health**:
  - Check `GET /health/db` returns `{"status":"ok","database":"connected"}`
- [ ] **CORS Configuration**:
  - Ensure `FRONTEND_ORIGINS` in backend matches the live frontend URL exactly.
- [ ] **Token Header Safety**:
  - Reverse proxies must pass `X-Edit-Token` header (already configured in Nginx & FastAPI).
