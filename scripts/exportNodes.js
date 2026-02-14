/**
 * Export all nodes to JSON configuration file
 * Usage: node scripts/exportNodes.js
 * 
 * Exports all nodes from database to config/nodes-export.json
 * ⚠️  Passwords will be exported in plain text! Use with caution!
 */

const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_URL || "http://localhost:3000";
const OUTPUT_FILE = process.env.OUTPUT_FILE || path.join(__dirname, '../config/nodes-export.json');

async function exportNodes() {
    console.log("📤 Exporting Nodes to JSON Configuration\n");

    try {
        // Fetch all nodes
        const response = await fetch(`${API_URL}/api/nodes`);
        const data = await response.json();

        if (!data.success) {
            throw new Error('Failed to fetch nodes');
        }

        const nodes = data.data;
        console.log(`📄 Found ${nodes.length} nodes in database\n`);

        // Transform to export format
        const exportData = nodes.map(node => ({
            name: node.name,
            url: node.url,
            group: node.group,
            authConfig: node.authConfig || { requiresAuth: false }
        }));

        // Write to file
        fs.writeFileSync(
            OUTPUT_FILE,
            JSON.stringify(exportData, null, 4),
            'utf8'
        );

        console.log(`✅ Export successful!`);
        console.log(`   File: ${OUTPUT_FILE}`);
        console.log(`   Nodes exported: ${exportData.length}`);

        // Count nodes with auth
        const authNodeCount = exportData.filter(n => n.authConfig?.requiresAuth).length;
        console.log(`   Nodes with auth: ${authNodeCount}`);

        if (authNodeCount > 0) {
            console.log("\n⚠️  WARNING:");
            console.log("   This file contains plain text passwords!");
            console.log("   Keep this file secure and do not commit to git!");
            console.log("   Add to .gitignore: config/nodes-export.json");
        }

        console.log("\n💡 To import this configuration to another instance:");
        console.log(`   1. Copy ${path.basename(OUTPUT_FILE)} to the target instance`);
        console.log("   2. Rename to nodes.json");
        console.log("   3. Run: node scripts/importNodes.js");

    } catch (error) {
        console.error("\n❌ Export failed:", error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run export
exportNodes();
