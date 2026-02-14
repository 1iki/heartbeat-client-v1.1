const { MonitoredUrl, MonitoringLog, ErrorLog, IframeCheck, VideoCheck } = require('../models/schemas');
const HeadlessBrowserWorker = require('../workers/browserWorker');
const logger = require('../utils/logger');

/**
 * MonitoringService
 * Mengorkestrasi pemeriksaan kesehatan URL dan menyimpan hasil
 */
class MonitoringService {
  constructor() {
    this.browserWorker = null;
  }

  /**
   * Inisialisasi layanan monitoring
   */
  async initialize() {
    this.browserWorker = new HeadlessBrowserWorker();
    await this.browserWorker.initialize();
    logger.info('Layanan monitoring diinisialisasi');
  }

  /**
   * Dapatkan semua URL yang dipantau
   */
  async getMonitoredUrls() {
    return await MonitoredUrl.find({ enabled: true }).sort({ _id: 1 }).lean();
  }

  /**
   * Tambahkan URL baru untuk dipantau
   */
  async addUrl(urlData) {
    try {
      // Support both old format (multiple params) and new format (single object)
      let data;
      if (typeof urlData === 'string') {
        // Old format: addUrl(url, name, description, checkInterval)
        data = {
          url: urlData,
          name: arguments[1],
          description: arguments[2],
          checkInterval: arguments[3] || 60000
        };
      } else {
        // New format: addUrl({ url, name, description, checkInterval, requiresAuth, authCredentials })
        data = urlData;
      }
      
      const monitoredUrl = new MonitoredUrl(data);
      
      await monitoredUrl.save();
      logger.info('URL ditambahkan ke monitoring', { url: data.url, name: data.name });
      return monitoredUrl.toObject();
    } catch (error) {
      if (error.code === 11000) { // Duplicate key error
        throw new Error('URL sudah dipantau');
      }
      throw error;
    }
  }

  /**
   * Hapus URL dari monitoring
   */
  async removeUrl(urlId) {
    await MonitoredUrl.findByIdAndDelete(urlId);
    // Hapus dokumen terkait secara cascade
    await MonitoringLog.deleteMany({ urlId });
    await ErrorLog.deleteMany({ urlId });
    logger.info('URL dihapus dari monitoring', { urlId });
  }

  /**
   * Perbarui konfigurasi URL
   */
  async updateUrl(urlId, updates) {
    const { name, description, checkInterval, enabled } = updates;
    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (checkInterval !== undefined) updateData.checkInterval = checkInterval;
    if (enabled !== undefined) updateData.enabled = enabled;
    updateData.updatedAt = Date.now();
    
    await MonitoredUrl.findByIdAndUpdate(urlId, updateData);
    logger.info('URL diperbarui', { urlId, updates });
  }

