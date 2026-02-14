const { google } = require('googleapis');

// Hardcoded from .env.local for debugging
const API_KEY = 'AIzaSyCv4fFKarcRR1iVONOGrO-vecKs-QDrvF0';
const SPREADSHEET_ID = '1_yFrfNIlwRXPHBsmWo_gBuYxudstnOQeBfyk-YHWd1U';

async function debug() {
    console.log('--- Google Sheets Debugger ---');
    console.log(`Spreadsheet ID: ${SPREADSHEET_ID}`);

    const sheets = google.sheets({
        version: 'v4',
        auth: API_KEY
    });

    try {
        // 1. Get Spreadsheet Metadata (Sheet Names)
        const metadata = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID
        });

        console.log('\n[Sheets Found]:');
        metadata.data.sheets.forEach(s => {
            console.log(`- "${s.properties.title}" (ID: ${s.properties.sheetId}) - Grid: ${s.properties.gridProperties.rowCount}x${s.properties.gridProperties.columnCount}`);
        });

        // 2. Try fetching data from "Hasil" (A1:B10)
        console.log('\n[Checking "Hasil!A1:B10"]:');
        try {
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Hasil!A1:B10', // Check header and first few data rows
            });
            const rows = response.data.values;
            if (!rows || rows.length === 0) {
                console.log('⚠️  No data found in A1:B10');
            } else {
                console.log(`✅ Found ${rows.length} rows:`);
                rows.forEach((r, i) => console.log(`   ${i + 1}: ${JSON.stringify(r)}`));
            }
        } catch (err) {
            console.error('❌ Error fetching Hasil:', err.message);
        }

        // 3. Try fetching data from "FetchData" (A1:B10) just in case
        console.log('\n[Checking "FetchData!A1:B10"]:');
        try {
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'FetchData!A1:B10',
            });
            const rows = response.data.values;
            if (!rows || rows.length === 0) {
                console.log('⚠️  No data found in A1:B10');
            } else {
                console.log(`✅ Found ${rows.length} rows:`);
                rows.forEach((r, i) => console.log(`   ${i + 1}: ${JSON.stringify(r)}`));
            }
        } catch (err) {
            console.error('❌ Error fetching FetchData:', err.message);
        }

    } catch (error) {
        console.error('FATAL ERROR:', error.message);
    }
}

debug();
