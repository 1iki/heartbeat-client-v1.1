# 🔒 Panduan Keamanan - Credential Management

## ⚠️ PENTING: Jangan Pernah Commit Credentials ke Git!

### 📋 Checklist Keamanan
- ✅ File `.env` dan `.env.local` sudah masuk `.gitignore`
- ✅ File `*.json` (service account) sudah masuk `.gitignore`
- ✅ File `config/nodes.json` sudah masuk `.gitignore`
- ✅ Gunakan `.env.example` sebagai template

---

## 🔑 Setup Google Cloud Service Account

### Metode 1: Environment Variables (RECOMMENDED ⭐)

#### 1. Buat Service Account di Google Cloud Console
```
1. Buka https://console.cloud.google.com/
2. Pilih project Anda
3. Navigation Menu → IAM & Admin → Service Accounts
4. CREATE SERVICE ACCOUNT
5. Berikan nama dan deskripsi
6. Grant role: "Google Sheets API User" atau "Editor"
7. CREATE KEY → JSON → Download
```

#### 2. Extract Credentials dari JSON
Buka file JSON yang didownload, kemudian copy nilai-nilai berikut:
- `client_email`: Email service account
- `private_key`: Private key (termasuk -----BEGIN/END PRIVATE KEY-----)

#### 3. Setup Environment Variables

**Development (Local):**
```bash
# Buat file .env.local (JANGAN commit file ini!)
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Google Service Account Credentials
GOOGLE_SERVICE_ACCOUNT_EMAIL=monitoring-sheet@jovial-current-391617.iam.gserviceaccount.com

# IMPORTANT: Escape newlines dengan \\n
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC...\\n-----END PRIVATE KEY-----\\n"

# Optional: Spreadsheet Configuration
GOOGLE_SPREADSHEET_ID=1_yFrfNIlwRXPHBsmWo_gBuYxudstnOQeBfyk-YHWd1U
GOOGLE_SHEET_NAME=Hasil
```

**Production (Vercel/Cloud):**
```bash
# Tambahkan di Vercel Dashboard:
# Settings → Environment Variables

GOOGLE_SERVICE_ACCOUNT_EMAIL=your-email@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nMultiline\nKey\n-----END PRIVATE KEY-----\n"
```

#### 4. Verifikasi Setup
```bash
# Cek environment variables
node -e "console.log(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? '✅ Email found' : '❌ Email missing')"
node -e "console.log(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ? '✅ Private key found' : '❌ Private key missing')"
```

---

### Metode 2: File JSON (TIDAK DIREKOMENDASIKAN)

Jika tetap ingin menggunakan file JSON (untuk development lokal saja):

```bash
# 1. Copy template
cp CONTOH/CONTOH1/monitoring-tes.json.template CONTOH/CONTOH1/monitoring-tes.json

# 2. Edit file dan isi dengan credentials
# JANGAN COMMIT FILE INI!

# 3. File ini sudah masuk .gitignore, pastikan tidak ter-track:
git status # Pastikan monitoring-tes.json tidak muncul
```

---

## 🗄️ Setup MongoDB Credentials

### Development (Local)
```env
# .env.local
MONGODB_URI=mongodb://localhost:27017/monitoring
```

### Production (MongoDB Atlas)
```env
# Vercel Environment Variables
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/monitoring?retryWrites=true&w=majority
```

**⚠️ JANGAN hardcode connection string di code!**

---

## 🔐 Setup NextAuth Secret

### Generate Secret
```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Setup
```env
# .env.local
NEXTAUTH_SECRET=your-generated-secret-here
NEXTAUTH_URL=http://localhost:3000

# Production
NEXTAUTH_URL=https://your-domain.com
```

---

## 🚨 Jika Credentials Ter-commit ke Git

### Langkah Recovery:

1. **Revoke credentials lama IMMEDIATELY:**
   ```
   - Google Cloud: Hapus Service Account atau Rotate keys
   - MongoDB: Ganti password user
   - NextAuth: Generate secret baru
   ```

2. **Hapus dari Git history:**
   ```bash
   # Remove file dari commit
   git rm --cached path/to/sensitive-file.json
   
   # Amend commit
   git commit --amend --no-edit
   
   # Force push (HATI-HATI!)
   git push --force-with-lease origin main
   ```

3. **Generate credentials baru**

4. **Setup di environment variables**

---

## ✅ Best Practices

### DO ✅
- ✅ Gunakan environment variables untuk semua credentials
- ✅ Gunakan `.env.local` untuk development lokal
- ✅ Gunakan secret manager (Vercel, AWS Secrets Manager) untuk production
- ✅ Rotate credentials secara berkala
- ✅ Review `.gitignore` sebelum commit
- ✅ Gunakan `git status` untuk cek file yang akan di-commit
- ✅ Setup branch protection rules di GitHub

### DON'T ❌
- ❌ Commit file `.env`, `.env.local`, `.env.production`
- ❌ Commit file `*.json` yang berisi credentials
- ❌ Hardcode credentials di code
- ❌ Share credentials via chat/email
- ❌ Gunakan credentials production untuk development
- ❌ Commit `config/nodes.json` yang berisi auth tokens

---

## 🔍 Audit Checklist

Sebelum push ke Git:
```bash
# 1. Check status
git status

# 2. Check diff
git diff

# 3. Check untuk credentials
git diff | grep -i "password\|secret\|key\|token"

# 4. Verify .gitignore
cat .gitignore | grep -E "\.env|\.json"

# 5. Test commit (jangan push dulu)
git commit -m "test commit"

# 6. Review perubahan
git log -1 --stat
```

---

## 📚 Resources

- [Google Cloud Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)

---

## 🆘 Need Help?

Jika credentials ter-leak atau ada pertanyaan:
1. Revoke credentials IMMEDIATELY
2. Contact team lead
3. Review security checklist
4. Setup monitoring untuk suspicious activity
