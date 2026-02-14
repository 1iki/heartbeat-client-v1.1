require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const database = require('./database');
const MonitoringService = require('./services/monitoringService');
const GoogleSheetsService = require('./services/googleSheetsService');
const WebSocketService = require('./services/websocketService');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Inisialisasi layanan
let monitoringService;
let googleSheetsService;
let websocketService;

// Rute API
app.get('/api/urls', async (req, res) => {
  try {
    const urls = await monitoringService.getMonitoredUrls();
    
    // ✅ FIX: Ambil status terbaru untuk setiap URL dari MonitoringLog
    const MonitoringLog = require('./models/schemas').MonitoringLog;
    
    const urlsWithStatus = await Promise.all(urls.map(async (url) => {
      const latestLog = await MonitoringLog.findOne({ urlId: url._id })
        .sort({ checkedAt: -1 })
        .lean();
      
      return {
        _id: url._id,
        url: url.url,
        name: url.name,
        description: url.description,
        checkInterval: url.checkInterval,
        enabled: url.enabled,
        requiresAuth: url.requiresAuth,
        status: latestLog?.status || 'UNKNOWN',
        httpStatus: latestLog?.httpStatus || null,
        responseTime: latestLog?.responseTime || null,
        lastChecked: latestLog?.checkedAt || null,
        statusMessage: latestLog?.status === 'DOWN' ? 'Service tidak dapat diakses' : null
      };
    }));
    
    res.json({ success: true, data: urlsWithStatus });
  } catch (error) {
    logger.error('Gagal mengambil URL', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/urls', async (req, res) => {
  try {
    const { url, name, description, checkInterval, requiresAuth, authCredentials } = req.body;
    
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL wajib diisi' });
    }

    // Validasi kredensial jika requiresAuth aktif
    if (requiresAuth && (!authCredentials?.username || !authCredentials?.password)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username dan password diperlukan untuk URL yang memerlukan autentikasi' 
      });
    }

    const urlData = {
      url,
      name,
      description,
      checkInterval,
      requiresAuth: requiresAuth || false
    };

    if (requiresAuth && authCredentials) {
      urlData.authCredentials = {
        username: authCredentials.username,
        password: authCredentials.password,
        loginUrl: authCredentials.loginUrl || url,
        loginType: authCredentials.loginType || 'page', // ✅ Simpan loginType
        modalTriggerSelector: authCredentials.modalTriggerSelector || null, // ✅ Simpan modalTriggerSelector
        loginSelectors: authCredentials.loginSelectors || {}
      };
    }

    const result = await monitoringService.addUrl(urlData);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Gagal menambahkan URL', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/urls/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    await monitoringService.updateUrl(id, updates);
    res.json({ success: true, message: 'URL berhasil diperbarui' });
  } catch (error) {
    logger.error('Gagal memperbarui URL', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/urls/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await monitoringService.removeUrl(id);
    res.json({ success: true, message: 'URL berhasil dihapus' });
  } catch (error) {
    logger.error('Gagal menghapus URL', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/status', async (req, res) => {
  try {
    const status = await monitoringService.getLatestStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    logger.error('Gagal mengambil status', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route untuk check semua URL sekaligus
app.post('/api/urls/check-all', async (req, res) => {
  try {
    const urls = await monitoringService.getMonitoredUrls();
    const results = [];
    
    for (const url of urls) {
      try {
        const result = await monitoringService.checkUrl(url._id.toString());
        results.push(result);
        
        // Broadcast pembaruan via WebSocket
        if (websocketService) {
          websocketService.broadcastMonitoringUpdate(result);
        }
      } catch (error) {
        logger.error(`Gagal memeriksa URL ${url.url}`, { error: error.message });
      }
    }
    
    res.json({ 
      success: true, 
      data: results,
      total: results.length,
      message: `Berhasil memeriksa ${results.length} URL`
    });
  } catch (error) {
    logger.error('Gagal memeriksa semua URL', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route alternatif untuk konsistensi dengan frontend
app.post('/api/urls/:id/check', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await monitoringService.checkUrl(id);
    
    // Broadcast pembaruan via WebSocket
    if (websocketService) {
      websocketService.broadcastMonitoringUpdate(result);
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Gagal memeriksa URL', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const history = await monitoringService.getUrlHistory(id, limit);
    res.json({ success: true, data: history });
  } catch (error) {
    logger.error('Gagal mengambil riwayat', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Google Sheets API endpoints
app.get('/api/sheets/fetch', async (req, res) => {
  try {
    if (!googleSheetsService) {
      return res.status(503).json({ 
        success: false, 
        error: 'Google Sheets Service belum diinisialisasi' 
      });
    }

    const urls = await googleSheetsService.fetchMonitoringUrls();
    res.json({ 
      success: true, 
      data: urls,
      total: urls.length 
    });
  } catch (error) {
    logger.error('Gagal fetch data dari spreadsheet', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/sheets/sync', async (req, res) => {
  try {
    if (!googleSheetsService) {
      return res.status(503).json({ 
        success: false, 
        error: 'Google Sheets Service belum diinisialisasi' 
      });
    }

    const summary = await googleSheetsService.syncUrlsToDatabase(monitoringService);
    
    // ✅ Buat pesan yang lebih detail dengan informasi perubahan
    let message = `Sinkronisasi selesai: `;
    const details = [];
    
    if (summary.added > 0) {
      details.push(`✅ ${summary.added} URL ditambahkan`);
    }
    
    if (summary.deleted > 0) {
      details.push(`🗑️ ${summary.deleted} URL dihapus`);
    }
    
    if (summary.skipped > 0) {
      details.push(`⏭️ ${summary.skipped} URL sudah ada`);
    }
    
    message += details.length > 0 ? details.join(', ') : 'Tidak ada perubahan';
    
    // ✅ Broadcast update ke semua client WebSocket
    if (websocketService && (summary.added > 0 || summary.deleted > 0)) {
      websocketService.broadcast({
        type: 'sync_complete',
        data: {
          summary,
          message: message,
          timestamp: new Date().toISOString()
        }
      });
      
      logger.info('📡 Sync summary broadcasted via WebSocket', { summary });
    }
    
    res.json({ 
      success: true, 
      data: summary,
      message: message
    });
  } catch (error) {
    logger.error('Gagal sync data dari spreadsheet', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/sheets/info', async (req, res) => {
  try {
    if (!googleSheetsService) {
      return res.status(503).json({ 
        success: false, 
        error: 'Google Sheets Service belum diinisialisasi' 
      });
    }

    const info = await googleSheetsService.getSpreadsheetInfo();
    res.json({ success: true, data: info });
  } catch (error) {
    logger.error('Gagal mendapatkan info spreadsheet', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'sehat',
    timestamp: new Date().toISOString(),
    database: database.isConnected() ? 'terhubung' : 'terputus',
    googleSheets: googleSheetsService ? 'aktif' : 'tidak aktif',
    uptime: process.uptime()
  });
});

// Graceful shutdown
async function shutdown() {
  logger.info('Mematikan server dengan baik...');
  
  try {
    if (websocketService) {
      websocketService.cleanup();
    }
    
    if (monitoringService) {
      await monitoringService.cleanup();
    }
    
    await database.close();
    
    server.close(() => {
      logger.info('Server ditutup');
      process.exit(0);
    });
    
    // Paksa tutup setelah 10 detik
    setTimeout(() => {
      logger.error('Penutupan paksa');
      process.exit(1);
    }, 10000);
  } catch (error) {
    logger.error('Error saat penutupan', { error: error.message });
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Mulai server
async function start() {
  try {
    // Hubungkan ke MongoDB
    logger.info('Menghubungkan ke MongoDB...');
    await database.connect();
    
    // Inisialisasi layanan monitoring
    logger.info('Menginisialisasi layanan monitoring...');
    monitoringService = new MonitoringService();
    await monitoringService.initialize();
    
    // Inisialisasi Google Sheets Service
    logger.info('Menginisialisasi Google Sheets Service...');
    googleSheetsService = new GoogleSheetsService();
    await googleSheetsService.initialize();
    
    // Mulai HTTP server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      logger.info(`Server berjalan di port ${PORT}`);
      console.log(`\n🚀 Sistem Monitoring Dimulai!`);
      console.log(`📊 Dashboard: http://localhost:${PORT}`);
      console.log(`🔍 Pemeriksaan Kesehatan: http://localhost:${PORT}/health`);
      console.log(`📡 WebSocket: ws://localhost:${PORT}`);
      console.log(`📋 Google Sheets: Terintegrasi\n`);
    });
    
    // Inisialisasi layanan WebSocket
    websocketService = new WebSocketService(server);
    
    // ✅ FIX UTAMA: INTERVAL MONITORING OTOMATIS DENGAN BROADCAST REAL-TIME
    const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL) || 300000; // Default 5 menit
    logger.info('Memulai interval monitoring otomatis', { intervalMs: CHECK_INTERVAL });
    
    // Fungsi untuk check semua URL dan broadcast hasilnya
    async function performScheduledChecks() {
      try {
        logger.info('⏰ Memulai pemeriksaan terjadwal untuk semua URL');
        const urls = await monitoringService.getMonitoredUrls();
        
        for (const url of urls) {
          try {
            const result = await monitoringService.checkUrl(url._id.toString());
            
            // ✅ BROADCAST SETIAP HASIL CHECK KE WEBSOCKET
            if (websocketService) {
              websocketService.broadcastMonitoringUpdate(result);
              logger.debug('✅ Status dikirim via WebSocket', { 
                urlId: result.urlId, 
                status: result.status 
              });
            }
          } catch (error) {
            logger.error('Gagal memeriksa URL dalam scheduled check', { 
              urlId: url._id.toString(), 
              url: url.url, 
              error: error.message 
            });
            
            // Broadcast error juga agar dashboard tahu ada masalah
            if (websocketService) {
              websocketService.broadcastMonitoringUpdate({
                urlId: url._id.toString(),
                urlName: url.name,
                url: url.url,
                status: 'DOWN',
                error: error.message,
                checkedAt: new Date()
              });
            }
          }
        }
        
        logger.info('✅ Pemeriksaan terjadwal selesai', { totalUrls: urls.length });
      } catch (error) {
        logger.error('Error dalam scheduled checks', { error: error.message });
      }
    }
    
    // Jalankan check pertama setelah 10 detik server start
    setTimeout(() => {
      logger.info('🔄 Menjalankan pemeriksaan pertama...');
      performScheduledChecks();
    }, 10000);
    
    // Set interval untuk check berkala
    const monitoringInterval = setInterval(performScheduledChecks, CHECK_INTERVAL);
    
    // Cleanup interval saat shutdown
    const originalShutdown = shutdown;
    shutdown = async function() {
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
        logger.info('Interval monitoring dihentikan');
      }
      await originalShutdown();
    };
    
  } catch (error) {
    logger.error('Gagal memulai server', { error: error.message });
    console.error('❌ Gagal memulai server:', error.message);
    process.exit(1);
  }
}

start();

module.exports = app;
