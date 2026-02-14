# Panduan Developer: Visual Monitoring Platform

Dokumen ini berisi panduan lengkap untuk mengatur, menjalankan, dan mengembangkan proyek **Visual Monitoring Platform**.

## 1. Prasyarat Sistem

Sebelum memulai, pastikan komputer Anda telah terinstal:

-   **Node.js**: Versi 18 atau lebih baru. (Cek dengan `node -v`)
-   **MongoDB**: Anda bisa menggunakan [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (Cloud) atau MongoDB Community Server (Lokal).
-   **Git**: Untuk manajemen kode sumber.

## 2. Instalasi & Persiapan

Ikuti langkah-langkah berikut untuk menginstal proyek di lingkungan lokal Anda:

1.  **Clone Repository**
    ```bash
    git clone <repository-url>
    cd v2-reactjs
    ```

2.  **Instal Dependensi**
    ```bash
    npm install
    ```

3.  **Instal Browser untuk Playwright**
    Proyek ini menggunakan Playwright untuk *automated health checks* pada halaman yang butuh login.
    ```bash
    npx playwright install chromium
    ```

## 3. Konfigurasi Environment Variables

Proyek ini memerlukan beberapa variabel lingkungan agar dapat berjalan.

1.  **Buat file `.env.local`**
    Duplikasi file contoh `.env.local.example` menjadi `.env.local`:
    ```bash
    cp .env.local.example .env.local
    ```
    *Atau jika di Windows (CMD/Powershell), cukup buat file baru bernama `.env.local` dan salin isinya.*

2.  **Isi Variabel Penting**
    Buka file `.env.local` dan lengkapi konfigurasi berikut:

    ```env
    # 1. MongoDB Connection String (Wajib)
    MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/monitoring?retryWrites=true&w=majority

    # 2. NextAuth Configuration (Wajib untuk Auth)
    # URL aplikasi saat development
    NEXTAUTH_URL=http://localhost:3000
    # Generate random string untuk keamanan sesi
    NEXTAUTH_SECRET=bisa-diisi-random-string-panjang

    # 3. Cron Security (Untuk Endpoint Health Check)
    CRON_SECRET=rahasia-untuk-cron-job
    ```

    > **Tips:** Anda dapat membuat *secret* yang aman menggunakan command:
    > - `openssl rand -base64 32` (untuk NEXTAUTH_SECRET)
    > - `openssl rand -hex 16` (untuk CRON_SECRET)

## 4. Menjalankan Aplikasi

### Mode Development
Untuk menjalankan aplikasi dalam mode pengembangan dengan fitur *hot-reload*:

```bash
npm run dev
```
Buka **[http://localhost:3000](http://localhost:3000)** di browser Anda.

### Mode Production
Untuk mensimulasikan lingkungan produksi (lebih cepat dan optimal):

```bash
# 1. Build aplikasi
npm run build

# 2. Jalankan server produksi
npm start
```

### Linting
Untuk memeriksa kualitas kode:
```bash
npm run lint
```

## 5. Struktur Proyek

Berikut adalah gambaran singkat struktur folder proyek:

-   **`/app`**: Direktori utama Next.js App Router (Halaman dan API routes ada di sini).
    -   `/api`: Endpoint backend (seperti `/api/nodes`, `/api/cron`).
-   **`/components`**: Komponen React yang dapat digunakan kembali.
    -   `/3d`: Komponen Three.js.
    -   `/admin`: Komponen UI admin.
-   **`/lib`**: Logika bisnis dan utilitas.
    -   `/monitoring`: Logika health check (Playwright, fetch).
    -   `/db`: Model dan koneksi database.
-   **`/public`**: Aset statis (gambar, ikon).

## 6. Troubleshooting Umum

**Masalah: "Connection Error" ke MongoDB**
-   Pastikan IP address Anda sudah di-*whitelist* di MongoDB Atlas.
-   Periksa kembali `MONGODB_URI` di `.env.local`.

**Masalah: Halaman Blank / Error Visual**
-   Pastikan browser mendukung WebGL (biasanya aktif secara default).
-   Cek console browser (F12) untuk melihat pesan error spesifik.

**Masalah: Playwright Error**
-   Pastikan Anda sudah menjalankan `npx playwright install chromium`.

## 7. Referensi Tambahan

-   **[DOKUMENTASI_TEKNIS.md](./DOKUMENTASI_TEKNIS.md)**: Detail arsitektur dan teknis mendalam.
-   **[QUICKSTART.md](./QUICKSTART.md)**: Panduan cepat untuk pemula.
-   **[SPKL-MONITORING.md](./SPKL-MONITORING.md)**: Spesifikasi asli proyek.
