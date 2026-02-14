# Visual Monitoring Platform

A production-ready particle-based visual monitoring system that represents website and service health as living visual entities using Three.js.

## 🌟 Features

- **Living Visual Entities**: Each monitored service is represented as a fuzzy-edged particle circle
- **Real-time Monitoring**: Automated health checks every 5 minutes with status updates
- **Multiple Visualization Modes**:
  - **Atom**: Force-directed overview with collision detection
  - **Tree**: Hierarchical dependency view with Bezier curves
  - **Neuron**: 3D network graph with glowing synapses
- **Status-based Animations**: Visual feedback through breathing, pulsing, jittering, and dispersion effects
- **Admin Interface**: Protected CRUD system for managing monitored URLs
- **Performance Optimized**: Particle instance reuse, mobile LOD system, 60fps target

## 🛠️ Tech Stack

### Frontend
- **Next.js 14+** (App Router)
- **React 18** + TypeScript
- **@react-three/fiber** (Three.js wrapper)
- **Tailwind CSS** (custom status colors)
- **Zustand** (state management)
- **SWR** (data polling)

### Backend
- **Next.js API Routes** (Node.js)
- **MongoDB + Mongoose** (data storage)
- **Vercel Cron** (scheduled health checks)

## 📦 Installation

1. **Clone the repository**
   ```bash
   cd v2-reactjs
   npm install
   ```

2. **Set up environment variables**
   
   Create `.env.local` file:
   ```bash
   cp .env.local.example .env.local
   ```

   Configure the following:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/monitoring
   NEXTAUTH_SECRET=your-generated-secret
   NEXTAUTH_URL=http://localhost:3000
   CRON_SECRET=your-cron-secret
   ```

3. **Generate secrets**
   ```bash
   # For NEXTAUTH_SECRET
   openssl rand -base64 32
   
   # For CRON_SECRET
   openssl rand -hex 16
   ```

## 🚀 Usage

### Development
```bash
npm run dev
```

Visit `http://localhost:3000` - you'll be redirected to `/dashboard`

### Production Build
```bash
npm run build
npm start
```

## 📊 Adding Monitored URLs

1. Navigate to `/admin/urls`
2. Click "Add URL"
3. Fill in:
   - **Name**: Service identifier
   - **URL**: Full URL to monitor
   - **Group**: Backend, Database, 3rd Party, etc.
   - **Dependencies**: Select parent services

## 🎨 Visualization Modes

### Atom Mode (Overview)
- Force-directed layout with d3-force
- Auto-focuses on DOWN nodes
- 360° orbit camera controls

### Tree Mode (Hierarchy)
- Hierarchical layout using dagre
- Shows primary dependencies (first dependency as parent)
- 2D pan/zoom controls
- Bezier curve connectors

### Neuron Mode (Network)
- Full dependency graph visualization
- Hub detection (larger nodes for highly connected services)
- Cinematic auto-rotating camera
- Glowing connection lines

## 🎯 Status Colors & Animations

| Status | Color | Hex | Animation |
|--------|-------|-----|-----------|
| **STABLE** | Blue | `#00A3FF` | Slow breathing (opacity) |
| **FRESH** | Green | `#00FF94` | Expanding pulse |
| **WARNING** | Yellow | `#FFD600` | High-frequency jitter |
| **DOWN** | Red | `#FF4842` | Strong pulse + dispersion |

## 🔧 Configuration

### Particle Counts
- Desktop: 2,000 particles/node (configurable up to 10,000)
- Mobile: 500 particles/node (automatic)

### Health Check Interval
Edit `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/check",
      "schedule": "*/5 * * * *"  // Every 5 minutes
    }
  ]
}
```

### Polling Interval
Edit `lib/constants/index.ts`:
```typescript
export const POLLING_CONFIG = {
  INTERVAL_MS: 5000,  // 5 seconds
  FOCUS_REVALIDATION: true,
};
```

## 📡 API Endpoints

- `GET /api/nodes` - Fetch all monitored nodes
- `POST /api/nodes` - Create new node
- `GET /api/nodes/[id]` - Fetch single node
- `PUT /api/nodes/[id]` - Update node
- `DELETE /api/nodes/[id]` - Delete node
- `POST /api/cron/check` - Trigger health checks (scheduled)

## 🏗️ Architecture

### Strict Separation of Concerns

**Backend (Visual-Agnostic)**
- Performs health checks
- Determines status (STABLE, FRESH, WARNING, DOWN)
- Stores data in MongoDB
- Exposes clean JSON APIs

**Frontend (Visualization Only)**
- Renders particle systems
- Calculates layouts
- Animates status changes
- Manages camera behavior
- NO health check logic

### Data Flow
```
Backend Health Check → MongoDB → API → SWR → Zustand → Three.js
```

## 🎭 Performance Tips

1. **Particle Count**: Start with 2,000, increase gradually
2. **Mobile Detection**: Automatic LOD system reduces particles
3. **No Object Destruction**: Particles are reused, only positions/colors update
4. **Audio Throttling**: Max 1 alert sound per 5 seconds

## 🚢 Deployment (Vercel)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Connect GitHub repository
   - Add environment variables
   - Deploy

3. **Verify Cron Jobs**
   - Check Vercel dashboard for cron execution
   - View logs in Vercel Functions

## 📝 Development Roadmap

- [x] Core particle visualization
- [x] Three layout modes
- [x] Health check system
- [x] Admin CRUD interface
- [ ] NextAuth.js authentication
- [ ] Toast notifications
- [ ] Audio alerts
- [ ] Side panel with details
- [ ] Google Sheets sync
- [ ] Bulk import

## 🤝 Contributing

This is a production implementation following the specification in `SPKL-MONITORING.md`.

## 📄 License

ISC

---

**Built with ❤️ using React, Next.js, and Three.js**
