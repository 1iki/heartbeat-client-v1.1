/**
 * Bulk Import Nodes from JSON Configuration
 * Usage: node scripts/importNodes.js
 * 
 * Reads nodes from config/nodes.json and imports them to database
 */

const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_URL || "http://localhost:3000";
const CONFIG_FILE = process.env.CONFIG_FILE || path.join(__dirname, '../config/nodes.json');

async function importNodes() {
    console.log("📥 Importing Nodes from JSON Configuration\n");

    // Check if config file exists
    if (!fs.existsSync(CONFIG_FILE)) {
        console.error(`❌ Configuration file not found: ${CONFIG_FILE}`);
        console.error("\n💡 Instructions:");
        console.error("1. Copy template: cp config/nodes.json.template config/nodes.json");
        console.error("2. Edit config/nodes.json with your actual URLs and credentials");
        console.error("3. Run this script again\n");
        process.exit(1);
    }

    try {
        // Read and parse JSON configuration
        const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
        const nodes = JSON.parse(configData);

        console.log(`📄 Found ${nodes.length} nodes in configuration file\n`);

        let successCount = 0;
        let failCount = 0;
        const results = [];

        // Import each node
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            console.log(`\n[${i + 1}/${nodes.length}] Processing: ${node.name}`);
            console.log(`   URL: ${node.url}`);
            console.log(`   Auth Required: ${node.authConfig?.requiresAuth ? 'Yes' : 'No'}`);

            try {
                // Test authentication if required
                if (node.authConfig?.requiresAuth) {
                    console.log(`   🔐 Testing authentication...`);

                    const testResponse = await fetch(`${API_URL}/api/nodes/test-auth`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            url: node.url,
                            authConfig: node.authConfig
                        })
                    });

                    const testResult = await testResponse.json();

                    if (!testResult.success) {
                        console.error(`   ❌ Auth test failed: ${testResult.error}`);
                        failCount++;
                        results.push({
                            name: node.name,
                            status: 'failed',
                            reason: `Auth test failed: ${testResult.error}`
                        });
                        continue;
                    }

                    console.log(`   ✅ Auth test passed`);
                }

                // Create node
                const createResponse = await fetch(`${API_URL}/api/nodes`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(node)
                });

                const createResult = await createResponse.json();

                if (!createResponse.ok) {
                    throw new Error(createResult.error || 'Failed to create node');
                }

                console.log(`   ✅ Node created successfully (ID: ${createResult.data._id})`);
                successCount++;
                results.push({
                    name: node.name,
                    status: 'success',
                    id: createResult.data._id
                });

            } catch (error) {
                console.error(`   ❌ Failed: ${error.message}`);
                failCount++;
                results.push({
                    name: node.name,
                    status: 'failed',
                    reason: error.message
                });
            }
        }

        // Summary
        console.log("\n" + "=".repeat(50));
        console.log("📊 Import Summary");
        console.log("=".repeat(50));
        console.log(`Total nodes: ${nodes.length}`);
        console.log(`✅ Successful: ${successCount}`);
        console.log(`❌ Failed: ${failCount}`);

        // Detailed results
        console.log("\n📋 Detailed Results:");
        results.forEach((result, index) => {
            const icon = result.status === 'success' ? '✅' : '❌';
            console.log(`${icon} ${result.name}`);
            if (result.status === 'failed') {
                console.log(`   Reason: ${result.reason}`);
            } else {
                console.log(`   ID: ${result.id}`);
            }
        });

        // Trigger health check for all imported nodes
        if (successCount > 0) {
            console.log("\n🔄 Triggering initial health check...");
            const checkResponse = await fetch(`${API_URL}/api/cron/check`, {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });

            const checkResult = await checkResponse.json();
            console.log(`✅ Health check completed (${checkResult.checked} nodes checked)`);
        }

        console.log("\n✨ Import process completed!");

        if (failCount > 0) {
            console.log("\n⚠️  Some nodes failed to import. Please check the errors above.");
            process.exit(1);
        }

    } catch (error) {
        console.error("\n❌ Import failed:", error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run import
importNodes();
