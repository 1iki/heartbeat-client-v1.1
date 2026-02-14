const WebSocket = require('ws');
const logger = require('../utils/logger');

/**
 * WebSocketService
 * Menyediakan pembaruan monitoring real-time ke klien yang terhubung
 */
class WebSocketService {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Set();
    
    this.wss.on('connection', (ws, req) => {
      const clientIp = req.socket.remoteAddress;
      logger.info('Klien WebSocket terhubung', { clientIp });
      
      this.clients.add(ws);
      
      // Kirim konfirmasi koneksi
      this.sendToClient(ws, {
        type: 'connected',
        message: 'Berhasil terhubung ke layanan monitoring',
        timestamp: new Date().toISOString()
      });

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(ws, data);
        } catch (error) {
          logger.error('Pesan WebSocket tidak valid', { error: error.message });
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        logger.info('Klien WebSocket terputus', { clientIp });
      });

      ws.on('error', (error) => {
        logger.error('Error WebSocket', { error: error.message });
        this.clients.delete(ws);
      });

      // Mekanisme heartbeat
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });
    });

    // Interval heartbeat
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    logger.info('Layanan WebSocket diinisialisasi');
  }

  /**
   * Tangani pesan dari klien
   */
  handleClientMessage(ws, data) {
    logger.debug('Pesan klien diterima', { type: data.type });
    
    switch (data.type) {
      case 'ping':
        this.sendToClient(ws, { type: 'pong', timestamp: new Date().toISOString() });
        break;
      case 'subscribe':
        // Klien ingin berlangganan pembaruan URL tertentu
        ws.subscribedUrls = data.urlIds || [];
        this.sendToClient(ws, { type: 'subscribed', urlIds: ws.subscribedUrls });
        break;
      default:
        logger.warn('Tipe pesan tidak dikenal', { type: data.type });
    }
  }

  /**
   * Kirim pesan ke klien tertentu
   */
  sendToClient(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  /**
   * Broadcast pembaruan monitoring ke semua klien
   */
  broadcastMonitoringUpdate(checkResult) {
    const message = {
      type: 'monitoring_update',
      data: {
        urlId: checkResult.urlId,
        url: checkResult.url,
        urlName: checkResult.urlName,
        status: checkResult.status,
        httpStatus: checkResult.httpStatus,
        responseTime: checkResult.responseTime,
        errors: checkResult.errors || [],
        // ✅ FIX: Handle undefined arrays untuk mencegah crash
        hasIframeIssues: (checkResult.iframeChecks || []).some(i => !i.loaded),
        hasVideoIssues: (checkResult.videoChecks || []).some(v => !v.playable),
        timestamp: checkResult.timestamp || new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    this.broadcast(message);
    logger.debug('✅ Monitoring update berhasil di-broadcast', { 
      urlId: checkResult.urlId, 
      status: checkResult.status 
    });
  }

  /**
   * Broadcast notifikasi perubahan status
   */
  broadcastStatusChange(urlId, oldStatus, newStatus, urlName) {
    const message = {
      type: 'status_change',
      data: {
        urlId,
        urlName,
        oldStatus,
        newStatus,
        timestamp: new Date().toISOString()
      }
    };

    this.broadcast(message);
    logger.info('Perubahan status disiarkan', { urlId, oldStatus, newStatus });
  }

  /**
   * Broadcast ke semua klien yang terhubung
   */
  broadcast(message) {
    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        // Periksa apakah klien berlangganan URL tertentu
        if (ws.subscribedUrls && message.data?.urlId) {
          if (ws.subscribedUrls.includes(message.data.urlId)) {
            ws.send(messageStr);
            sentCount++;
          }
        } else {
          // Kirim ke semua klien jika tidak ada filter berlangganan
          ws.send(messageStr);
          sentCount++;
        }
      }
    });

    logger.debug('Pesan disiarkan', { type: message.type, clients: sentCount });
  }

  /**
   * Dapatkan jumlah klien yang terhubung
   */
  getClientCount() {
    return this.clients.size;
  }

  /**
   * Bersihkan resource
   */
  cleanup() {
    clearInterval(this.heartbeatInterval);
    this.wss.close(() => {
      logger.info('Layanan WebSocket ditutup');
    });
  }
}

module.exports = WebSocketService;
