/**
 * Model Status Kesehatan Terpadu
 * Mendefinisikan semua kemungkinan status untuk URL yang dipantau
 */

const HealthStatus = {
  UP: 'UP',
  DOWN: 'DOWN',
  TIMEOUT: 'TIMEOUT',
  EMPTY: 'EMPTY',
  PARTIAL: 'PARTIAL',
  NOT_PLAYABLE: 'NOT_PLAYABLE',
  IFRAME_FAILED: 'IFRAME_FAILED',
  JS_ERROR: 'JS_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR'
};

const StatusPriority = {
  DOWN: 1,
  TIMEOUT: 2,
  NETWORK_ERROR: 3,
  IFRAME_FAILED: 4,
  NOT_PLAYABLE: 5,
  JS_ERROR: 6,
  EMPTY: 7,
  PARTIAL: 8,
  UP: 9
};

const StatusDescriptions = {
  UP: 'Website dapat diakses dan berfungsi dengan baik',
  DOWN: 'Website tidak dapat diakses (error HTTP)',
  TIMEOUT: 'Permintaan melebihi batas waktu tunggu',
  EMPTY: 'Halaman dimuat tetapi konten kosong atau blank',
  PARTIAL: 'Beberapa sumber daya dimuat tetapi ada masalah terdeteksi',
  NOT_PLAYABLE: 'Pemutar video ada tetapi video tidak dapat diputar',
  IFRAME_FAILED: 'Elemen iframe gagal memuat konten',
  JS_ERROR: 'Error runtime JavaScript terdeteksi',
  NETWORK_ERROR: 'Koneksi jaringan atau resolusi DNS gagal'
};

const StatusColors = {
  UP: '#10b981',
  DOWN: '#ef4444',
  TIMEOUT: '#f59e0b',
  EMPTY: '#6366f1',
  PARTIAL: '#eab308',
  NOT_PLAYABLE: '#ec4899',
  IFRAME_FAILED: '#f97316',
  JS_ERROR: '#8b5cf6',
  NETWORK_ERROR: '#dc2626'
};

/**
 * Aturan deteksi untuk setiap status
 */
const DetectionRules = {
  DOWN: [
    'Status HTTP >= 400',
    'Koneksi ditolak',
    'Resolusi DNS gagal'
  ],
  TIMEOUT: [
    'Permintaan melebihi timeout',
    'Timeout navigasi'
  ],
  EMPTY: [
    'Konten body kosong atau hanya whitespace',
    'Tidak ada elemen terlihat terdeteksi',
    'document.body.innerText.trim().length === 0'
  ],
  IFRAME_FAILED: [
    'Event error pemuatan iframe',
    'Iframe src mengembalikan 404',
    'Konten iframe tidak dapat diakses'
  ],
  NOT_PLAYABLE: [
    'Event error elemen video',
    'State jaringan media === NETWORK_NO_SOURCE',
    'Video readyState === HAVE_NOTHING',
    'Error konsol mengandung "video" atau "media"'
  ],
  JS_ERROR: [
    'Exception tidak tertangani di konsol',
    'Pesan error konsol',
    'Error eksekusi skrip'
  ],
  NETWORK_ERROR: [
    'Permintaan sumber daya gagal',
    'Aset kritis gagal dimuat'
  ],
  PARTIAL: [
    'Beberapa iframe gagal tetapi halaman dimuat',
    'Sumber daya non-kritis gagal'
  ]
};

module.exports = {
  HealthStatus,
  StatusPriority,
  StatusDescriptions,
  StatusColors,
  DetectionRules
};
