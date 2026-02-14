import { google } from 'googleapis';

/**
 * Google Sheets Service
 * Adapted from CONTOH/googleSheetsService.js for Next.js
 * Fetches monitoring URLs from Google Spreadsheet
 */

interface SheetUrlData {
    url: string;
    name: string;
    description: string;
    group: string;
    source: 'google_sheets';
    sheetRow: number;
}

class GoogleSheetsService {
    private sheets: any = null;
    private spreadsheetId: string;
    private sheetName: string;

    constructor() {
        this.spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || '1_yFrfNIlwRXPHBsmWo_gBuYxudstnOQeBfyk-YHWd1U';
        this.sheetName = process.env.GOOGLE_SHEET_NAME || 'Hasil';
    }

    /**
     * Initialize Google Sheets API
     */
    async initialize() {
        try {
            // Priority 1: Use API Key (for public spreadsheets)
            if (process.env.GOOGLE_API_KEY) {
                this.sheets = google.sheets({
                    version: 'v4',
                    auth: process.env.GOOGLE_API_KEY
                });
                console.log('Google Sheets initialized with API Key');
                return;
            }

            // Priority 2: Use Service Account (for private spreadsheets)
            if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
                const auth = new google.auth.GoogleAuth({
                    credentials: {
                        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
                    },
                    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
                });

                this.sheets = google.sheets({ version: 'v4', auth });
                console.log('Google Sheets initialized with Service Account');
                return;
            }

            throw new Error('No Google Sheets credentials found. Set GOOGLE_API_KEY or Service Account credentials.');
        } catch (error: any) {
            console.error('Failed to initialize Google Sheets:', error.message);
            throw error;
        }
    }

    /**
     * Fetch monitoring URLs from spreadsheet
     * Column mapping: C = URL, J = Name
     */
    async fetchMonitoringUrls(): Promise<SheetUrlData[]> {
        try {
            if (!this.sheets) {
                await this.initialize();
            }

            console.log('Fetching URLs from Google Spreadsheet:', this.spreadsheetId);

            // Fetch columns A and B (Name and URL) from row 2 onwards
            const range = `${this.sheetName}!A2:B`;
            console.log(`Fetching range: ${range}`);

            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: range,
            });

            const rows = response.data.values;

            if (!rows || rows.length === 0) {
                console.warn('No data found in spreadsheet');
                return [];
            }

            const urls: SheetUrlData[] = [];

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const name = row[0]; // Column A
                const url = row[1]; // Column B

                // Skip if URL is empty
                if (!url || url.trim() === '') {
                    continue;
                }

                // Validate URL format
                if (!this.isValidUrl(url.trim())) {
                    console.warn(`Invalid URL at row ${i + 2}:`, url.trim());
                    continue;
                }

                urls.push({
                    url: url.trim(),
                    name: name && name.trim() !== '' ? name.trim() : `URL from Sheet Row ${i + 2}`,
                    description: `Imported from Google Spreadsheet row ${i + 2}`,
                    group: 'website', // Default group
                    source: 'google_sheets',
                    sheetRow: i + 2
                });
            }

            console.log(`Fetched ${urls.length} URLs from spreadsheet`);
            return urls;

        } catch (error: any) {
            console.error('Failed to fetch from Google Spreadsheet:', error.message);
            throw error;
        }
    }

    /**
     * Validate URL format
     */
    private isValidUrl(string: string): boolean {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false;
        }
    }

    /**
     * Get spreadsheet info for debugging
     */
    async getSpreadsheetInfo() {
        try {
            if (!this.sheets) {
                await this.initialize();
            }

            const response = await this.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId
            });

            return {
                title: response.data.properties.title,
                sheets: response.data.sheets.map((sheet: any) => ({
                    title: sheet.properties.title,
                    sheetId: sheet.properties.sheetId,
                    rowCount: sheet.properties.gridProperties.rowCount,
                    columnCount: sheet.properties.gridProperties.columnCount
                }))
            };
        } catch (error: any) {
            console.error('Failed to get spreadsheet info:', error.message);
            throw error;
        }
    }
}

// Export singleton instance
export const googleSheetsService = new GoogleSheetsService();
