# 🚀 Deployment Guide - Vercel

## Prerequisites

- GitHub repository sudah di-push
- Account Vercel (sign up di https://vercel.com)
- MongoDB Atlas URI (untuk production database)
- Google Cloud Service Account (optional, untuk Google Sheets)

---

## 📋 Quick Deploy (Recommended)

### 1. Deploy via Vercel Dashboard

```bash
# 1. Buka https://vercel.com/new
# 2. Import your GitHub repository
# 3. Configure project settings:
#    - Framework Preset: Next.js
#    - Root Directory: ./
#    - Build Command: npm run build
#    - Output Directory: .next
```

### 2. Setup Environment Variables

Di Vercel Dashboard → Settings → Environment Variables, tambahkan:

#### Required Variables
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/monitoring
NEXTAUTH_SECRET=your-generated-secret-here
NEXTAUTH_URL=https://your-app.vercel.app
```

#### Optional (Google Sheets)
```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nMultiline\nKey\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SHEET_NAME=Hasil
```

#### Optional (Monitoring & Logging)
```env
LOG_LEVEL=INFO
CRON_SECRET=random-secret-for-cron-protection
```

### 3. Deploy!

```bash
# Vercel akan otomatis:
# - Detect Next.js framework
# - Install dependencies
# - Run build
# - Deploy to production
```

---

## 🔧 Deploy via CLI (Alternative)

### 1. Install Vercel CLI

```powershell
# Global install
npm install -g vercel

# Atau gunakan npx (tidak perlu install global)
npx vercel --version
```

### 2. Login ke Vercel

```bash
vercel login
# Follow instructions untuk authenticate
```

### 3. Initialize Project

```bash
# Di root directory project
vercel

# Jawab pertanyaan:
# ? Set up and deploy "~/path/to/project"? [Y/n] Y
# ? Which scope do you want to deploy to? Your-Name
# ? Link to existing project? [y/N] N
# ? What's your project's name? heartbeat-monitoring
# ? In which directory is your code located? ./
# ? Want to override the settings? [y/N] N
```

### 4. Setup Environment Variables via CLI

```bash
# Add production variables
vercel env add MONGODB_URI production
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production

# Add optional variables
vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL production
vercel env add GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY production
vercel env add LOG_LEVEL production
```

### 5. Deploy to Production

```bash
# Deploy to production
vercel --prod

# Atau untuk preview deployment
vercel
```

---

## 🔍 Verify Deployment

### 1. Check Build Logs

```bash
# Via CLI
vercel logs

# Via Dashboard
# https://vercel.com/your-username/project-name/deployments
```

### 2. Test Endpoints

```bash
# Test API
curl https://your-app.vercel.app/api/nodes

# Test health check
curl https://your-app.vercel.app/api/health

# Test cron endpoint (requires CRON_SECRET)
curl https://your-app.vercel.app/api/cron/check
```

### 3. Monitor Application

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Analytics**: https://vercel.com/your-username/project-name/analytics
- **Logs**: https://vercel.com/your-username/project-name/logs

---

## 🎯 Domain Setup (Optional)

### 1. Add Custom Domain

```bash
# Via CLI
vercel domains add yourdomain.com

# Via Dashboard
# Settings → Domains → Add Domain
```

### 2. Configure DNS

```
# Add these records to your DNS provider:
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 3. Update NEXTAUTH_URL

```env
# Update di Vercel environment variables
NEXTAUTH_URL=https://yourdomain.com
```

---

## 🔐 MongoDB Atlas Setup

### 1. Create Cluster

```
1. Buka https://cloud.mongodb.com
2. Create New Cluster (pilih Free tier)
3. Choose region terdekat (Singapore untuk Asia)
4. Create Cluster
```

### 2. Setup Database User

```
1. Database Access → Add New Database User
2. Authentication Method: Password
3. Username: monitoring_user
4. Password: (generate secure password)
5. Database User Privileges: Read and write to any database
```

### 3. Network Access

```
1. Network Access → Add IP Address
2. Allow Access From Anywhere: 0.0.0.0/0
   (Untuk production, batasi ke IP Vercel)
3. Confirm
```

### 4. Get Connection String

```
1. Database → Connect → Connect your application
2. Driver: Node.js
3. Version: 4.1 or later
4. Copy connection string:
   mongodb+srv://monitoring_user:<password>@cluster0.xxxxx.mongodb.net/monitoring?retryWrites=true&w=majority
5. Replace <password> dengan password user Anda
```

---

## ⚙️ Advanced Configuration

### Enable Cron Jobs (Requires Pro Plan)

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/check",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Custom Build Settings

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

### Regional Deployment

```json
// vercel.json
{
  "regions": ["sin1"]  // Singapore region
}
```

---

## 🐛 Troubleshooting

### Build Failed

```bash
# Check build logs
vercel logs

# Common issues:
# 1. Missing environment variables
# 2. TypeScript errors
# 3. ESLint errors
# 4. Missing dependencies

# Fix dan redeploy
git add .
git commit -m "Fix build errors"
git push origin main
```

### MongoDB Connection Failed

```bash
# Check:
# 1. Connection string format
# 2. Database user credentials
# 3. Network access (IP whitelist)
# 4. Database name in connection string

# Test locally first
MONGODB_URI="your-connection-string" npm run dev
```

### Environment Variables Not Working

```bash
# Verify variables are set
vercel env ls

# Re-add variable
vercel env rm MONGODB_URI production
vercel env add MONGODB_URI production

# Redeploy
vercel --prod
```

### Cron Jobs Not Running

```bash
# Cron jobs require Vercel Pro plan
# Alternative: Use external cron service
# - https://cron-job.org
# - https://uptimerobot.com
# - https://cronhub.io

# Setup external cron to hit:
# https://your-app.vercel.app/api/cron/check
```

---

## 📊 Monitoring & Maintenance

### Performance Monitoring

```bash
# Vercel Analytics (built-in)
https://vercel.com/your-username/project-name/analytics

# Web Vitals monitoring
# Speed Insights (otomatis enabled)
```

### Log Monitoring

```bash
# Real-time logs
vercel logs --follow

# Filter by function
vercel logs api/nodes

# Filter by status
vercel logs --status=error
```

### Deployment Rollback

```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel rollback deployment-url

# Via Dashboard
# Deployments → Select deployment → Promote to Production
```

---

## 🎉 Post-Deployment Checklist

- ✅ Build successful dan aplikasi accessible
- ✅ Environment variables configured
- ✅ MongoDB connection working
- ✅ API endpoints responding
- ✅ Authentication working (NextAuth)
- ✅ Google Sheets sync working (jika digunakan)
- ✅ Health check endpoint responding
- ✅ Error monitoring active
- ✅ Custom domain configured (optional)
- ✅ Analytics monitoring setup

---

## 📚 Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)

---

## 🆘 Support

**Issues?** Open issue di repository atau contact:
- Vercel Support: https://vercel.com/support
- MongoDB Atlas Support: https://support.mongodb.com/

---

**Last Updated:** February 14, 2026
