# Quick Start Guide

## 🚀 Your Visual Monitoring Platform is Ready!

The development server is now running at **http://localhost:3000**

---

## ⚡ Immediate Next Steps

### 1. Set Up MongoDB (Required)

The platform needs a MongoDB database to store monitored nodes.

**Option A: MongoDB Atlas (Recommended)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Create a database user
4. Get your connection string
5. Add to `.env.local`:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/monitoring?retryWrites=true&w=majority
   ```

**Option B: Local MongoDB**
```bash
# Install MongoDB locally
# Then use:
MONGODB_URI=mongodb://localhost:27017/monitoring
```

### 2. Configure Environment Variables

Create `.env.local` file:
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
MONGODB_URI=your-mongodb-connection-string
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
CRON_SECRET=generate-with-openssl-rand-hex-16
```

Generate secrets:
```bash
# For NEXTAUTH_SECRET
openssl rand -base64 32

# For CRON_SECRET  
openssl rand -hex 16
```

### 3. Add Your First Monitoring Target

Once MongoDB is set up:

1. Navigate to http://localhost:3000/admin/urls
2. Click "Add URL" (currently placeholder - you can use API)
3. Or use curl:

```bash
curl -X POST http://localhost:3000/api/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Google",
    "url": "https://www.google.com",
    "group": "3rd Party",
    "dependencies": []
  }'
```

### 4. Trigger Health Check

```bash
curl http://localhost:3000/api/cron/check
```

### 5. View the Visualization

Navigate to http://localhost:3000/dashboard and watch your services come to life!

---

## 🎨 Using the Platform

### Visualization Modes

Switch between modes using the navbar:

**Overview (Atom Mode)**
- Force-directed layout
- Auto-focuses on DOWN nodes
- 360° orbit camera

**Hierarchy (Tree Mode)**
- Shows dependency tree
- Bezier curve connections
- 2D pan/zoom

**Network (Neuron Mode)**
- Full dependency graph
- Cinematic auto-rotate camera
- Hub detection

### Status Meanings

- 🟢 **FRESH** (Green): New or recently recovered
- 🔵 **STABLE** (Blue): Healthy, < 500ms latency
- 🟡 **WARNING** (Yellow): Slow (500-2000ms) or 4xx errors
- 🔴 **DOWN** (Red): Very slow (> 2s), timeout, or 5xx errors

---

## 🔧 Development Commands

```bash
# Start dev server (already running)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

---

## 📊 Example Data

Add multiple nodes to see the visualization modes in action:

```bash
# Backend Service
curl -X POST http://localhost:3000/api/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Auth Service",
    "url": "https://auth.example.com",
    "group": "Backend"
  }'

# Database
curl -X POST http://localhost:3000/api/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "PostgreSQL",
    "url": "https://db.example.com",
    "group": "Database"
  }'

# Frontend
curl -X POST http://localhost:3000/api/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Web App",
    "url": "https://app.example.com",
    "group": "Frontend",
    "dependencies": ["auth-service-id", "database-id"]
  }'
```

---

## 🐛 Troubleshooting

### Server won't start
- Check if port 3000 is available
- Verify all dependencies installed: `npm install`

### Blank screen on /dashboard
- Check browser console for errors
- Ensure WebGL is supported in your browser
- Try disabling browser extensions

### MongoDB connection errors
- Verify MONGODB_URI in `.env.local`
- Check network connectivity
- Ensure IP whitelist in MongoDB Atlas

### No nodes showing
- Check `/api/nodes` returns data: `curl http://localhost:3000/api/nodes`
- Verify MongoDB has data
- Check browser dev tools Network tab

---

## 🌐 Access Points

- **Dashboard**: http://localhost:3000/dashboard
- **Admin Panel**: http://localhost:3000/admin/urls  
- **API Docs**: See README.md for endpoint details

---

## 📚 Additional Resources

- **Full Documentation**: README.md
- **Implementation Details**: walkthrough.md
- **Architecture**: implementation_plan.md
- **Task Progress**: task.md

---

**Happy Monitoring! 🎉**

The platform is ready to visualize your services as living particle systems.
