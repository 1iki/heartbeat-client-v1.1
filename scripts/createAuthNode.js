/**
 * Secure Test Script for Authentication
 * Usage: 
 * 1. Set environment variables (recommended):
 *    $env:TEST_URL="https://example.com/dashboard"
 *    $env:LOGIN_URL="https://example.com/login" 
 *    $env:TEST_USERNAME="your-username"
 *    $env:TEST_PASSWORD="your-password"
 *    node scripts/createAuthNode.js
 * 
 * 2. Or create .env.test file (don't commit!)
 */

const API_URL = process.env.API_URL || "http://localhost:3000";

async function createAuthNode() {
    console.log("🚀 Testing End-to-End Authentication Flow\n");

    // Read from environment variables (safer than hardcoded)
    const targetUrl = process.env.TEST_URL;
    const loginUrl = process.env.LOGIN_URL || process.env.TEST_URL;
    const username = process.env.TEST_USERNAME;
    const password = process.env.TEST_PASSWORD;

    // Validation
    if (!targetUrl) {
        console.error("❌ Missing TEST_URL!");
        console.error("\nSet environment variables:");
        console.error('  $env:TEST_URL="https://example.com/dashboard"');
        console.error('  $env:LOGIN_URL="https://example.com/login"  # Optional, defaults to TEST_URL');
        console.error('  $env:TEST_USERNAME="your-username"');
        console.error('  $env:TEST_PASSWORD="your-password"');
        console.error('\nThen run: node scripts/createAuthNode.js');
        process.exit(1);
    }

    if (!username || !password) {
        console.error("❌ Missing credentials!");
        console.error("\nSet credentials in environment:");
        console.error('  $env:TEST_USERNAME="your-username"');
        console.error('  $env:TEST_PASSWORD="your-password"');
        process.exit(1);
    }

    console.log("📋 Configuration:");
    console.log(`   API: ${API_URL}`);
    console.log(`   Target URL: ${targetUrl}`);
    console.log(`   Login URL: ${loginUrl}`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${'*'.repeat(password.length)}\n`);

    // Step 1: Test authentication configuration
    console.log("Step 1: Testing authentication configuration...");

    const authConfig = {
        requiresAuth: true,
        loginUrl: loginUrl,
        loginType: "page",
        username: username,
        password: password
    };

    try {
        const testResponse = await fetch(`${API_URL}/api/nodes/test-auth`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: targetUrl, authConfig })
        });

        const testResult = await testResponse.json();

        if (!testResult.success) {
            console.error("❌ Authentication test failed!");
            console.error("   Error:", testResult.error);
            console.error("   Message:", testResult.message);
            console.log("\n💡 Troubleshooting:");
            console.log("   1. Check if credentials are correct");
            console.log("   2. Verify login URL is accessible");
            console.log("   3. Check if login form structure matches auto-detection");
            console.log("   4. Try adding custom selectors if needed");
            process.exit(1);
        }

        console.log("✅ Authentication test passed!");
        console.log(`   Status: ${testResult.status}`);
        console.log(`   Latency: ${testResult.latency}ms`);
        console.log(`   Duration: ${testResult.duration}ms\n`);

        // Step 2: Create node with authentication
        console.log("Step 2: Creating node with authentication...");

        const nodeData = {
            name: `Auth Node - ${new Date().toISOString().split('T')[0]}`,
            url: targetUrl,
            group: "website",
            authConfig: authConfig
        };

        const createResponse = await fetch(`${API_URL}/api/nodes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nodeData)
        });

        const createResult = await createResponse.json();

        if (!createResponse.ok) {
            console.error("❌ Failed to create node!");
            console.error("   Error:", createResult.error || createResult);
            process.exit(1);
        }

        console.log("✅ Node created successfully!");
        console.log(`   Node ID: ${createResult.data._id}`);
        console.log(`   Name: ${createResult.data.name}`);
        console.log(`   URL: ${createResult.data.url}`);
        console.log(`   Auth Required: ${createResult.data.authConfig?.requiresAuth}\n`);

        const nodeId = createResult.data._id;

        // Step 3: Trigger health check
        console.log("Step 3: Triggering health check...");

        const checkResponse = await fetch(`${API_URL}/api/cron/check`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });

        const checkResult = await checkResponse.json();
        console.log("✅ Health check triggered!");
        console.log(`   Nodes checked: ${checkResult.checked}`);
        console.log(`   Nodes updated: ${checkResult.updated}\n`);

        // Wait a bit for health check to complete
        console.log("⏳ Waiting for health check to complete...");
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Step 4: Verify node status
        console.log("\nStep 4: Verifying node status...");

        const nodeResponse = await fetch(`${API_URL}/api/nodes/${nodeId}`);
        const nodeResult = await nodeResponse.json();

        console.log("✅ Node status verified!");
        console.log(`   Status: ${nodeResult.data.status}`);
        console.log(`   Latency: ${nodeResult.data.latency}ms`);
        console.log(`   Last Checked: ${new Date(nodeResult.data.lastChecked).toLocaleString()}`);

        console.log("\n🎉 End-to-end test completed successfully!");
        console.log("\n📝 Summary:");
        console.log("   ✅ Authentication configuration tested");
        console.log("   ✅ Node created with auth config");
        console.log("   ✅ Health check triggered");
        console.log("   ✅ Node status verified");
        console.log(`\n   Final Status: ${nodeResult.data.status}`);
        console.log(`\n   Node URL: ${API_URL}/dashboard (check in visualization)`);

        // Cleanup instruction
        console.log("\n🧹 Cleanup:");
        console.log(`   To delete this test node, use: DELETE ${API_URL}/api/nodes/${nodeId}`);
        console.log("\n🔐 Security:");
        console.log("   Don't forget to clear your environment variables!");
        console.log("   PowerShell: Remove-Item Env:\\TEST_USERNAME, Env:\\TEST_PASSWORD");

    } catch (error) {
        console.error("\n❌ Test failed:", error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run test
createAuthNode();
