# BezPitcha — Deployment Guide

## Prerequisites

- Ubuntu 22.04 VPS with Docker and Docker Compose installed
- Domain `bezpitcha.ru` pointing to your VPS (A record)
- Git access to the repository

## 1. Clone and Prepare

```bash
git clone https://github.com/ayvabrat/bezpitcha.git /opt/bezpitcha
cd /opt/bezpitcha
cp .env.production.example .env
```

Fill in `.env` with your actual secrets:
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `LOVABLE_API_KEY`
- `CRON_SECRET` (min 32 chars)
- `SESSION_SECRET` (min 32 chars)

## 2. Build and Start

```bash
bash scripts/deploy.sh
```

This will:
1. Pull latest code
2. Build Docker images
3. Start containers
4. Run migrations
5. Health check

## 3. Enable Cron (Task Queue Processor)

```bash
sudo cp systemd/bezpitcha-cron.* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now bezpitcha-cron.timer
```

Verify:
```bash
sudo systemctl status bezpitcha-cron.timer
```

## 4. Verify Deployment

```bash
curl https://bezpitcha.ru/api/health
# Expected: {"status":"ok","db_ok":true}
```

## 5. Auto-restart on Reboot

Docker Compose `restart: always` ensures containers restart. For full stack:
```bash
sudo systemctl enable docker
```

## Troubleshooting

- Check logs: `docker compose logs -f web`
- Check Caddy: `docker compose logs -f caddy`
- Health: `curl -v https://bezpitcha.ru/api/health`
