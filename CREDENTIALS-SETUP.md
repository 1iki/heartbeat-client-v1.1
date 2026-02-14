# 🔐 Quick Setup Guide - Credentials

## Langkah Cepat (5 menit)

### 1. Setup Google Cloud Service Account

```bash
# 1. Copy environment template
cp .env.example .env.local

# 2. Buka Google Cloud Console dan download Service Account JSON
# https://console.cloud.google.com/iam-admin/serviceaccounts
```

### 2. Extract Credentials dari JSON

Dari file JSON yang didownload, copy nilai ini:

```json
{
  "client_email": "monitoring-sheet@project.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQI...\n-----END PRIVATE KEY-----\n"
}
```

### 3. Setup Environment Variables

Edit `.env.local`:

```env
# Google Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL=monitoring-sheet@project.iam.gserviceaccount.com

# IMPORTANT: Ganti \n dengan \\n (double backslash)
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvQI...\\n-----END PRIVATE KEY-----\\n"

# Spreadsheet Config
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SHEET_NAME=Hasil

# MongoDB
MONGODB_URI=mongodb://localhost:27017/monitoring

# NextAuth
NEXTAUTH_SECRET=generate-dengan-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
```

### 4. Generate NextAuth Secret

```powershell
# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### 5. Verify Setup

```bash
# Start development server
npm run dev

# Check console untuk konfirmasi:
# ✅ "Google Sheets initialized with Service Account"
# ✅ "MongoDB connected"
```

---

## ⚠️ JANGAN LUPA!

- ❌ **JANGAN** commit file `.env.local`
- ❌ **JANGAN** commit file `*.json` yang berisi credentials
- ✅ Gunakan `.env.local` untuk development
- ✅ Setup environment variables di Vercel untuk production

---

## 📚 Dokumentasi Lengkap

Lihat [SECURITY.md](./SECURITY.md) untuk panduan keamanan lengkap.
