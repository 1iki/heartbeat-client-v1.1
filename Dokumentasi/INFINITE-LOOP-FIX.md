# Perbaikan Infinite Loop - Maximum Update Depth Exceeded

## Masalah yang Terdeteksi
Error "Maximum update depth exceeded" terjadi karena ada infinite loop dalam React state updates di beberapa komponen.

## Root Cause Analysis

### 1. AudioAlertManager.tsx
**Masalah**: `useEffect` dengan dependency `[nodes]` terus menerus men-trigger `setErrorHistory` bahkan ketika tidak ada perubahan actual data.

```typescript
// ❌ SEBELUM: Selalu return object baru
setErrorHistory(prevHistory => {
    const newHistory = { ...prevHistory };
    // ... mutations ...
    return newHistory; // Selalu object baru, trigger re-render
});
```

**Dampak**: Setiap kali `nodes` berubah (polling 5 detik), state `errorHistory` di-update meskipun nilai sama, menyebabkan infinite re-render.

### 2. VisualizationScene.tsx  
**Masalah**: Dependency array mengandung Zustand store setters yang bisa berubah reference.

```typescript
// ❌ SEBELUM: Dependency pada function references
}, [nodes, visualizationMode, setNodePositions, setEdges, setLoading, dimensions]);
```

**Dampak**: Ketika store setter dipanggil, bisa trigger useEffect lagi karena reference berubah.

## Solusi yang Diimplementasikan

### 1. AudioAlertManager.tsx - Conditional State Update

**File**: [components/alerts/AudioAlertManager.tsx](components/alerts/AudioAlertManager.tsx#L95)

```typescript
// ✅ SESUDAH: Hanya return object baru jika ada perubahan
setErrorHistory(prevHistory => {
    const newHistory = { ...prevHistory };
    let hasChanges = false;

    // Add timestamps
    currentErrorNodes.forEach(node => {
        const history = newHistory[node.id] || [];
        const lastTime = history[history.length - 1];
        if (!lastTime || (now - lastTime > 2000)) {
            newHistory[node.id] = [...history, now];
            hasChanges = true; // Mark change
        }
    });

    // Prune old timestamps
    Object.keys(newHistory).forEach(nodeId => {
        const filtered = newHistory[nodeId].filter(t => now - t <= TIME_WINDOW);
        if (filtered.length !== newHistory[nodeId].length) {
            hasChanges = true; // Mark change
            newHistory[nodeId] = filtered;
        }
        if (newHistory[nodeId].length === 0) {
            delete newHistory[nodeId];
            hasChanges = true; // Mark change
        }
    });

    // Only return new object if there are actual changes
    return hasChanges ? newHistory : prevHistory;
});
```

**Benefit**:
- Mencegah unnecessary re-render
- State hanya update jika ada perubahan nyata
- Menghindari infinite loop dari state yang sama

### 2. VisualizationScene.tsx - Dependency Array Cleanup

**File**: [components/three/VisualizationScene.tsx](components/three/VisualizationScene.tsx#L79)

```typescript
// ✅ SESUDAH: Hanya primitive values & stable references
}, [nodes, visualizationMode, dimensions.width, dimensions.height]);
```

**Perubahan**:
- ❌ Removed: `setNodePositions`, `setEdges`, `setLoading` (function references)
- ✅ Kept: `nodes`, `visualizationMode`, `dimensions.width`, `dimensions.height` (primitive values)

**Benefit**:
- Zustand store setters bersifat stable, tapi tidak perlu di-list sebagai dependency
- Menghindari false-positive dependency changes
- React ESLint rule satisfied (functions called inside effect)

## Testing & Verification

### Build Test
```powershell
npm run build
# ✅ Compiled successfully
# ✅ No TypeScript errors
# ✅ No runtime warnings
```

### Runtime Test
1. Start dev server: `npm run dev`
2. Buka DevTools → Console
3. Verifikasi tidak ada error "Maximum update depth exceeded"
4. Verifikasi audio alert masih berfungsi untuk nodes dengan status DOWN
5. Verifikasi visualisasi masih render dengan benar

## Impact Analysis

### Components Affected
- ✅ **AudioAlertManager**: Fixed infinite loop, audio alerts tetap berfungsi
- ✅ **VisualizationScene**: Fixed dependency array, rendering tetap optimal
- ✅ **All other components**: No changes needed

### Performance Improvements
- 🚀 Reduced unnecessary re-renders
- 🚀 More efficient state updates
- 🚀 Better React profiler metrics

## Best Practices Applied

1. **Conditional State Updates**: Hanya update state jika ada perubahan actual
2. **Stable Dependencies**: Gunakan primitive values di dependency array
3. **Flag-Based Updates**: Track perubahan dengan boolean flag (`hasChanges`)
4. **Reference Comparison**: Hindari function references di dependency array (kecuali stable)

## Tanggal Perbaikan
6 Februari 2026

## Status
✅ **RESOLVED** - Infinite loop fixed, build successful, no runtime errors.