  /**
   * Periksa satu URL dan simpan hasil
   */
  async checkUrl(urlId) {
    try {
      // Dapatkan detail URL
      const urlData = await MonitoredUrl.findOne({ _id: urlId, enabled: true });

      if (!urlData) {
        throw new Error('URL tidak ditemukan atau dinonaktifkan');
      }

      logger.info('Memeriksa URL', { urlId, url: urlData.url });

      // Siapkan konfigurasi autentikasi jika diperlukan
      const authConfig = urlData.requiresAuth ? {
        requiresAuth: true,
        username: urlData.authCredentials?.username,
        password: urlData.authCredentials?.password,
        loginUrl: urlData.authCredentials?.loginUrl,
        loginType: urlData.authCredentials?.loginType || 'page', // ✅ Kirim loginType
        modalTriggerSelector: urlData.authCredentials?.modalTriggerSelector, // ✅ Kirim modalTriggerSelector
        loginSelectors: urlData.authCredentials?.loginSelectors,
        url: urlData.url
      } : null;

      // Lakukan pemeriksaan menggunakan browser worker
      const checkResult = await this.browserWorker.checkUrl(urlData.url, authConfig);

      // Simpan log monitoring
      const monitoringLog = new MonitoringLog({
        urlId: urlData._id,
        status: checkResult.status,
        httpStatus: checkResult.httpStatus,
        responseTime: checkResult.responseTime,
        contentLength: checkResult.contentLength
      });

      await monitoringLog.save();
      const monitoringLogId = monitoringLog._id;

      // Simpan log error jika ada
      if (checkResult.errors.length > 0) {
        const errorLogs = checkResult.errors.map(error => ({
          urlId: urlData._id,
          monitoringLogId,
          errorType: error.type,
          errorMessage: error.message,
          errorDetails: {
            consoleErrors: checkResult.consoleErrors,
            networkErrors: checkResult.networkErrors
          },
          screenshotPath: checkResult.screenshotPath
        }));
        
        await ErrorLog.insertMany(errorLogs);
      }

      // Simpan pemeriksaan iframe
      if (checkResult.iframeChecks.length > 0) {
        const iframeChecks = checkResult.iframeChecks.map(iframe => ({
          monitoringLogId,
          iframeSrc: iframe.src,
          iframeLoaded: iframe.loaded,
          errorMessage: iframe.error
        }));
        
        await IframeCheck.insertMany(iframeChecks);
      }

      // Simpan pemeriksaan video
      if (checkResult.videoChecks.length > 0) {
        const videoChecks = checkResult.videoChecks.map(video => ({
          monitoringLogId,
          videoElementFound: true,
          videoSrc: video.src,
          playable: video.playable,
          readyState: video.readyState,
          networkState: video.networkState,
          errorCode: video.errorCode,
          errorMessage: video.errorMessage
        }));
        
        await VideoCheck.insertMany(videoChecks);
      }

      logger.info('Pemeriksaan URL selesai', {
        urlId,
        url: urlData.url,
        status: checkResult.status,
        responseTime: checkResult.responseTime
      });

      return {
        ...checkResult,
        urlId: urlData._id.toString(),
        urlName: urlData.name,
        monitoringLogId: monitoringLogId.toString()
      };

    } catch (error) {
      logger.error('Pemeriksaan URL gagal', { urlId, error: error.message });
      throw error;
    }
  }

  /**
   * Periksa semua URL yang aktif
   */
  async checkAllUrls() {
    const urls = await this.getMonitoredUrls();
    const results = [];

    for (const url of urls) {
      try {
        const result = await this.checkUrl(url._id);
        results.push(result);
      } catch (error) {
        logger.error('Gagal memeriksa URL', { urlId: url._id, error: error.message });
        results.push({
          urlId: url._id,
          url: url.url,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Dapatkan status terbaru untuk semua URL
   */
  async getLatestStatus() {
    const urls = await MonitoredUrl.find({ enabled: true }).lean();
    const results = [];

    for (const url of urls) {
      const latestLog = await MonitoringLog.findOne({ urlId: url._id })
        .sort({ checkedAt: -1 })
        .lean();

      if (latestLog) {
        const hasErrors = await ErrorLog.exists({ monitoringLogId: latestLog._id });
        
        results.push({
          id: url._id.toString(),
          url: url.url,
          name: url.name,
          status: latestLog.status,
          http_status: latestLog.httpStatus,
          response_time_ms: latestLog.responseTime,
          checked_at: latestLog.checkedAt,
          has_errors: !!hasErrors
        });
      } else {
        results.push({
          id: url._id.toString(),
          url: url.url,
          name: url.name,
          status: null,
          http_status: null,
          response_time_ms: null,
          checked_at: null,
          has_errors: false
        });
      }
    }

    return results;
  }

  /**
   * Dapatkan riwayat monitoring untuk URL
   */
  async getUrlHistory(urlId, limit = 100) {
    const logs = await MonitoringLog.find({ urlId })
      .sort({ checkedAt: -1 })
      .limit(limit)
      .lean();

    const results = [];
    
    for (const log of logs) {
      const errors = await ErrorLog.find({ monitoringLogId: log._id }).lean();
      const iframeChecks = await IframeCheck.find({ monitoringLogId: log._id }).lean();
      const videoChecks = await VideoCheck.find({ monitoringLogId: log._id }).lean();
      
      results.push({
        ...log,
        errors: errors.length > 0 ? errors : null,
        iframe_checks: iframeChecks.length > 0 ? iframeChecks : null,
        video_checks: videoChecks.length > 0 ? videoChecks : null
      });
    }

    return results;
  }

  /**
   * Bersihkan resource
   */
  async cleanup() {
    if (this.browserWorker) {
      await this.browserWorker.cleanup();
    }
    logger.info('Layanan monitoring dibersihkan');
  }
}

module.exports = MonitoringService;
