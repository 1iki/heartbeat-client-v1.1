# Status Check Toggle Fix

## Masalah yang Diperbaiki
Sistem secara otomatis melakukan fetching data saat pertama kali dimuat, meskipun tombol `statusCheck` dalam kondisi OFF. Ini menyebabkan status check berjalan tanpa user menekan tombol toggle.

## Penyebab
Hook SWR (`useSWR`) secara default akan melakukan fetch data pertama kali ketika komponen dimuat, terlepas dari kondisi `statusCheckEnabled`. Hanya `refreshInterval` yang memeriksa kondisi toggle, tetapi initial fetch tetap terjadi.

## Solusi yang Diimplementasikan

### 1. Perubahan di `lib/hooks/useNodeData.ts`

**Sebelum:**
```typescript
const { data, error, isLoading, mutate } = useSWR<{ data: NodeData[]; isConfigError: boolean; message?: string }>(
    "/api/nodes",  // ❌ Selalu fetch
    fetcher,
    {
        refreshInterval: () => {
            if (!statusCheckEnabled) return 0;
            // ...
        },
        revalidateOnFocus: POLLING_CONFIG.FOCUS_REVALIDATION,
        revalidateOnReconnect: true,
        dedupingInterval: 2000,
    }
);
```

**Sesudah:**
```typescript
const { data, error, isLoading, mutate } = useSWR<{ data: NodeData[]; isConfigError: boolean; message?: string }>(
    statusCheckEnabled ? "/api/nodes" : null,  // ✅ Hanya fetch jika enabled
    fetcher,
    {
        refreshInterval: () => {
            if (!statusCheckEnabled) return 0;
            if (statusCheckInterval === -1) {
                return getNextScheduleDelay();
            }
            return statusCheckInterval * 1000;
        },
        revalidateOnFocus: statusCheckEnabled ? POLLING_CONFIG.FOCUS_REVALIDATION : false,  // ✅ Kondisional
        revalidateOnReconnect: statusCheckEnabled,  // ✅ Kondisional
        dedupingInterval: 2000,
    }
);
```

## Perubahan Detail

1. **Key Conditional**: `statusCheckEnabled ? "/api/nodes" : null`
   - Jika `statusCheckEnabled` adalah `false`, SWR tidak akan melakukan fetching sama sekali
   - Jika `null`, SWR akan melewati hook tersebut

2. **Revalidate on Focus**: `statusCheckEnabled ? POLLING_CONFIG.FOCUS_REVALIDATION : false`
   - Hanya revalidate saat focus window jika toggle ON

3. **Revalidate on Reconnect**: `statusCheckEnabled`
   - Hanya revalidate saat reconnect jika toggle ON

## Hasil
- ✅ **Tombol OFF** → Tidak ada status check sama sekali (tidak ada API call ke `/api/nodes`)
- ✅ **Tombol ON** → Status check berjalan sesuai interval yang dipilih
- ✅ Tidak ada fetching otomatis saat aplikasi pertama kali dimuat jika toggle masih OFF
- ✅ Semua komponen menangani `nodes.length === 0` dengan baik

## Testing

### Build Test
```powershell
npm run build
# ✅ Compiled successfully
# ✅ Linting and checking validity of types ... Passed
# ✅ No TypeScript errors
```

### Runtime Test
1. Buka aplikasi dengan toggle OFF
2. Buka DevTools → Network tab
3. Verifikasi tidak ada request ke `/api/nodes`
4. Klik toggle ON
5. Verifikasi request ke `/api/nodes` dimulai sesuai interval

## Komponen yang Terpengaruh (Aman)

Semua komponen sudah menangani kondisi `nodes.length === 0`:

- ✅ `components/three/VisualizationScene.tsx` - Check: `if (nodes.length === 0) return;`
- ✅ `components/layout/HUD.tsx` - Display: "Belum ada node yang dikonfigurasi"
- ✅ `components/d3/BubbleVectorMap.tsx` - Check: `if (!svgRef.current || nodes.length === 0) return;`
- ✅ `components/alerts/ErrorCardFeed.tsx` - Filter dan display fallback
- ✅ `components/alerts/AudioAlertManager.tsx` - Aman dengan array kosong
- ✅ `app/admin/urls/page.tsx` - Menggunakan fetch manual, tidak terpengaruh

## Default State
Default state di `lib/stores/uiStore.ts`:
```typescript
statusCheckEnabled: false,  // ✅ Default OFF
statusCheckInterval: 5,     // Default 5 detik
```

## Tanggal Perbaikan
6 Februari 2026

## Status
✅ **SELESAI** - Build berhasil, tidak ada error TypeScript, semua komponen berjalan dengan baik.
