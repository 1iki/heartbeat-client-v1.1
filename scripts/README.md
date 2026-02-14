# Testing Authentication dengan Script

## Setup

1. **Copy file example ke .env.test:**
```powershell
Copy-Item .env.test.example .env.test
```

2. **Edit .env.test dengan credentials Anda:**
```bash
TEST_URL=https://your-actual-site.com/dashboard
LOGIN_URL=https://your-actual-site.com/login
TEST_USERNAME=your-real-username
TEST_PASSWORD=your-real-password
```

3. **Run test script:**
```powershell
node scripts/createAuthNode.js
```

## Cara Pakai (Tanpa file .env)

Alternatif: Set environment variables langsung di terminal:

```powershell
# PowerShell (Windows)
$env:TEST_URL="https://example.com/dashboard"
$env:LOGIN_URL="https://example.com/login"
$env:TEST_USERNAME="your-username"
$env:TEST_PASSWORD="your-password"

# Run test
node scripts/createAuthNode.js

# Clear credentials setelah selesai (PENTING!)
Remove-Item Env:\TEST_USERNAME
Remove-Item Env:\TEST_PASSWORD
```

## Apa yang Dilakukan Script

1. ✅ Test authentication configuration via API
2. ✅ Create node dengan auth config
3. ✅ Trigger health check
4. ✅ Verify node status

## Troubleshooting

### "Authentication test failed"
- Periksa credentials apakah benar
- Pastikan login URL accessible
- Coba tambahkan custom selectors jika form login unique

### "Failed to create node"
- Pastikan MongoDB running
- Check API server berjalan di port 3000
- Verify URL format valid

### "Health check failed" 
- Login mungkin gagal (cek credentials)
- Timeout terlalu pendek untuk site yang lambat
- Form login berubah struktur (perlu custom selectors)

## Security

⚠️ **PENTING:**
- Jangan commit file `.env.test` ke git!
- Clear environment variables setelah testing
- Gunakan credentials testing, bukan production

File `.env.test` sudah ada di `.gitignore`
