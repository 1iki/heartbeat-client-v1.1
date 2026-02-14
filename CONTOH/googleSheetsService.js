const { google } = require('googleapis');
const logger = require('../utils/logger');
const path = require('path');

/**
 * GoogleSheetsService
 * Service untuk mengambil data URL monitoring dari Google Spreadsheet
 */
class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || '1_yFrfNIlwRXPHBsmWo_gBuYxudstnOQeBfyk-YHWd1U';
    this.sheetName = process.env.GOOGLE_SHEET_NAME || 'Hasil';
  }

  /**
   * Inisialisasi Google Sheets API dengan Service Account atau API Key
   */
  async initialize() {
    try {
      // ✅ PRIORITAS 1: Gunakan Service Account (untuk private spreadsheet)
      if (process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
        const keyFile = path.resolve(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_PATH);
        const auth = new google.auth.GoogleAuth({
          keyFile: keyFile,
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        this.sheets = google.sheets({ version: 'v4', auth });
        logger.info('Google Sheets Service diinisialisasi dengan Service Account');
        return;
      }

      // ✅ PRIORITAS 2: Gunakan API Key dari environment variable (untuk public spreadsheet)
      if (process.env.GOOGLE_API_KEY) {
        this.sheets = google.sheets({
          version: 'v4',
          auth: process.env.GOOGLE_API_KEY
        });
        logger.info('Google Sheets Service diinisialisasi dengan API Key dari environment');
        return;
      }

      // ❌ FALLBACK: Tidak ada kredensial
      logger.warn('⚠️ Tidak ada kredensial Google Sheets ditemukan. Service mungkin tidak berfungsi.');
      logger.warn('Set GOOGLE_API_KEY atau GOOGLE_SERVICE_ACCOUNT_PATH di environment variables');
      throw new Error('Google Sheets credentials tidak ditemukan. Lihat .env.example untuk setup.');

    } catch (error) {
      logger.error('Gagal menginisialisasi Google Sheets Service', { error: error.message });
      throw error;
    }
  }

  /**
   * Fetch data URL dari Google Spreadsheet
   * Mengambil data dari kolom C (URL) dan J (Name/Description) mulai dari row 2
   * @returns {Array} Array of objects dengan format { url, name }
   */
  async fetchMonitoringUrls() {
    try {
      logger.info('Mengambil data URL dari Google Spreadsheet', {
        spreadsheetId: this.spreadsheetId
      });

      // Ambil data dari kolom C dan J, mulai dari row 2 hingga akhir
      const range = `${this.sheetName}!C2:J`;

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: range,
      });

      const rows = response.data.values;

      if (!rows || rows.length === 0) {
        logger.warn('Tidak ada data ditemukan di spreadsheet');
        return [];
      }

      // Parse data - kolom C (index 0) adalah URL, kolom J (index 7) adalah Name
      const urls = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const url = row[7]; // Kolom C
        const name = row[0]; // Kolom J (C=0, D=1, E=2, F=3, G=4, H=5, I=6, J=7)

        // Skip row jika URL kosong
        if (!url || url.trim() === '') {
          continue;
        }

        // Validasi URL format
        if (!this.isValidUrl(url.trim())) {
          logger.warn(`URL tidak valid di row ${i + 2}`, { url: url.trim() });
          continue;
        }

        urls.push({
          url: url.trim(),
          name: name && name.trim() !== '' ? name.trim() : `URL dari Sheet Row ${i + 2}`,
          description: `Imported from Google Spreadsheet row ${i + 2}`,
          checkInterval: 60000, // Default 1 menit
          source: 'google_sheets',
          sheetRow: i + 2
        });
      }

      logger.info(`Berhasil mengambil ${urls.length} URL dari spreadsheet`);
      return urls;

    } catch (error) {
      logger.error('Gagal mengambil data dari Google Spreadsheet', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Validasi format URL
   */
  isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (err) {
      return false;
    }
  }

  /**
   * Sync URL dari spreadsheet ke database
   * - Menambahkan URL baru yang belum ada di database
   * - Menghapus URL yang tidak ada lagi di spreadsheet
   * - Update URL yang sudah ada jika ada perubahan
   */
  async syncUrlsToDatabase(monitoringService) {
    try {
      logger.info('Memulai sinkronisasi URL dari spreadsheet ke database');

      const sheetUrls = await this.fetchMonitoringUrls();
      const existingUrls = await monitoringService.getMonitoredUrls();

      // Buat map dari URL yang sudah ada di database
      const existingUrlMap = new Map(
        existingUrls.map(item => [item.url, item])
      );

      // Buat Set dari URL yang ada di sheet untuk perbandingan
      const sheetUrlSet = new Set(sheetUrls.map(item => item.url));

      let addedCount = 0;
      let skippedCount = 0;
      let deletedCount = 0;
      const deletedUrls = [];

      // ✅ STEP 1: Tambahkan URL baru dari Sheet
      for (const urlData of sheetUrls) {
        if (existingUrlMap.has(urlData.url)) {
          logger.info(`URL sudah ada di database, skip`, { url: urlData.url });
          skippedCount++;
          continue;
        }

        try {
          await monitoringService.addUrl(urlData);
          addedCount++;
          logger.info(`✅ URL baru ditambahkan dari sheet`, {
            url: urlData.url,
            name: urlData.name,
            row: urlData.sheetRow
          });
        } catch (error) {
          logger.error(`❌ Gagal menambahkan URL dari sheet`, {
            url: urlData.url,
            error: error.message
          });
        }
      }

      // ✅ STEP 2: Hapus URL dari database yang tidak ada di Sheet
      for (const existingUrl of existingUrls) {
        // Hanya hapus URL yang berasal dari Google Sheets
        if (existingUrl.source === 'google_sheets' && !sheetUrlSet.has(existingUrl.url)) {
          try {
            await monitoringService.deleteUrl(existingUrl._id);
            deletedCount++;
            deletedUrls.push({
              url: existingUrl.url,
              name: existingUrl.name
            });
            logger.info(`🗑️ URL dihapus karena tidak ada di sheet`, {
              url: existingUrl.url,
              name: existingUrl.name
            });
          } catch (error) {
            logger.error(`❌ Gagal menghapus URL`, {
              url: existingUrl.url,
              error: error.message
            });
          }
        }
      }

      const summary = {
        totalInSheet: sheetUrls.length,
        totalInDatabase: existingUrls.length,
        added: addedCount,
        deleted: deletedCount,
        skipped: skippedCount,
        deletedUrls: deletedUrls,
        timestamp: new Date().toISOString(),
        syncedCount: addedCount + deletedCount // Total perubahan
      };

      logger.info('✅ Sinkronisasi selesai', summary);
      return summary;

    } catch (error) {
      logger.error('❌ Gagal melakukan sinkronisasi', { error: error.message });
      throw error;
    }
  }

  /**
   * Get spreadsheet info untuk debugging
   */
  async getSpreadsheetInfo() {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      return {
        title: response.data.properties.title,
        sheets: response.data.sheets.map(sheet => ({
          title: sheet.properties.title,
          sheetId: sheet.properties.sheetId,
          rowCount: sheet.properties.gridProperties.rowCount,
          columnCount: sheet.properties.gridProperties.columnCount
        }))
      };
    } catch (error) {
      logger.error('Gagal mendapatkan info spreadsheet', { error: error.message });
      throw error;
    }
  }
}

module.exports = GoogleSheetsService;
