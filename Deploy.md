# Deployment Guide — Crypto Payment Gateway

Deploy the CryptoGate payment gateway to your own infrastructure.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Export & Clone the Project](#export--clone-the-project)
3. [Supabase Setup](#supabase-setup)
4. [Environment Configuration](#environment-configuration)
5. [Deploy Edge Functions](#deploy-edge-functions)
6. [Frontend Deployment](#frontend-deployment)
7. [Domain & SSL](#domain--ssl)
8. [OxaPay Configuration](#oxapay-configuration)
9. [Production Checklist](#production-checklist)
10. [Monitoring & Maintenance](#monitoring--maintenance)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Node.js 18+
- Git
- Supabase CLI (`npm install -g supabase`)
- A domain name for production
- OxaPay merchant account with API key

---

## Export & Clone the Project

### Option 1: GitHub (Recommended)

```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
npm install
```

### Option 2: Download ZIP

Download the project as ZIP, extract it, then run `npm install`.

---

## Supabase Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Set a name, strong database password, and closest region
3. Wait for setup (~2 minutes)

### 2. Get Credentials

From **Settings → API** in the Supabase dashboard:

| Variable | Where to find |
|----------|---------------|
| `Project URL` | `https://xxxxx.supabase.co` |
| `Anon Key` | Public key (safe for frontend) |
| `Service Role Key` | Private key (**never expose in frontend**) |

### 3. Run Database Migrations

```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

Or manually: open each file in `supabase/migrations/` in the SQL Editor and execute in order.

### 4. Configure Authentication

1. **Authentication → Providers** → Enable **Email**
2. **Authentication → URL Configuration**:
   - **Site URL**: `https://your-domain.com`
   - **Redirect URLs**: `https://your-domain.com/*`

### 5. Set Edge Function Secrets

Go to **Settings → Edge Functions → Secrets** and add:

| Secret | Description |
|--------|-------------|
| `OXAPAY_MERCHANT_API_KEY` | Your OxaPay merchant API key |
| `APP_URL` | Your frontend URL, e.g. `https://your-domain.com` (used to generate hosted payment page links) |

---

## Environment Configuration

Create `.env.production` in the project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-ref
```

Verify `src/integrations/supabase/client.ts` uses these env vars (it should by default).

---

## Deploy Edge Functions

### Deploy All Functions

```bash
supabase functions deploy create-payment
supabase functions deploy create-deposit-intent
supabase functions deploy merchant-api
supabase functions deploy oxapay-webhook
supabase functions deploy process-settlement
supabase functions deploy generate-api-key
supabase functions deploy webhook-retry
supabase functions deploy get-deposit-status
supabase functions deploy create-merchant-with-user
supabase functions deploy create-agent-with-user
supabase functions deploy create-merchant-for-agent
supabase functions deploy manage-merchant
supabase functions deploy seed-users
```

### Verify

```bash
supabase functions list
```

All functions use `verify_jwt = false` (configured in `supabase/config.toml`) because they use API key auth or are public webhook endpoints.

---

## Frontend Deployment

### Option A: AWS Amplify (Recommended)

1. Push code to GitHub
2. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify) → **New app** → **Host web app**
3. Connect your GitHub repo
4. Build settings:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

5. Add environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
6. Deploy

### Option B: AWS S3 + CloudFront

```bash
# Create bucket
aws s3 mb s3://your-bucket --region us-east-1

# Enable static hosting
aws s3 website s3://your-bucket --index-document index.html --error-document index.html

# Build & upload
npm run build
aws s3 sync dist/ s3://your-bucket --delete
```

Then create a CloudFront distribution:
- **Origin**: your-bucket.s3.amazonaws.com
- **Viewer protocol**: Redirect HTTP → HTTPS
- **Default root object**: `index.html`
- **Custom error response**: 403 → `/index.html` with 200 (for SPA routing)

### Option C: Vercel

```bash
npm install -g vercel
vercel --prod
```

Add env vars in Vercel dashboard → **Settings → Environment Variables**.

### Option D: DigitalOcean App Platform

1. Connect GitHub repo
2. Build command: `npm run build`
3. Output directory: `dist`
4. Add environment variables
5. Deploy

### Option E: Self-Hosted (VPS / EC2)

```bash
# On your server
sudo apt update && sudo apt install -y nginx nodejs npm

# Clone, build
git clone https://github.com/your-username/your-repo.git
cd your-repo
npm install
npm run build

# Serve with Nginx
sudo cp -r dist/* /var/www/html/
```

Nginx config (`/etc/nginx/sites-available/payment-gateway`):

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/payment-gateway /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Domain & SSL

### AWS CloudFront
1. Request SSL certificate in ACM (us-east-1)
2. Attach to CloudFront distribution
3. Point DNS (Route 53 or external) to CloudFront

### Self-Hosted (Certbot)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
sudo certbot renew --dry-run
```

---

## OxaPay Configuration

1. Log into [OxaPay dashboard](https://oxapay.com)
2. Set webhook URL to:
   ```
   https://your-project-ref.supabase.co/functions/v1/oxapay-webhook
   ```
3. Copy and store the webhook secret for HMAC-SHA512 validation
4. Ensure your OxaPay merchant API key is set as a Supabase edge function secret

---

## Production Checklist

### Security
- [ ] All default passwords changed
- [ ] RLS enabled on all tables (pre-configured)
- [ ] RLS policies reviewed and tested
- [ ] HTTPS everywhere
- [ ] API keys stored as secrets, not in code
- [ ] Edge function CORS headers configured correctly
- [ ] Rate limiting enabled

### Performance
- [ ] CDN caching enabled (CloudFront / Cloudflare)
- [ ] Gzip compression enabled
- [ ] Static asset cache headers set (1 year for hashed assets)

### Monitoring
- [ ] Error tracking (Sentry or similar)
- [ ] Uptime monitoring
- [ ] Edge function log monitoring
- [ ] Webhook delivery monitoring via admin panel

### Backup
- [ ] Supabase Point-in-Time Recovery enabled (Pro plan)
- [ ] Regular backup schedule
- [ ] Backup restoration tested

---

## Monitoring & Maintenance

### Supabase Dashboard

Monitor database usage, edge function logs, and auth logs at:
`https://supabase.com/dashboard/project/your-project-ref`

### Edge Function Logs

```bash
supabase functions logs create-payment
supabase functions logs oxapay-webhook
supabase functions logs merchant-api
```

### Updating the Application

```bash
git pull origin main
npm install
npm run build
# Deploy per your platform:
# - Amplify: auto on push
# - S3: aws s3 sync dist/ s3://bucket --delete
# - VPS: cp -r dist/* /var/www/html/
```

### Updating Edge Functions

```bash
supabase functions deploy function-name
```

---

## Troubleshooting

### CORS Errors

All edge functions include CORS headers. Ensure they have:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};
```

### Authentication Not Working
1. Check Site URL and Redirect URLs in Supabase Auth settings
2. Verify `.env.production` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Check browser console for errors

### Edge Functions Not Responding
```bash
supabase functions list          # Check status
supabase functions logs fn-name  # Check logs
supabase functions deploy fn-name  # Redeploy
```

### Hosted Payment Page URL Incorrect
- Set the `APP_URL` secret in Supabase edge function secrets to your frontend domain (e.g., `https://your-domain.com`)
- Without `APP_URL`, the function falls back to the request `Origin` header, then to a constructed URL from the Supabase project ID

### Database Connection Issues
1. Verify env variables are correct
2. Check RLS policies aren't blocking access
3. Review Supabase dashboard for errors

---

## Architecture

```
┌──────────────────────────────┐
│     Your Domain (CDN/Nginx)  │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│   React Frontend (Vite SPA)  │
│   (S3 / Amplify / VPS)      │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────┐
│                   Supabase                        │
│  ┌────────────┐ ┌──────────┐ ┌─────────────────┐ │
│  │ PostgreSQL │ │   Auth   │ │ Edge Functions   │ │
│  │ (Database) │ │  (JWT)   │ │ - merchant-api   │ │
│  │            │ │          │ │ - create-payment │ │
│  │            │ │          │ │ - oxapay-webhook │ │
│  │            │ │          │ │ - settlements    │ │
│  └────────────┘ └──────────┘ └─────────────────┘ │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │   OxaPay API    │
              │  (Blockchain)   │
              └─────────────────┘
```

---

## Cost Estimates

| Service | Free Tier | Production |
|---------|-----------|------------|
| Supabase | 500MB DB, 1GB bandwidth | Pro $25/mo (8GB DB, 50GB bandwidth, daily backups) |
| AWS Amplify | — | ~$5-20/mo |
| AWS S3 + CloudFront | — | ~$5-15/mo |
| Vercel | Free tier available | Pro $20/mo |
| VPS (DO/EC2) | — | $5-20/mo |
