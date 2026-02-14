# JSON-Based Node Configuration

## Overview

Mirip dengan cara Google Service Account disimpan di JSON, kita juga bisa menyimpan konfigurasi node monitoring (termasuk credentials) di file JSON.

## Setup

### 1. Copy Template
```powershell
# Windows
Copy-Item config\nodes.json.template config\nodes.json

# Linux/Mac
cp config/nodes.json.template config/nodes.json
```

### 2. Edit Configuration

Edit `config/nodes.json` dengan URLs dan credentials Anda:

```json
[
    {
        "name": "Admin Dashboard",
        "url": "https://mysite.com/admin",
        "group": "backend",
        "authConfig": {
            "requiresAuth": true,
            "loginUrl": "https://mysite.com/login",
            "loginType": "page",
            "username": "admin@mysite.com",
            "password": "secretpassword123"
        }
    }
]
```

### 3. Import to Database

```powershell
node scripts/importNodes.js
```

## Features

### ✅ Bulk Import
- Import banyak nodes sekaligus dari satu file JSON
- Auto-test authentication sebelum import
- Detailed progress dan error reporting

### ✅ Export/Backup
Backup konfigurasi yang sudah ada:
```powershell
node scripts/exportNodes.js
```

Output: `config/nodes-export.json`

### ✅ Migration
Pindahkan konfigurasi antar environment:
1. Export dari environment lama
2. Copy file ke environment baru  
3. Import di environment baru

## Configuration Format

```json
{
    "name": "Node Name",           // Required
    "url": "https://...",           // Required
    "group": "website",             // Required: website, backend, api, etc
    "authConfig": {
        "requiresAuth": true,       // Required
        "loginUrl": "https://...",  // Optional, defaults to url
        "loginType": "page",        // page | modal
        "username": "...",          // Required if requiresAuth
        "password": "...",          // Required if requiresAuth
        // Optional custom selectors:
        "usernameSelector": "#email",
        "passwordSelector": "#password",
        "submitSelector": "button[type='submit']",
        "modalTrigger": ".login-btn"  // For modal type
    }
}
```

## Security

⚠️ **CRITICAL SECURITY WARNINGS:**

1. **Never commit** `config/nodes.json` to git
   - File sudah ada di `.gitignore`
   - Contains plain text passwords!

2. **File permissions** (Linux/Mac):
   ```bash
   chmod 600 config/nodes.json
   ```

3. **Encryption** (Recommended):
   Untuk production, gunakan encrypted storage atau secrets manager

4. **Environment Variables** (Alternative):
   Bisa juga pakai environment variables:
   ```bash
   export NODES_CONFIG=$(cat config/nodes.json | base64)
   ```

## Examples

### Example 1: Multiple Sites with Different Auth
```json
[
    {
        "name": "Site A - Admin",
        "url": "https://sitea.com/admin",
        "group": "backend",
        "authConfig": {
            "requiresAuth": true,
            "loginUrl": "https://sitea.com/login",
            "loginType": "page",
            "username": "admin@sitea.com",
            "password": "pass123"
        }
    },
    {
        "name": "Site B - Dashboard",
        "url": "https://siteb.com/dashboard",
        "group": "website",
        "authConfig": {
            "requiresAuth": true,
            "loginUrl": "https://siteb.com",
            "loginType": "modal",
            "username": "user@siteb.com",
            "password": "pass456",
            "modalTrigger": "button.open-login"
        }
    }
]
```

### Example 2: Mixed (Auth + Public)
```json
[
    {
        "name": "Protected API",
        "url": "https://api.protected.com/status",
        "group": "api",
        "authConfig": {
            "requiresAuth": true,
            "username": "api_user",
            "password": "api_key_123"
        }
    },
    {
        "name": "Public Website",
        "url": "https://public-site.com",
        "group": "website",
        "authConfig": {
            "requiresAuth": false
        }
    }
]
```

## Troubleshooting

### Import fails with "Auth test failed"
- Verify credentials are correct
- Check if login URL is accessible
- Try adding custom selectors

### "Configuration file not found"
```powershell
# Make sure template exists
ls config\nodes.json.template

# Copy to nodes.json
Copy-Item config\nodes.json.template config\nodes.json
```

### Nodes created but auth not working
- Check console logs for Playwright errors
- Verify login selectors are correct
- Test individual node with test-auth endpoint

## Comparison with Direct API

| Method | Best For | Pros | Cons |
|--------|----------|------|------|
| **JSON Config** | Bulk import, migrations, backups | Easy to manage many nodes, version control (template), repeatable | Passwords in plain text file |
| **Direct API** | Single node, quick testing | More secure (in-memory), flexible | Manual for each node |
| **Frontend UI** | End users, production | User-friendly, no code needed | Not yet implemented |

## Next Steps

1. ✅ Create `config/nodes.json` from template
2. ✅ Add your URLs and credentials
3. ✅ Run `node scripts/importNodes.js`
4. ✅ Verify nodes in dashboard
5. ✅ Backup dengan `node scripts/exportNodes.js`
