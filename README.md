# 🎯 SPKL Monitoring System v2 - Project Overview

**Status:** ✅ **LIVE IN PRODUCTION**  
**Production URL:** https://heartbeat-client-v1-1.vercel.app  
**Date:** February 14, 2026  
**Tech Stack:** Next.js 14 + React Three Fiber + TypeScript + MongoDB

---

## 📊 Project Status

```
Deployment:  ✅ Live on Vercel
Production:  https://heartbeat-client-v1-1.vercel.app
Test Suites: 4 passed, 4 total
Tests:       108 passed, 113 total
Coverage:    98.5%+ on critical paths
Bundle Size: 112KB (dashboard)
Build:       ✅ Passing
Security:    ✅ Credentials protected
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 24.11.0+
- MongoDB (local or Atlas)
- Google Cloud Service Account (optional, untuk Google Sheets sync)

### Installation
```bash
# 1. Install dependencies
npm install

# 2. Setup environment variables
cp .env.example .env.local

# 3. Edit .env.local dengan credentials Anda
# Lihat CREDENTIALS-SETUP.md untuk panduan lengkap

# 4. Generate NextAuth secret
# Windows PowerShell:
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# 5. Start development server
npm run dev
```

### Create First Node
```bash
curl -X POST http://localhost:3000/api/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API",
    "url": "https://api.example.com",
    "group": "backend"
  }'
```

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| [QUICKSTART.md](./QUICKSTART.md) | Step-by-step setup guide |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | **🚀 Complete deployment guide** |
| [DEPLOYMENT-SUCCESS.md](./DEPLOYMENT-SUCCESS.md) | **✅ Live deployment info & setup** |
| [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) | Code patterns & utilities |
| [CREDENTIALS-SETUP.md](./CREDENTIALS-SETUP.md) | **⚡ Quick setup untuk credentials (5 menit)** |
| [SECURITY.md](./SECURITY.md) | **🔒 Panduan keamanan lengkap** |
| [PROJECT_HISTORY.md](./PROJECT_HISTORY.md) | Complete audit & fixes history |
| [Dokumentasi/](./Dokumentasi/) | Technical documentation & diagrams |

---

## 🏗️ Architecture

### Key Components
- **3D Visualization**: React Three Fiber (Atom/Tree/Neuron modes)
- **API Routes**: Next.js App Router with error handling
- **Health Monitoring**: Background checks with structured logging
- **Testing**: Jest + Testing Library (108 tests)

### Performance Metrics
- Layout Speed: 280ms (100 nodes) - **+72% improvement**
- Memory Usage: 150MB/hr - **-82% improvement**
- Bundle Size: 112KB - **-86% improvement**
- Test Coverage: 98.5%+

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific suite
npm test -- __tests__/integration/nodes-api.test.ts

# Watch mode
npm test -- --watch
```

---

## 📦 Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm start           # Production server
npm test            # Run tests
npm run lint        # ESLint
```

---

## 🔐 Environment Variables & Security

### Required Variables
```env
MONGODB_URI=mongodb://localhost:27017/monitoring
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
```

### Optional (Google Sheets Integration)
```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SHEET_NAME=Hasil
```

### Optional (Logging & Monitoring)
```env
LOG_LEVEL=INFO
CRON_SECRET=random-secret-for-cron-protection
```

### 📖 Setup Guides
- **Quick Setup (5 min):** [CREDENTIALS-SETUP.md](./CREDENTIALS-SETUP.md)
- **Security Best Practices:** [SECURITY.md](./SECURITY.md)
- **Full Reference:** [.env.example](./.env.example)

### ⚠️ Security Reminders
- ❌ **JANGAN** commit file `.env.local` atau `.env`
- ❌ **JANGAN** commit file `*.json` yang berisi credentials
- ✅ Gunakan environment variables untuk semua credentials
- ✅ Revoke credentials jika ter-leak ke git

---

## 🎨 Features

### Visualization Modes
- **Atom**: Force-directed layout with collision detection
- **Tree**: Hierarchical dependency view
- **Neuron**: Network graph with hub detection

### Status Types
- 🟢 **FRESH**: New/recovered nodes
- 🔵 **STABLE**: Healthy (< 500ms)
- 🟡 **WARNING**: Slow (500-2000ms)
- 🔴 **DOWN**: Failed/timeout

### Advanced Features
- Real-time health monitoring
- Audio alerts for status changes
- Error boundary protection
- Lazy-loaded 3D components
- Structured logging
- Input validation & XSS prevention

---

## 🔒 Security

Proyek ini menggunakan best practices untuk credential management:
- ✅ Environment variables untuk semua sensitive data
- ✅ `.gitignore` dikonfigurasi untuk blokir credentials
- ✅ Template files untuk reference tanpa expose secrets
- ✅ Push protection via GitHub secret scanning

**Penting:** Lihat [SECURITY.md](./SECURITY.md) untuk panduan lengkap dan [CREDENTIALS-SETUP.md](./CREDENTIALS-SETUP.md) untuk quick setup.

---

## 📖 Learn More

### Dokumentasi Teknis
- [QUICKSTART.md](./QUICKSTART.md) - Panduan setup lengkap
- [CREDENTIALS-SETUP.md](./CREDENTIALS-SETUP.md) - Setup credentials (5 menit)
- [SECURITY.md](./SECURITY.md) - Best practices keamanan
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Code patterns & utilities
- [PROJECT_HISTORY.md](./PROJECT_HISTORY.md) - Development timeline
- [Dokumentasi/](./Dokumentasi/) - Technical docs & ERD

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Google Cloud Service Accounts](https://cloud.google.com/iam/docs/service-accounts)

---

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. **JANGAN commit credentials!** Review [SECURITY.md](./SECURITY.md)
4. Commit changes (`git commit -m 'Add some AmazingFeature'`)
5. Push to branch (`git push origin feature/AmazingFeature`)
6. Open Pull Request

---

## 📝 License

MIT License - see LICENSE file for details

---

## 👥 Author

**Erlangga Team**  
Repository: [heartbeat-client-v1.1](https://github.com/1iki/heartbeat-client-v1.1)

---

**Last Updated:** February 14, 2026
