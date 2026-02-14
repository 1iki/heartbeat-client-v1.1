import { NodeData } from "@/types";

export const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
    // 1. Client-Side Errors (4xx)
    "400": {
        title: "400 - Bad Request",
        description: "Server tidak bisa memproses permintaan karena kesalahan klien (misal: sintaks URL rusak atau ukuran header terlalu besar)."
    },
    "401": {
        title: "401 - Unauthorized",
        description: "Pengguna mencoba mengakses halaman yang diproteksi tanpa login yang valid."
    },
    "403": {
        title: "403 - Forbidden",
        description: "Klien tidak punya izin akses (sering disebabkan oleh konfigurasi file .htaccess, izin folder 755, atau blokir IP oleh firewall)."
    },
    "404": {
        title: "404 - Path Tidak Ditemukan",
        description: "Path yang dituju tidak ada"
    },
    "405": {
        title: "405 - Method Not Allowed",
        description: "Metode HTTP (seperti POST) tidak didukung oleh URL tersebut."
    },
    "408": {
        title: "408 - Request Timeout",
        description: "Koneksi klien ke server terlalu lambat sehingga server memutus sesi."
    },
    "410": {
        title: "410 - Gone",
        description: "Mirip 404, tetapi menunjukkan bahwa halaman tersebut memang sudah dihapus secara permanen dan tidak akan kembali."
    },
    "429": {
        title: "429 - Too Many Requests",
        description: "Klien mengirimkan terlalu banyak permintaan dalam waktu singkat (rate limiting). Sering terjadi pada API atau serangan brute force."
    },

    // 2. Server-Side Errors (5xx)
    "500": {
        title: "500 - Internal Server Error",
        description: "Kesalahan umum pada server. Biasanya karena error pada skrip (PHP/Python), masalah database, atau file konfigurasi yang korup."
    },
    "502": {
        title: "502 - Bad Gateway",
        description: "Gateway/proxy menerima respon tidak valid dari server hulu (upstream). Sering terjadi jika PHP-FPM atau aplikasi di belakang Nginx mati."
    },
    "503": {
        title: "503 - Service Unavailable",
        description: "Server tidak siap menangani permintaan karena sedang maintenance atau kelebihan beban (lonjakan trafik tiba-tiba)."
    },
    "504": {
        title: "504 - Gateway Timeout",
        description: "Server perantara tidak mendapat respon tepat waktu dari server utama."
    },
    "508": {
        title: "508 - Loop Detected",
        description: "Server mendeteksi perulangan tanpa henti saat memproses permintaan (sering pada konfigurasi CMS)."
    },
    "521": {
        title: "521 - Web Server Is Down",
        description: "Kode spesifik Cloudflare yang menunjukkan server asal (origin server) menolak koneksi atau mati."
    },

    // 3. Masalah Jaringan & Browser (Non-HTTP)
    "DNS_PROBE_FINISHED_NXDOMAIN": {
        title: "DNS_PROBE_FINISHED_NXDOMAIN",
        description: "DNS gagal menerjemahkan domain menjadi IP. Kemungkinan domain belum diarahkan ke nameserver atau sudah kedaluwarsa."
    },
    "ERR_CONNECTION_REFUSED": {
        title: "ERR_CONNECTION_REFUSED",
        description: "Koneksi ditolak oleh target. Biasanya karena layanan (seperti Apache/Nginx) tidak berjalan di server atau port (80/443) tertutup."
    },
    "ERR_CONNECTION_TIMED_OUT": {
        title: "ERR_CONNECTION_TIMED_OUT",
        description: "Server tidak merespon sama sekali. Sering disebabkan oleh firewall server (iptables/UFW) yang memblokir IP klien."
    },
    "ERR_TOO_MANY_REDIRECTS": {
        title: "ERR_TOO_MANY_REDIRECTS",
        description: "Terjadi redirect loop (misal: A mengarah ke B, B kembali ke A). Sering terjadi saat setting HTTPS tidak tepat."
    },
    "SSL_HANDSHAKE_FAILED": { // Generalized key for SSL/TLS Handshake Failed
        title: "SSL/TLS Handshake Failed",
        description: "Kegagalan enkripsi antara browser dan server. Penyebabnya bisa sertifikat SSL yang tidak cocok, kedaluwarsa, atau protokol TLS yang tidak didukung browser lama."
    },
    "NET::ERR_CERT_COMMON_NAME_INVALID": {
        title: "NET::ERR_CERT_COMMON_NAME_INVALID",
        description: "Nama domain tidak sesuai dengan yang terdaftar di sertifikat SSL."
    }
};

/**
 * Helper to get detailed error message from NodeData
 */
export function getDetailedErrorMessage(node: Partial<NodeData> & { httpStatus?: number | string; statusMessage?: string }): { title: string; description: string } | null {
    const code = node.httpStatus ? String(node.httpStatus) : null;
    const message = node.statusMessage;

    // Check by HTTP Status Code first
    if (code && ERROR_MESSAGES[code]) {
        return ERROR_MESSAGES[code];
    }

    // Check standard network error strings in statusMessage
    if (message) {
        for (const key of Object.keys(ERROR_MESSAGES)) {
            if (message.includes(key)) {
                return ERROR_MESSAGES[key];
            }
        }

        // Specific check for "SSL/TLS Handshake Failed" phrase
        if (message.toLowerCase().includes("handshake failed") || message.toLowerCase().includes("ssl")) {
            // If we want to be safe, we can default to SSL error, but let's be strict if the key is not found
            if (message.includes("Handshake Failed")) return ERROR_MESSAGES["SSL_HANDSHAKE_FAILED"];
        }
    }

    // WARNING Handling
    if (node.status === "WARNING") {
        // High Latency check - consistent with healthCheck.ts (>5000ms)
        if (node.latency && node.latency > 5000) {
            return {
                title: "Latensi Sangat Tinggi",
                description: `Respon server sangat lambat (${node.latency}ms). Beban server tinggi atau masalah jaringan serius.`
            };
        } else if (node.latency && node.latency > 2000) {
            return {
                title: "Latensi Tinggi",
                description: `Respon server lambat (${node.latency}ms). Kemungkinan beban server tinggi atau masalah jaringan.`
            };
        }

        // Fallback for other warnings
        return {
            title: "Peringatan Sistem",
            description: message || "Terdeteksi anomali pada layanan, namun masih dapat diakses."
        };
    }

    // Generic fallback for Error/Down if no mapping found but message exists
    if (message) {
        return {
            title: "Kesalahan Terdeteksi",
            description: message
        };
    }

    return null;
}
