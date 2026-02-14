import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongoose";
import NodeModel from "@/lib/db/models/Node";
import { googleSheetsService } from "@/lib/services/googleSheets";

/**
 * POST /api/google-sheets/sync
 * Sync URLs from Google Spreadsheet to database
 * - Adds new URLs from sheet
 * - Optionally removes URLs not in sheet (if source = google_sheets)
 */
export async function POST(request: NextRequest) {
    try {
        const { deleteOrphaned = true } = await request.json();

        // Check if MongoDB is configured
        if (!process.env.MONGODB_URI) {
            return NextResponse.json({
                success: false,
                error: "MongoDB not configured",
                message: "Please set MONGODB_URI in .env.local",
            }, { status: 500 });
        }

        // Check if Google Sheets is configured
        if (!process.env.GOOGLE_API_KEY && !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
            return NextResponse.json({
                success: false,
                error: "Google Sheets not configured",
                message: "Please set GOOGLE_API_KEY or Service Account credentials in .env.local",
            }, { status: 500 });
        }

        await connectDB();

        // Fetch URLs from Google Sheets
        const sheetUrls = await googleSheetsService.fetchMonitoringUrls();

        if (sheetUrls.length === 0) {
            return NextResponse.json({
                success: true,
                data: {
                    totalInSheet: 0,
                    added: 0,
                    deleted: 0,
                    skipped: 0,
                    message: "No URLs found in spreadsheet"
                }
            });
        }

        // Get existing nodes from database
        const existingNodes = await NodeModel.find({}).lean();
        
        // Helper to normalize URL for comparison
        const normalizeUrl = (url: string) => {
            try {
                // Remove trailing slash and lowercase
                return url.trim().replace(/\/$/, "").toLowerCase();
            } catch {
                return url.trim().toLowerCase();
            }
        };
        
        // Pre-compute normalized existing URLs for O(1) lookup
        const existingUrlSet = new Set(
            existingNodes.map((node) => normalizeUrl(node.url))
        );
        
        // Create Set of sheet URLs for comparison (normalized)
        const sheetUrlSet = new Set(sheetUrls.map((item) => normalizeUrl(item.url)));

        let addedCount = 0;
        let skippedCount = 0;
        let deletedCount = 0;
        const addedUrls: any[] = [];
        const deletedUrls: any[] = [];

        // STEP 1: Add new URLs from sheet
        for (const urlData of sheetUrls) {
            // Check if URL exists using pre-computed normalized Set (O(1) lookup)
            const normalizedUrl = normalizeUrl(urlData.url);
            
            if (existingUrlSet.has(normalizedUrl)) {
                // console.log(`URL already exists, skipping:`, urlData.url);
                skippedCount++;
                continue;
            }

            try {
                const newNode = await NodeModel.create({
                    name: urlData.name,
                    url: urlData.url,
                    group: urlData.group,
                    dependencies: [],
                    status: "FRESH",
                    latency: 0,
                    history: [],
                });

                addedCount++;
                addedUrls.push({
                    name: urlData.name,
                    url: urlData.url,
                    row: urlData.sheetRow
                });

                console.log(`✅ Added URL from sheet:`, urlData.url);
            } catch (error: any) {
                // Handle duplicate name or other errors
                if (error.code === 11000) {
                    console.warn(`⚠️ Duplicate name, skipping:`, urlData.name);
                    skippedCount++;
                } else {
                    console.error(`❌ Failed to add URL:`, urlData.url, error.message);
                }
            }
        }

        // STEP 2: Delete orphaned URLs (optional)
        if (deleteOrphaned) {
            for (const existingNode of existingNodes) {
                // Only delete if URL is not in sheet (normalized check)
                if (!sheetUrlSet.has(normalizeUrl(existingNode.url))) {
                    try {
                        await NodeModel.findByIdAndDelete(existingNode._id);
                        deletedCount++;
                        deletedUrls.push({
                            name: existingNode.name,
                            url: existingNode.url
                        });
                        console.log(`🗑️ Deleted URL not in sheet:`, existingNode.url);
                    } catch (error: any) {
                        console.error(`❌ Failed to delete URL:`, existingNode.url, error.message);
                    }
                }
            }
        }

        const summary = {
            totalInSheet: sheetUrls.length,
            totalInDatabase: existingNodes.length,
            added: addedCount,
            deleted: deletedCount,
            skipped: skippedCount,
            addedUrls: addedUrls,
            deletedUrls: deletedUrls,
            syncedCount: addedCount + deletedCount,
            timestamp: new Date().toISOString()
        };

        console.log('✅ Sync completed:', summary);

        return NextResponse.json({
            success: true,
            data: summary
        });

    } catch (error: any) {
        console.error('❌ Sync failed:', error);
        return NextResponse.json({
            success: false,
            error: "Sync failed",
            message: error.message,
        }, { status: 500 });
    }
}

/**
 * GET /api/google-sheets/sync
 * Get spreadsheet info for testing
 */
export async function GET() {
    try {
        const info = await googleSheetsService.getSpreadsheetInfo();
        return NextResponse.json({
            success: true,
            data: info
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: "Failed to get spreadsheet info",
            message: error.message,
        }, { status: 500 });
    }
}
