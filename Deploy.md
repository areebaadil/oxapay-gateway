# Deployment Guide - Crypto Payment Gateway

This guide covers deploying the payment gateway to your own infrastructure, completely independent of Lovable.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Export Project from Lovable](#export-project-from-lovable)
3. [Supabase Setup](#supabase-setup)
4. [Environment Configuration](#environment-configuration)
5. [Deploy Edge Functions](#deploy-edge-functions)
6. [Frontend Deployment Options](#frontend-deployment-options)
7. [Domain & SSL Setup](#domain--ssl-setup)
8. [Production Checklist](#production-checklist)
9. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

Before starting, ensure you have:

- [ ] Node.js 18+ installed
- [ ] Git installed
- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] AWS CLI installed (if using AWS)
- [ ] A domain name for production
- [ ] OxaPay merchant account with API key

### Install Supabase CLI

```bash
npm install -g supabase
supabase --version
```

---

## Export Project from Lovable

### Option 1: GitHub Export (Recommended)

1. In Lovable, go to **Settings** → **GitHub**
2. Connect your GitHub account
3. Create a new repository or push to existing
4. Clone the repository locally:

```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

### Option 2: Download ZIP

1. In Lovable, go to **Settings** → **Export**
2. Download the project as ZIP
3. Extract to your local machine

---

## Supabase Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **New Project**
3. Fill in:
   - **Name**: `crypto-payment-gateway` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
4. Click **Create new project**
5. Wait for project to be ready (~2 minutes)

### Step 2: Get Project Credentials

From your Supabase dashboard, go to **Settings** → **API**:

```
Project URL: https://xxxxxxxxxxxxx.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ IMPORTANT**: Never expose the Service Role Key in frontend code!

### Step 3: Run Database Migrations

1. Link your local project to Supabase:

```bash
supabase login
supabase link --project-ref your-project-ref
```

2. Push all migrations:

```bash
supabase db push
```

Or manually run migrations in SQL Editor:

1. Go to **SQL Editor** in Supabase dashboard
2. Open each file in `supabase/migrations/` in order
3. Execute each migration

### Step 4: Configure Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure settings:
   - ✅ Enable email confirmations (production)
   - ❌ Disable email confirmations (development/testing)

4. Go to **Authentication** → **URL Configuration**
5. Set:
   - **Site URL**: `https://your-domain.com`
   - **Redirect URLs**: `https://your-domain.com/*`

### Step 5: Set Up Secrets

Go to **Settings** → **Edge Functions** → **Secrets**:

| Secret Name | Description |
|-------------|-------------|
| `OXAPAY_MERCHANT_API_KEY` | Your OxaPay merchant API key |

Add each secret with its value.

---

## Environment Configuration

### Create Production Environment File

Create `.env.production` in your project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-ref
```

### Update Supabase Client (if needed)

Verify `src/integrations/supabase/client.ts` uses environment variables:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## Deploy Edge Functions

### Step 1: Update Edge Function URLs

In each edge function, update any hardcoded URLs to use environment variables:

```typescript
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
```

### Step 2: Deploy Functions

```bash
# Deploy all functions
supabase functions deploy

# Or deploy individually
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
supabase functions deploy seed-users
```

### Step 3: Verify Deployment

```bash
supabase functions list
```

---

## Frontend Deployment Options

### Option A: AWS Amplify (Recommended)

#### Step 1: Push to GitHub

```bash
git add .
git commit -m "Production ready"
git push origin main
```

#### Step 2: Set Up Amplify

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)
2. Click **New app** → **Host web app**
3. Select **GitHub** and authorize
4. Choose your repository and branch
5. Configure build settings:

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

6. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`

7. Click **Save and deploy**

### Option B: AWS S3 + CloudFront

#### Step 1: Create S3 Bucket

```bash
aws s3 mb s3://your-payment-gateway-bucket --region us-east-1
```

#### Step 2: Configure Bucket for Static Hosting

```bash
aws s3 website s3://your-payment-gateway-bucket \
  --index-document index.html \
  --error-document index.html
```

#### Step 3: Build and Upload

```bash
# Build the project
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-payment-gateway-bucket --delete
```

#### Step 4: Create CloudFront Distribution

1. Go to [CloudFront Console](https://console.aws.amazon.com/cloudfront)
2. Click **Create distribution**
3. Configure:
   - **Origin domain**: your-bucket.s3.amazonaws.com
   - **Viewer protocol policy**: Redirect HTTP to HTTPS
   - **Default root object**: index.html
4. Add custom error response for SPA routing:
   - **HTTP error code**: 403
   - **Response page path**: /index.html
   - **HTTP response code**: 200

### Option C: Vercel

#### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 2: Deploy

```bash
vercel --prod
```

#### Step 3: Add Environment Variables

In Vercel dashboard → Settings → Environment Variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### Option D: DigitalOcean App Platform

1. Go to [DigitalOcean Apps](https://cloud.digitalocean.com/apps)
2. Click **Create App**
3. Connect GitHub repository
4. Configure:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add environment variables
6. Deploy

### Option E: Self-Hosted (VPS/EC2)

#### Step 1: Set Up Server

```bash
# Connect to your server
ssh user@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
sudo apt-get install -y nginx

# Install PM2 (optional, for process management)
npm install -g pm2
```

#### Step 2: Deploy Application

```bash
# Clone repository
git clone https://github.com/your-username/your-repo.git
cd your-repo

# Install dependencies
npm install

# Build
npm run build

# Copy build to Nginx
sudo cp -r dist/* /var/www/html/
```

#### Step 3: Configure Nginx

Create `/etc/nginx/sites-available/payment-gateway`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/html;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/payment-gateway /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Domain & SSL Setup

### For AWS CloudFront

1. Request SSL certificate in ACM (us-east-1 region)
2. Add certificate to CloudFront distribution
3. Update Route 53 or your DNS with CloudFront domain

### For Self-Hosted (Certbot)

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## Production Checklist

### Security

- [ ] Change all default passwords
- [ ] Enable RLS on all tables (already configured)
- [ ] Review and test RLS policies
- [ ] Use HTTPS everywhere
- [ ] Set secure cookie options
- [ ] Enable rate limiting on edge functions
- [ ] Set up WAF (Web Application Firewall)

### Performance

- [ ] Enable CDN caching
- [ ] Optimize images
- [ ] Enable Gzip compression
- [ ] Set appropriate cache headers

### Monitoring

- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure uptime monitoring
- [ ] Set up log aggregation
- [ ] Create alerting rules

### Backup

- [ ] Enable Supabase Point-in-Time Recovery
- [ ] Schedule regular backups
- [ ] Test backup restoration

### OxaPay Configuration

1. Log into OxaPay dashboard
2. Update webhook URL to:
   ```
   https://your-project-ref.supabase.co/functions/v1/oxapay-webhook
   ```
3. Copy webhook secret for HMAC validation

---

## Monitoring & Maintenance

### Supabase Dashboard

Access at: `https://supabase.com/dashboard/project/your-project-ref`

- Monitor database usage
- View edge function logs
- Check authentication logs

### Edge Function Logs

```bash
supabase functions logs create-payment
supabase functions logs oxapay-webhook
```

### Database Backups

Supabase Pro plan includes:
- Daily backups (7 days retention)
- Point-in-Time Recovery

### Updating the Application

```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Build
npm run build

# Deploy (varies by platform)
# AWS Amplify: Automatic on git push
# S3: aws s3 sync dist/ s3://bucket --delete
# VPS: Copy to /var/www/html/
```

---

## Troubleshooting

### Common Issues

#### 1. CORS Errors

Ensure edge functions have proper CORS headers:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

#### 2. Authentication Not Working

1. Check Site URL in Supabase Auth settings
2. Verify redirect URLs include your domain
3. Check browser console for errors

#### 3. Edge Functions Not Responding

```bash
# Check function status
supabase functions list

# View logs
supabase functions logs function-name

# Redeploy
supabase functions deploy function-name
```

#### 4. Database Connection Issues

1. Check connection string in environment variables
2. Verify RLS policies aren't blocking access
3. Check Supabase dashboard for errors

---

## Support Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [AWS Amplify Docs](https://docs.amplify.aws/)
- [OxaPay API Documentation](https://oxapay.com/docs)

---

## Removing Lovable Branding

The exported code is standard React/Vite with no Lovable branding. To ensure complete independence:

1. **Remove meta tags** (if any):
   Check `index.html` for any Lovable references

2. **Update package.json**:
   ```json
   {
     "name": "your-company-payment-gateway",
     "version": "1.0.0",
     "author": "Your Company"
   }
   ```

3. **Update README.md**:
   Replace with your own documentation

4. **Check for comments**:
   Search codebase for "lovable" and remove any references

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Your Domain                              │
│                    (CloudFront/Nginx/etc)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     React Frontend                               │
│                   (S3/Amplify/VPS)                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Database   │  │    Auth     │  │    Edge Functions       │  │
│  │ PostgreSQL  │  │   (JWT)     │  │  - create-payment       │  │
│  │             │  │             │  │  - merchant-api         │  │
│  │             │  │             │  │  - oxapay-webhook       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       OxaPay API                                 │
│                  (Blockchain Processor)                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Cost Estimates

### Supabase (Pro Plan Recommended for Production)

- **Free**: 500MB database, 1GB bandwidth
- **Pro ($25/mo)**: 8GB database, 50GB bandwidth, daily backups

### AWS Amplify

- **Build minutes**: $0.01/min
- **Hosting**: $0.15/GB served
- Typical: $5-20/month

### AWS S3 + CloudFront

- **S3**: ~$0.023/GB storage
- **CloudFront**: ~$0.085/GB transfer
- Typical: $5-15/month

### VPS (DigitalOcean/AWS EC2)

- **Basic Droplet/Instance**: $5-20/month
- **With Load Balancer**: $10-50/month

---

**Deployment Complete!** 🚀

Your payment gateway is now running on your own infrastructure, completely independent of Lovable.
