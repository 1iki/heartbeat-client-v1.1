# Dokumentasi Teknis: Visual Monitoring Platform

## 1. Gambaran Umum Proyek
**Visual Monitoring Platform** adalah aplikasi pemantauan status sistem *real-time* yang mengutamakan visual. Aplikasi ini merepresentasikan layanan yang dipantau (*nodes*) sebagai entitas visual yang dinamis, memungkinkan operator untuk mengetahui kesehatan sistem secara instan melalui visualisasi organik, bukan tabel statis.

## 2. Stack Teknologi

### Frontend
-   **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
-   **UI Library**: [React 18](https://react.dev/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) + Custom CSS Variables
-   **State Management**: [Zustand](https://github.com/pmndrs/zustand)
-   **3D Visualization**: [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/) (Three.js)
-   **2D Visualization**: [D3.js](https://d3js.org/)
-   **Animations**: [Framer Motion](https://www.framer.com/motion/)

### Backend
-   **Runtime**: [Node.js](https://nodejs.org/) (via Next.js API Routes)
-   **Database**: [MongoDB](https://www.mongodb.com/) (Mongoose ODM)
-   **Browser Automation**: [Playwright](https://playwright.dev/) (untuk *authenticated health checks*)

---

## 3. Arsitektur Sistem

```mermaid
graph TD
    User[User / Operator] -->|HTTP / WebSocket| FE[Frontend (Next.js)]
    FE -->|API Calls (SWR)| API[API Routes (/api/nodes)]
    
    subgraph "Backend Layer"
        API -->|Read/Write| DB[(MongoDB)]
        
        Cron[Interval / Polling] -->|Trigger| HealthService[Health Check Service]
        HealthService -->|Simple HTTP| Target1[Public Service]
        HealthService -->|Playwright| Target2[Auth Protected Service]
        
        HealthService -->|Update Status| DB
    end
    
    subgraph "Frontend Layer"
        Store[Zustand Store] -->|Sync| Views
        Views -->|3D Render| Atom[Atom Mode (Three.js)]
        Views -->|D3 Render| Vector[Bubble Mode (D3)]
        Views -->|2D DOM| Alerts[Alerts Mode (DOM)]
    end
```

---

## 4. Analisis Backend

### 4.1. Core Data Model (`Node.ts`)
Skema `Node` adalah entitas pusat, dirancang agar bersifat *visual-agnostic*. Skema ini menyimpan:
-   **Identity**: `name`, `url`, `group`
-   **State**: `status` (STABLE, FRESH, WARNING, DOWN), `latency`, `history` (20 pemeriksaan terakhir)
-   **Configuration**: `dependencies` (untuk hierarki), `authConfig` (kredensial)
-   **Security**: *Field* sensitif (`password`, `token`) diatur sebagai `select: false` secara *default*.

### 4.2. Struktur Database & Interaksi
Proyek ini menggunakan **MongoDB** dengan **Mongoose ODM** untuk pemodelan data.
Koneksi dikelola melalui *pattern* caching (`lib/db/mongoose.ts`) untuk mencegah *connection leak* di lingkungan *serverless* Next.js.

#### A. Koneksi Database
```typescript
import connectDB from "@/lib/db/mongoose";

// Penggunaan dalam API Route
await connectDB();
```

#### B. Skema Node (`INode`)
Struktur data utama disimpan dalam koleksi `nodes`.
| Field | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `name` | String | Nama unik layanan |
| `url` | String | Alamat tujuan yang dipantau |
| `group` | String | Kategori (mis: website, backend, api) |
| `status` | Enum | Status terakhir (STABLE, FRESH, WARNING, DOWN) |
| `authConfig` | Object | Konfigurasi autentikasi (menyimpan kredensial) |
| `history` | Array | Riwayat 20 latensi terakhir |

#### C. Operasi Data (CRUD Examples)
**1. Mengambil Data (Read)**
```typescript
const nodes = await NodeModel.find({})
    .sort({ status: -1, name: 1 })
    .lean(); // .lean() untuk performa (JSON plain object)
```

**2. Menyimpan Data Baru (Create)**
```typescript
const newNode = await NodeModel.create({
    name: "Layanan Baru",
    url: "https://example.com",
    group: "Backend",
    status: "FRESH"
});
```

**3. Memperbarui Data (Update)**
Termasuk update status dan latensi dari hasil *health check*.
```typescript
const node = await NodeModel.findById(id);
if (node) {
    node.status = "STABLE";
    node.latency = 120;
    node.lastChecked = new Date();
    await node.save();
}
```

**4. Mengambil Field Rahasia (Secure Read)**
Secara default, `password` dan `token` disembunyikan. Gunakan `.select()` untuk mengambilnya secara eksplisit (seperti pada *manual check*).
```typescript
const node = await NodeModel.findById(id)
    .select("+authConfig.password +authConfig.token");
```

### 4.3. API Endpoints
-   **`GET /api/nodes`**: *Heartbeat* dari *frontend*. Mengambil semua *nodes*.
    -   *Logic*: Memicu *background health checks* secara "Fire-and-forget" untuk *nodes* yang kedaluwarsa (diperiksa > 30 detik yang lalu) untuk memastikan kesegaran data tanpa memblokir respons UI.
-   **`POST /api/nodes`**: Pembuatan *Node*.
    -   *Logic*: Memvalidasi input, mencegah duplikasi, memeriksa *circular dependencies*, dan menyimpan `authConfig` secara aman.
-   **`POST /api/nodes/[id]/check`**: Pemicu *manual health check*.
    -   *Logic*: Melakukan *retrieve* rahasia *node* secara penuh (melalui eksplisit `.select()`), menjalankan validasi segera, dan memperbarui *database*.

### 4.4. Mekanisme Health Check
Terletak di `lib/monitoring/healthCheck.ts`. Strategi:
1.  **Simple Check (`fetch`)**: Untuk URL publik. Menggunakan *request* `HEAD` untuk efisiensi.
    -   *Logic*: Berbasis latensi (>500ms = STABLE, >30s = WARNING). 4xx/5xx = DOWN/WARNING.
2.  **Authenticated Check (`Playwright`)**: Untuk URL yang dilindungi (Basic Auth, Browser Login forms).
    -   *Logic*: Menjalankan *headless browser*, meniru *login* pengguna (mengisi *fields*, klik *submit*), menunggu selektor sukses. Biaya sumber daya tinggi, *timeout* lebih lama.

---

## 5. Analisis Frontend

### 5.1. State Management (`useNodeData`, `uiStore`)
-   **`useNodeData`**: *Custom hook* yang membungkus `useSWR`.
    -   *Features*: Interval *polling* yang dapat dikonfigurasi, *auto-revalidation* saat fokus. Mengembalikan `NodeData[]` yang diketik secara ketat.
-   **`uiStore`**: Global UI state (Zoom level, Selected Node, Visualization Mode).

### 5.2. Visualization Modes
Komponen `VisualizationScene` bertindak sebagai *router* untuk *renderers* yang berbeda:

#### A. Atom Mode (Three.js)
-   **Concept**: Awan partikel 3D.
-   **Implementation**: Komponen `FuzzyParticleNode` di-*render* dalam Canvas standar.
-   **Layout**: `AtomLayout.ts` menghitung posisi 3D menggunakan distribusi seperti fisika atau *grid*.
-   **Controls**: `MapControls` (Orthographic) untuk *unlimited zoom* (0.001x hingga 1000x).

#### B. Bubble Vector Mode (D3.js)
-   **Concept**: *Packed bubble chart* 2D.
-   **Implementation**: `BubbleVectorMap.tsx` menggunakan simulasi `d3-force`.
-   **Features**:
    -   *Nodes* saling tolak-menolak untuk menghindari tumpang tindih.
    -   Radius berskala sesuai latensi (atau ukuran tetap).
    -   *Hover tooltips* dan interaksi *click-to-expand*.

#### C. Alerts Mode (React/DOM)
-   **Concept**: *Feed error* bergaya Kanban.
-   **Implementation**: `ErrorCardFeed.tsx`.
-   **Logic**: Memfilter *nodes* dimana `status === 'DOWN'`. Menampilkan kartu diagnostik terperinci. Menggunakan `Framer Motion` untuk animasi masuk/keluar.

### 5.3. Lokalisasi
Semua teks yang menghadap pengguna dilokalisasi ke **Bahasa Indonesia**. Ini mencakup:
-   Item navigasi (`Navbar.tsx`)
-   *Ticker* status (`HUD.tsx`)
-   Pesan *error* dan formulir (`NodeModal.tsx`, `AuthConfigModal.tsx`)

---

## 6. Alur Kerja Utama (Key Workflows)

### 6.1. Alur Autentikasi (Authentication Flow)
1.  Pengguna mengonfigurasi Auth di `AuthConfigModal`.
2.  Frontend mengirim konfigurasi ke `POST /api/nodes`.
3.  Backend melakukan *hash*/simpan kredensial (jika berlaku) atau menyimpan selektor teks biasa (untuk *browser login*).
4.  Layanan Health Check membaca `authConfig.type`:
    -   **BASIC/BEARER**: Menambahkan *headers* ke `fetch`.
    -   **BROWSER_LOGIN**: Meluncurkan Playwright, mengeksekusi langkah *login*, memvalidasi sesi.

### 6.2. Loop Pemantauan (Monitoring Loop)
1.  Frontend melakukan *poll* ke `/api/nodes` setiap X detik (dapat dikonfigurasi pengguna).
2.  Backend *query* menemukan *nodes* yang tidak diperiksa dalam >30 detik.
3.  Backend memicu *health checks* secara asinkron untuk *nodes* tersebut.
4.  Database diperbarui dengan `status`/`latency` baru.
5.  Siklus *polling* berikutnya menangkap data yang diperbarui dan React melakukan *re-renders* keadaan visual.

---

## 7. Setup & Persyaratan

### Prasyarat
-   Node.js 18+
-   MongoDB Atlas (atau lokal)

### Environment Variables
```bash
MONGODB_URI=mongodb+srv://...
NEXTAUTH_SECRET=...
```

### Instalasi
```bash
npm install
npx playwright install chromium # Untuk auth checks
npm run dev
```
