// Test script untuk authentication
// File ini bisa dijalankan manual atau melalui API test

import { performPlaywrightHealthCheck } from "../lib/monitoring/playwrightHealthCheck";
import { AuthConfig } from "../types";

async function testAuth() {
    console.log("🧪 Starting authentication test...\n");

    // Example: Test dengan URL yang memerlukan login
    // Ganti dengan URL dan credentials yang sebenarnya
    const testConfig: AuthConfig = {
        type: "BROWSER_LOGIN",
        loginUrl: "https://example.com/login", // Ganti dengan login URL sebenarnya
        loginType: "page",
        username: "test@example.com", // Ganti dengan username sebenarnya
        password: "password123", // Ganti dengan password sebenarnya
        // Optional: custom selectors jika diperlukan
        // usernameSelector: "#email",
        // passwordSelector: "#password",
        // submitSelector: "button[type='submit']"
    };

    const targetUrl = "https://example.com/dashboard"; // Ganti dengan URL yang akan dimonitor

    try {
        console.log(`📍 Target URL: ${targetUrl}`);
        console.log(`🔐 Login URL: ${testConfig.loginUrl}`);
        console.log(`👤 Username: ${testConfig.username}`);
        console.log(`🔑 Password: ${testConfig.password?.replace(/./g, '*')}\n`);

        const result = await performPlaywrightHealthCheck(targetUrl, testConfig, 30000);

        console.log("\n✅ Test Result:");
        console.log(`   Status: ${result.status}`);
        console.log(`   Latency: ${result.latency}ms`);
        if (result.error) {
            console.log(`   Error: ${result.error}`);
        }

        if (result.status === "DOWN") {
            console.log("\n❌ Health check failed!");
            process.exit(1);
        } else {
            console.log("\n✅ Health check successful!");
            process.exit(0);
        }

    } catch (error: any) {
        console.error("\n❌ Test failed:", error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run test
testAuth();
