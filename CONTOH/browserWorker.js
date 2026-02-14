const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');
const { HealthStatus } = require('../models/healthStatus');

/**
 * HeadlessBrowserWorker
 * Worker browser terisolasi siap produksi untuk inspeksi mendalam
 * Menghormati model keamanan browser - TIDAK mengakses DOM iframe lintas-origin
 */
class HeadlessBrowserWorker {
  constructor(options = {}) {
    // ✅ STANDARISASI: Default timeout 35 detik untuk response yang lebih realistis
    this.timeout = options.timeout || parseInt(process.env.REQUEST_TIMEOUT_MS || '35000');
    this.screenshotOnError = options.screenshotOnError !== false;
    this.browser = null;
    this.context = null;
    // ✅ Timeout untuk network idle (menunggu halaman selesai loading semua resources)
    this.networkIdleTimeout = 30000; // 10 detik untuk network idle
  }

  /**
   * Inisialisasi instance browser
   */
  async initialize() {
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
      
      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      logger.info('Browser berhasil diinisialisasi');
    } catch (error) {
      logger.error('Gagal menginisialisasi browser', { error: error.message });
      throw error;
    }
  }

  /**
   * Periksa kesehatan URL dengan deteksi komprehensif
   */
  async checkUrl(url, authConfig = null) {
    const startTime = Date.now();
    const result = {
      url,
      status: HealthStatus.UP,
      httpStatus: null,
      responseTime: 0,
      contentLength: 0,
      errors: [],
      consoleErrors: [],
      iframeChecks: [],
      videoChecks: [],
      networkErrors: [],
      screenshotPath: null,
      authAttempted: false,
      authSuccess: false,
      timestamp: new Date().toISOString(),
      errorDetails: {
        summary: '',
        location: '',
        reason: '',
        recommendation: ''
      }
    };

    let page = null;

    try {
      // Buat halaman baru
      page = await this.context.newPage();

      // Login otomatis jika kredensial disediakan
      if (authConfig && authConfig.requiresAuth) {
        try {
          result.authAttempted = true;
          await this.performLogin(page, authConfig);
          result.authSuccess = true;
          logger.info('Login otomatis berhasil', { url });
        } catch (authError) {
          logger.error('Login otomatis gagal', { url, error: authError.message });
          result.status = HealthStatus.DOWN;
          result.errors.push({
            type: 'AUTH_FAILED',
            message: `Autentikasi gagal: ${authError.message}`
          });
          result.errorDetails = {
            summary: 'Gagal melakukan autentikasi pada halaman login',
            location: `Login URL: ${authConfig.loginUrl || url}`,
            reason: `Detail: ${authError.message}. Kemungkinan kredensial salah, form login berubah, atau timeout saat login.`,
            recommendation: 'Periksa kredensial login (username/password), pastikan form login masih sama, dan cek koneksi jaringan.'
          };
          result.authSuccess = false;
          return result;
        }
      }

      // Kumpulkan error konsol
      page.on('console', msg => {
        if (msg.type() === 'error') {
          const text = msg.text();
          const location = msg.location();
          result.consoleErrors.push({
            message: text,
            file: location.url || 'unknown',
            line: location.lineNumber || 0,
            column: location.columnNumber || 0
          });
          logger.debug('Error konsol terdeteksi', { url, error: text, location });
        }
      });

      // Kumpulkan error jaringan
      page.on('requestfailed', request => {
        const failure = {
          url: request.url(),
          method: request.method(),
          resourceType: request.resourceType(),
          failure: request.failure()?.errorText || 'Error tidak diketahui'
        };
        result.networkErrors.push(failure);
        logger.debug('Permintaan jaringan gagal', { url, ...failure });
      });

      // Navigasi ke URL dengan timeout
      let response;
      try {
        response = await page.goto(url, {
          timeout: this.timeout,
          waitUntil: 'domcontentloaded'
        });
      } catch (error) {
        if (error.message.includes('Timeout') || error.name === 'TimeoutError') {
          result.status = HealthStatus.TIMEOUT;
          result.errors.push({ type: 'TIMEOUT', message: 'Timeout pemuatan halaman terlewati' });
          result.errorDetails = {
            summary: 'Halaman membutuhkan waktu terlalu lama untuk dimuat',
            location: `URL: ${url}`,
            reason: `Server tidak merespons dalam ${this.timeout/1000} detik. Kemungkinan: server lambat, koneksi jaringan buruk, atau halaman terlalu berat.`,
            recommendation: `Periksa kecepatan server dan koneksi jaringan. Pertimbangkan untuk mengoptimalkan performa halaman atau menambah timeout.`
          };
          return result;
        }
        
        if (error.message.includes('net::') || error.message.includes('DNS')) {
          result.status = HealthStatus.NETWORK_ERROR;
          result.errors.push({ type: 'NETWORK_ERROR', message: error.message });
          const errorType = error.message.includes('DNS') ? 'DNS' : 'Network';
          result.errorDetails = {
            summary: `Kesalahan ${errorType} - tidak dapat terhubung ke server`,
            location: `URL: ${url}`,
            reason: `Detail teknis: ${error.message}. ${errorType === 'DNS' ? 'Domain tidak dapat di-resolve atau tidak terdaftar.' : 'Koneksi jaringan gagal, server mungkin down atau tidak dapat dijangkau.'}`,
            recommendation: errorType === 'DNS' 
              ? 'Periksa nama domain, pastikan domain aktif dan DNS sudah terkonfigurasi dengan benar.'
              : 'Periksa status server, firewall, dan koneksi jaringan. Pastikan URL benar dan server dalam keadaan running.'
          };
          return result;
        }
        
        throw error;
      }

      // Dapatkan status HTTP
      if (response) {
        result.httpStatus = response.status();
        
        if (result.httpStatus >= 400) {
          result.status = HealthStatus.DOWN;
          const statusText = response.statusText();
          result.errors.push({
            type: 'HTTP_ERROR',
            message: `HTTP ${result.httpStatus} ${statusText}`
          });
          const httpExplanation = this.getHttpErrorExplanation(result.httpStatus);
          result.errorDetails = {
            summary: `Error HTTP ${result.httpStatus}: ${statusText}`,
            location: `URL: ${url}`,
            reason: httpExplanation.reason,
            recommendation: httpExplanation.recommendation
          };
          return result;
        }
      }

      // Tunggu halaman stabil dengan timeout yang lebih panjang
      // ✅ PERBAIKAN: Gunakan networkIdleTimeout yang lebih realistis (10 detik)
      try {
        await page.waitForLoadState('networkidle', { timeout: this.networkIdleTimeout });
        logger.debug('Halaman mencapai networkidle', { url });
      } catch (timeoutError) {
        // ✅ Ini BUKAN error - hanya berarti halaman masih ada aktivitas network
        // Kita tetap lanjutkan pemeriksaan, tidak langsung tandai sebagai error
        logger.debug('Network idle timeout (normal untuk halaman dinamis)', { url, timeout: this.networkIdleTimeout });
      }

      // Periksa konten kosong
      const contentCheck = await this.checkEmptyContent(page);
      if (contentCheck.isEmpty) {
        result.status = HealthStatus.EMPTY;
        result.errors.push({
          type: 'EMPTY_CONTENT',
          message: 'Halaman dimuat tetapi konten kosong atau blank'
        });
        result.errorDetails = {
          summary: 'Halaman dimuat tetapi tidak menampilkan konten apapun',
          location: `URL: ${url} - Elemen visible: ${contentCheck.visibleElementCount}, Panjang teks: ${contentCheck.contentLength}`,
          reason: 'Halaman berhasil dimuat (HTTP 200 OK) tetapi body halaman kosong atau hanya berisi elemen yang tidak terlihat. Kemungkinan: error JavaScript, loading data gagal, atau halaman masih dalam tahap development.',
          recommendation: 'Periksa console browser untuk error JavaScript, pastikan API/data source berfungsi dengan baik, dan verifikasi bahwa halaman sudah di-deploy dengan benar.'
        };
      }
      result.contentLength = contentCheck.contentLength;

      // Periksa iframe (tanpa mengakses konten lintas-origin)
      result.iframeChecks = await this.checkIframes(page);
      
      // Periksa elemen video
      result.videoChecks = await this.checkVideos(page);

      // Klasifikasi error JavaScript
      if (result.consoleErrors.length > 0) {
        const hasVideoError = result.consoleErrors.some(err => 
          err.message.toLowerCase().includes('video') || 
          err.message.toLowerCase().includes('media') ||
          err.message.toLowerCase().includes('player')
        );
        
        if (hasVideoError && result.status === HealthStatus.UP) {
          result.status = HealthStatus.NOT_PLAYABLE;
          result.errors.push({
            type: 'VIDEO_ERROR',
            message: 'Error pemutaran video terdeteksi di konsol'
          });
          const videoErrors = result.consoleErrors.filter(e => 
            e.message.toLowerCase().includes('video') || 
            e.message.toLowerCase().includes('media')
          );
          result.errorDetails = {
            summary: `Ditemukan ${videoErrors.length} error pemutaran video`,
            location: videoErrors.map(e => `File: ${e.file}:${e.line}:${e.column}`).join('; '),
            reason: `Error JavaScript: ${videoErrors.map(e => e.message).join(' | ')}. Kemungkinan: codec video tidak didukung, source video tidak tersedia, atau masalah DRM/CORS.`,
            recommendation: 'Periksa format video (gunakan H.264/MP4 untuk kompatibilitas maksimal), pastikan URL video valid dan accessible, dan verifikasi konfigurasi CORS jika video dari domain berbeda.'
          };
        } else if (result.status === HealthStatus.UP) {
          result.status = HealthStatus.JS_ERROR;
          result.errors.push({
            type: 'JS_ERROR',
            message: `${result.consoleErrors.length} error JavaScript terdeteksi`
          });
          const topErrors = result.consoleErrors.slice(0, 3);
          result.errorDetails = {
            summary: `Ditemukan ${result.consoleErrors.length} error JavaScript di console`,
            location: topErrors.map(e => `${e.file}:${e.line}:${e.column}`).join('; '),
            reason: `Error: ${topErrors.map(e => e.message.substring(0, 100)).join(' | ')}. Error JavaScript dapat menyebabkan fitur halaman tidak berfungsi dengan baik.`,
            recommendation: `Buka developer console di browser untuk melihat detail lengkap. Perbaiki error dari yang paling atas/kritis terlebih dahulu. ${result.consoleErrors.length > 3 ? `(+${result.consoleErrors.length - 3} error lainnya)` : ''}`
          };
        }
      }

      // Periksa kegagalan iframe
      const failedIframes = result.iframeChecks.filter(i => !i.loaded);
      if (failedIframes.length > 0) {
        if (result.status === HealthStatus.UP) {
          result.status = result.iframeChecks.length === failedIframes.length 
            ? HealthStatus.IFRAME_FAILED 
            : HealthStatus.PARTIAL;
          result.errors.push({
            type: 'IFRAME_FAILED',
            message: `${failedIframes.length} dari ${result.iframeChecks.length} iframe gagal dimuat`
          });
          result.errorDetails = {
            summary: `${failedIframes.length} dari ${result.iframeChecks.length} iframe gagal dimuat`,
            location: `URL iframe yang gagal: ${failedIframes.map(f => f.src || 'no-src').join(', ')}`,
            reason: `Detail: ${failedIframes.map(f => f.error || 'unknown error').join('; ')}. Kemungkinan: CORS policy, URL iframe tidak valid, atau konten iframe tidak dapat diakses.`,
            recommendation: 'Periksa konfigurasi CORS pada server iframe, pastikan URL iframe valid dan accessible, dan verifikasi bahwa iframe source tidak memblokir embedding.'
          };
        }
      }

      // Periksa masalah pemutaran video
      const unplayableVideos = result.videoChecks.filter(v => !v.playable);
      if (unplayableVideos.length > 0 && result.status === HealthStatus.UP) {
        result.status = HealthStatus.NOT_PLAYABLE;
        result.errors.push({
          type: 'VIDEO_NOT_PLAYABLE',
          message: `${unplayableVideos.length} video tidak dapat diputar`
        });
        result.errorDetails = {
          summary: `${unplayableVideos.length} dari ${result.videoChecks.length} video tidak dapat diputar`,
          location: `Video source: ${unplayableVideos.map(v => v.src || 'no-source').join(', ')}`,
          reason: `Detail: ReadyState=${unplayableVideos[0]?.readyState}, NetworkState=${unplayableVideos[0]?.networkState}, ErrorCode=${unplayableVideos[0]?.errorCode}. ${!unplayableVideos[0]?.hasSource ? 'Video tidak memiliki source.' : 'Video gagal dimuat atau format tidak didukung.'}`,
          recommendation: 'Pastikan video memiliki tag <source> yang valid, gunakan format video yang didukung browser (MP4 H.264), dan periksa bahwa video file dapat diakses.'
        };
      }

      // Periksa kegagalan jaringan kritis
      const criticalFailures = result.networkErrors.filter(e => 
        e.resourceType === 'document' || 
        e.resourceType === 'script' ||
        e.resourceType === 'stylesheet'
      );
      
      if (criticalFailures.length > 0 && result.status === HealthStatus.UP) {
        result.status = HealthStatus.PARTIAL;
        result.errors.push({
          type: 'NETWORK_ERROR',
          message: `${criticalFailures.length} sumber daya kritis gagal dimuat`
        });
        result.errorDetails = {
          summary: `${criticalFailures.length} resource kritis gagal dimuat`,
          location: `Failed resources: ${criticalFailures.map(f => `[${f.resourceType}] ${f.url.substring(0, 50)}...`).join('; ')}`,
          reason: `Error: ${criticalFailures.map(f => f.failure).join('; ')}. Resource kritis (script/stylesheet/document) yang gagal dapat menyebabkan halaman tidak berfungsi dengan baik.`,
          recommendation: `Periksa ketersediaan resource: ${criticalFailures.map(f => f.url).join(', ')}. Pastikan CDN/static files server berfungsi, dan verifikasi tidak ada typo pada URL resource.`
        };
      }

      if (result.status === HealthStatus.UP && result.errors.length === 0) {
        result.errorDetails = {
          summary: '✅ Halaman berfungsi dengan baik',
          location: `URL: ${url}`,
          reason: `Halaman berhasil dimuat tanpa error (HTTP ${result.httpStatus}). Response time: ${result.responseTime}ms. Content length: ${result.contentLength} chars.`,
          recommendation: 'Tidak ada tindakan yang diperlukan. Monitoring berjalan normal.'
        };
      }

    } catch (error) {
      logger.error('Pemeriksaan URL gagal', { url, error: error.message, stack: error.stack });
      result.status = HealthStatus.DOWN;
      result.errors.push({
        type: 'UNKNOWN_ERROR',
        message: error.message
      });
      result.errorDetails = {
        summary: 'Terjadi error tidak terduga saat monitoring',
        location: `URL: ${url}`,
        reason: `Error message: ${error.message}. Stack trace: ${error.stack?.split('\n')[1]?.trim() || 'unavailable'}. Ini adalah error yang tidak terduga dalam proses monitoring.`,
        recommendation: 'Periksa log file untuk detail lengkap. Jika error berulang, hubungi administrator sistem atau periksa konfigurasi monitoring.'
      };
    } finally {
      result.responseTime = Date.now() - startTime;

      // Tangkap screenshot saat error
      if (page && this.screenshotOnError && result.status !== HealthStatus.UP) {
        try {
          const screenshotDir = path.join(process.cwd(), 'screenshots');
          await fs.mkdir(screenshotDir, { recursive: true });
          
          const timestamp = Date.now();
          const filename = `error_${Buffer.from(url).toString('base64').substring(0, 30)}_${timestamp}.png`;
          const screenshotPath = path.join(screenshotDir, filename);
          
          await page.screenshot({ path: screenshotPath, fullPage: false });
          result.screenshotPath = screenshotPath;
          result.errorDetails.screenshot = screenshotPath;
          logger.info('Screenshot berhasil ditangkap', { url, path: screenshotPath });
        } catch (screenshotError) {
          logger.error('Gagal menangkap screenshot', { error: screenshotError.message });
        }
      }

      // Bersihkan
      if (page) {
        await page.close().catch(() => {});
      }
    }

    return result;
  }

  /**
   * Perform login dengan dukungan page dan modal
   */
  async performLogin(page, authConfig) {
    const loginUrl = authConfig.loginUrl || authConfig.url;
    const loginType = authConfig.loginType || 'page';
    const username = authConfig.username;
    const password = authConfig.password;
    
    logger.info('Memulai proses login otomatis', { 
      loginUrl, 
      loginType,
      hasUsername: !!username,
      hasPassword: !!password 
    });

    try {
      if (loginType === 'modal') {
        // Handle modal login
        const modalTrigger = authConfig.modalTrigger;
        const loginSelectors = {
          username: authConfig.usernameSelector,
          password: authConfig.passwordSelector,
          submit: authConfig.submitSelector
        };
        
        await this.handleModalLogin(page, modalTrigger, loginSelectors, username, password);
      } else {
        // Handle page login
        await this.performPageLogin(page, loginUrl, username, password, {
          usernameSelector: authConfig.usernameSelector,
          passwordSelector: authConfig.passwordSelector,
          submitSelector: authConfig.submitSelector
        });
      }

      // Verifikasi login berhasil
      await this.verifyLoginSuccess(page);
      
      logger.info('✅ Login berhasil diverifikasi');
      return true;
    } catch (error) {
      logger.error('❌ Proses login gagal', { 
        loginUrl, 
        loginType,
        error: error.message,
        stack: error.stack 
      });
      throw error;
    }
  }

  /**
   * Perform page-based login
   */
  async performPageLogin(page, loginUrl, username, password, customSelectors = {}) {
    logger.info('Navigasi ke halaman login', { loginUrl });

    try {
      // Navigasi ke halaman login
      await page.goto(loginUrl, { 
        waitUntil: 'networkidle',
        timeout: 20000
      });

      await page.waitForTimeout(2000);

      // Strategi deteksi form yang robust
      const usernameSelectors = customSelectors.usernameSelector ? [customSelectors.usernameSelector] : [
        'input[id="email"]',
        'input[name="email"]',
        'input[id="Email"]',
        'input[name="Email"]',
        'input[id="username"]',
        'input[name="username"]',
        'input[type="email"]',
        'input[placeholder*="email" i]',
        'input[placeholder*="username" i]',
        'input[aria-label*="email" i]',
        'input[type="text"]:visible:first'
      ];

      let usernameFilled = false;
      let usedUsernameSelector = '';
      
      for (const selector of usernameSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const isVisible = await element.isVisible();
            if (isVisible) {
              await element.fill(username);
              usedUsernameSelector = selector;
              logger.info('✅ Username/Email berhasil diisi', { selector });
              usernameFilled = true;
              break;
            }
          }
        } catch (error) {
          logger.debug('Selector tidak cocok', { selector });
        }
      }

      if (!usernameFilled) {
        throw new Error('Gagal menemukan input username/email. Halaman login mungkin memiliki struktur yang berbeda.');
      }

      // Password selectors
      const passwordSelectors = customSelectors.passwordSelector ? [customSelectors.passwordSelector] : [
        'input[id="password"]',
        'input[name="password"]',
        'input[type="password"]',
        'input[placeholder*="password" i]',
        'input[aria-label*="password" i]'
      ];

      let passwordFilled = false;
      let usedPasswordSelector = '';
      
      for (const selector of passwordSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const isVisible = await element.isVisible();
            if (isVisible) {
              await element.fill(password);
              usedPasswordSelector = selector;
              logger.info('✅ Password berhasil diisi', { selector });
              passwordFilled = true;
              break;
            }
          }
        } catch (error) {
          logger.debug('Selector tidak cocok', { selector });
        }
      }

      if (!passwordFilled) {
        throw new Error('Gagal menemukan input password. Halaman login mungkin memiliki struktur yang berbeda.');
      }

      // Submit form
      const submitSelectors = customSelectors.submitSelector ? [customSelectors.submitSelector] : [
        'button[type="submit"]',
        'button:has-text("Login")',
        'button:has-text("Masuk")',
        'button:has-text("Sign in")',
        'input[type="submit"]',
        'button[id*="login" i]'
      ];

      let submitted = false;
      for (const selector of submitSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const isVisible = await element.isVisible();
            if (isVisible) {
              await element.click();
              logger.info('✅ Submit button berhasil diklik', { selector });
              submitted = true;
              break;
            }
          }
        } catch (error) {
          logger.debug('Submit selector tidak cocok', { selector });
        }
      }

      if (!submitted) {
        logger.info('Fallback: Tekan Enter di password field');
        await page.keyboard.press('Enter');
      }

      // Tunggu navigasi selesai
      await page.waitForTimeout(3000);

      logger.info('Login form berhasil di-submit', { 
        usernameSelector: usedUsernameSelector,
        passwordSelector: usedPasswordSelector 
      });
      
    } catch (error) {
      logger.error('Login page gagal', { 
        loginUrl, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Fill login form inside modal
   */
  async fillLoginFormInModal(page, modalScope, username, password) {
    logger.info('Mengisi form login di dalam modal', { modalScope });

    try {
      // Username selectors inside modal
      const usernameSelectors = [
        `${modalScope} input[id="email"]`,
        `${modalScope} input[name="email"]`,
        `${modalScope} input[type="email"]`,
        `${modalScope} input[placeholder*="email" i]`,
        `${modalScope} input[type="text"]:visible:first`
      ];

      let usernameFilled = false;
      for (const selector of usernameSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000, state: 'visible' });
          await page.fill(selector, username);
          logger.info('✅ Username diisi di modal', { selector });
          usernameFilled = true;
          break;
        } catch (error) {
          logger.debug('Modal username selector tidak ditemukan', { selector });
        }
      }

      if (!usernameFilled) {
        throw new Error('Gagal menemukan input username di dalam modal');
      }

      // Password selectors inside modal
      const passwordSelectors = [
        `${modalScope} input[id="password"]`,
        `${modalScope} input[name="password"]`,
        `${modalScope} input[type="password"]`
      ];

      let passwordFilled = false;
      for (const selector of passwordSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000, state: 'visible' });
          await page.fill(selector, password);
          logger.info('✅ Password diisi di modal', { selector });
          passwordFilled = true;
          break;
        } catch (error) {
          logger.debug('Modal password selector tidak ditemukan', { selector });
        }
      }

      if (!passwordFilled) {
        throw new Error('Gagal menemukan input password di dalam modal');
      }

      // Submit button inside modal
      const submitSelectors = [
        `${modalScope} button[type="submit"]`,
        `${modalScope} button:has-text("Login")`,
        `${modalScope} button:has-text("Masuk")`,
        `${modalScope} button:has-text("Sign in")`
      ];

      let submitted = false;
      for (const selector of submitSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000, state: 'visible' });
          await page.click(selector);
          logger.info('✅ Submit button diklik di modal', { selector });
          submitted = true;
          break;
        } catch (error) {
          logger.debug('Modal submit selector tidak ditemukan', { selector });
        }
      }

      if (!submitted) {
        logger.info('Fallback: Tekan Enter di password field modal');
        await page.keyboard.press('Enter');
      }

      await page.waitForTimeout(3000);
      
    } catch (error) {
      logger.error('Gagal mengisi form di modal', { error: error.message });
      throw error;
    }
  }

  /**
   * Mendapatkan penjelasan detail untuk HTTP error codes
   */
  getHttpErrorExplanation(statusCode) {
    const explanations = {
      400: {
        reason: 'Bad Request - Server tidak dapat memproses permintaan karena syntax tidak valid atau parameter salah.',
        recommendation: 'Periksa format URL, parameter query string, dan pastikan request headers sudah benar.'
      },
      401: {
        reason: 'Unauthorized - Akses ditolak karena autentikasi diperlukan atau kredensial tidak valid.',
        recommendation: 'Periksa kredensial login (username/password), session token, atau API key. Pastikan sudah login dengan benar.'
      },
      403: {
        reason: 'Forbidden - Server menolak akses meskipun sudah terautentikasi. Kemungkinan tidak memiliki permission yang cukup.',
        recommendation: 'Periksa hak akses user/role. Hubungi administrator untuk mendapatkan permission yang sesuai.'
      },
      404: {
        reason: 'Not Found - URL atau resource yang diminta tidak ditemukan di server.',
        recommendation: 'Periksa URL apakah sudah benar, pastikan halaman/file belum dihapus atau dipindahkan. Cek routing configuration.'
      },
      405: {
        reason: 'Method Not Allowed - HTTP method yang digunakan tidak diizinkan untuk endpoint ini.',
        recommendation: 'Periksa HTTP method (GET/POST/PUT/DELETE). Pastikan endpoint mendukung method yang digunakan.'
      },
      408: {
        reason: 'Request Timeout - Server timeout menunggu request dari client.',
        recommendation: 'Periksa koneksi jaringan dan kecepatan upload. Server mungkin terlalu sibuk atau timeout threshold terlalu pendek.'
      },
      429: {
        reason: 'Too Many Requests - Rate limit terlampaui, terlalu banyak request dalam waktu singkat.',
        recommendation: 'Kurangi frekuensi monitoring atau request. Implementasi retry dengan exponential backoff. Hubungi admin untuk menaikkan rate limit.'
      },
      500: {
        reason: 'Internal Server Error - Terjadi error di sisi server saat memproses request.',
        recommendation: 'Periksa server logs untuk detail error. Kemungkinan bug di kode server, database error, atau dependency service down.'
      },
      502: {
        reason: 'Bad Gateway - Gateway/proxy server menerima response tidak valid dari upstream server.',
        recommendation: 'Periksa status upstream server dan load balancer. Restart reverse proxy (nginx/apache) jika diperlukan.'
      },
      503: {
        reason: 'Service Unavailable - Server temporary tidak dapat melayani request (maintenance, overload, atau down).',
        recommendation: 'Tunggu beberapa saat dan coba lagi. Periksa status server, apakah sedang maintenance atau overload. Scale up resources jika perlu.'
      },
      504: {
        reason: 'Gateway Timeout - Gateway/proxy timeout menunggu response dari upstream server.',
        recommendation: 'Periksa performa upstream server. Mungkin query database terlalu lambat atau external API tidak merespons. Optimalkan performa backend.'
      }
    };

    return explanations[statusCode] || {
      reason: `HTTP Error ${statusCode} - Terjadi error pada server atau request yang dikirim.`,
      recommendation: 'Periksa dokumentasi HTTP status code untuk detail lebih lanjut. Hubungi administrator sistem jika masalah berlanjut.'
    };
  }

  /**
   * Verify login success
   */
  async verifyLoginSuccess(page) {
    const currentUrl = page.url();
    
    // Check if still on login page (might indicate failure)
    if (currentUrl.includes('login') || currentUrl.includes('signin')) {
      // Check for error messages
      const errorMessages = await page.evaluate(() => {
        const errors = [];
        const errorSelectors = [
          '.error', '.alert-danger', '.error-message', 
          '[class*="error"]', '[class*="invalid"]',
          '[role="alert"]', '.toast-error', '.notification-error'
        ];
        
        errorSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 0 && text.length < 200) { // Hindari false positive
              errors.push(text);
            }
          });
        });
        
        return errors;
      });

      if (errorMessages.length > 0) {
        throw new Error(`Login gagal: ${errorMessages.join(', ')}`);
      }
    }

    // Additional check: Look for logged-in indicators
    const isLoggedIn = await page.evaluate(() => {
      // Check for common logged-in indicators
      const indicators = [
        '.user-menu',
        '.profile-menu',
        '[data-testid="user-menu"]',
        'button:has-text("Logout")',
        'button:has-text("Log out")',
        'a:has-text("Profile")',
        '.logout-btn',
        '[href*="logout"]',
        '.user-avatar',
        '.account-menu'
      ];

      return indicators.some(selector => {
        try {
          return document.querySelector(selector) !== null;
        } catch {
          return false;
        }
      });
    });

    if (!isLoggedIn && (currentUrl.includes('login') || currentUrl.includes('signin'))) {
      logger.warn('Login mungkin gagal - tidak ada indikator logged-in ditemukan');
    }
  }

  /**
   * Periksa apakah konten halaman kosong
   */
  async checkEmptyContent(page) {
    try {
      const contentInfo = await page.evaluate(() => {
        const bodyText = document.body.innerText || '';
        const trimmedText = bodyText.trim();
        const visibleElements = document.querySelectorAll('body *:not(script):not(style)');
        
        return {
          contentLength: trimmedText.length,
          isEmpty: trimmedText.length === 0 && visibleElements.length < 5,
          visibleElementCount: visibleElements.length
        };
      });
      
      return contentInfo;
    } catch (error) {
      logger.error('Pemeriksaan konten gagal', { error: error.message });
      return { contentLength: 0, isEmpty: false, visibleElementCount: 0 };
    }
  }

  /**
   * Periksa kesehatan iframe TANPA mengakses konten lintas-origin
   * Menghormati model keamanan browser
   */
  async checkIframes(page) {
    try {
      const iframes = await page.evaluate(() => {
        const iframeElements = Array.from(document.querySelectorAll('iframe'));
        
        return iframeElements.map((iframe, index) => {
          // Hanya akses properti yang tidak melanggar CORS
          return {
            index,
            src: iframe.src || iframe.getAttribute('src') || '',
            id: iframe.id || null,
            className: iframe.className || null,
            width: iframe.width || null,
            height: iframe.height || null,
            // Kita tidak dapat mengakses iframe.contentWindow atau contentDocument karena CORS
            hasValidSrc: !!(iframe.src || iframe.getAttribute('src'))
          };
        });
      });

      // Periksa setiap iframe dengan memantau permintaan jaringan dan status elemen
      const iframeChecks = [];
      
      for (const iframe of iframes) {
        const check = {
          src: iframe.src,
          loaded: false,
          loadTime: null,
          error: null
        };

        // Periksa apakah iframe memiliki sumber yang valid
        if (!iframe.hasValidSrc) {
          check.error = 'Tidak ada atribut src';
          iframeChecks.push(check);
          continue;
        }

        // Periksa apakah src iframe berhasil diminta dengan memantau jaringan
        const iframeLoaded = await page.evaluate((src) => {
          const iframe = Array.from(document.querySelectorAll('iframe'))
            .find(el => el.src === src || el.getAttribute('src') === src);
          
          if (!iframe) return false;
          
          // Periksa apakah iframe tampak dimuat (memiliki dimensi dan ada di DOM)
          const rect = iframe.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && iframe.isConnected;
        }, iframe.src);

        check.loaded = iframeLoaded;
        if (!iframeLoaded) {
          check.error = 'Elemen iframe tidak dimuat dengan benar';
        }

        iframeChecks.push(check);
      }

      return iframeChecks;
    } catch (error) {
      logger.error('Pemeriksaan iframe gagal', { error: error.message });
      return [];
    }
  }

  /**
   * Periksa kesehatan elemen video dan kemampuan pemutaran
   */
  async checkVideos(page) {
    try {
      const videos = await page.evaluate(() => {
        const videoElements = Array.from(document.querySelectorAll('video'));
        
        return videoElements.map((video, index) => {
          const errorCode = video.error ? video.error.code : null;
          const errorMessage = video.error ? video.error.message : null;
          
          return {
            index,
            src: video.src || video.currentSrc || '',
            readyState: video.readyState,
            networkState: video.networkState,
            paused: video.paused,
            duration: video.duration,
            error: errorCode,
            errorMessage: errorMessage,
            playable: video.readyState >= 2 && video.networkState !== 3 && !video.error,
            hasSource: !!(video.src || video.currentSrc || video.querySelector('source'))
          };
        });
      });

      return videos.map(v => ({
        src: v.src,
        playable: v.playable,
        readyState: v.readyState,
        networkState: v.networkState,
        errorCode: v.error,
        errorMessage: v.errorMessage,
        hasSource: v.hasSource
      }));
    } catch (error) {
      logger.error('Pemeriksaan video gagal', { error: error.message });
      return [];
    }
  }

  /**
   * Bersihkan resource
   */
  async cleanup() {
    try {
      if (this.context) {
        await this.context.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
      logger.info('Browser berhasil dibersihkan');
    } catch (error) {
      logger.error('Pembersihan browser gagal', { error: error.message });
    }
  }
}

module.exports = HeadlessBrowserWorker;
