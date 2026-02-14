/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

function parseEnvFile(envPath) {
    const content = fs.readFileSync(envPath, "utf8");
    const lines = content.split(/\r?\n/);
    const env = {};

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        env[key] = value;
    }

    return env;
}

function jsonReplacer(key, value) {
    if (value && typeof value === "object") {
        if (value._bsontype === "ObjectId") {
            return value.toString();
        }
        if (value instanceof Date) {
            return value.toISOString();
        }
    }
    return value;
}

function formatDate(dt) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}-${pad(dt.getHours())}${pad(dt.getMinutes())}${pad(dt.getSeconds())}`;
}

async function main() {
    const root = path.join(__dirname, "..");
    const envPath = path.join(root, ".env.local");

    if (!fs.existsSync(envPath)) {
        throw new Error(".env.local not found. Please create it from .env.local.example");
    }

    const env = parseEnvFile(envPath);
    const uri = env.MONGODB_URI || process.env.MONGODB_URI;

    if (!uri) {
        throw new Error("MONGODB_URI is missing. Please set it in .env.local");
    }

    const backupDir = path.join(root, "backup");
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = formatDate(new Date());
    const backupFile = path.join(backupDir, `nodes-seed-${timestamp}.json`);
    const analysisFile = path.join(backupDir, `nodes-analysis-${timestamp}.json`);

    await mongoose.connect(uri, { bufferCommands: false });

    const collection = mongoose.connection.collection("nodes");
    const nodes = await collection.find({}).toArray();

    fs.writeFileSync(backupFile, JSON.stringify(nodes, jsonReplacer, 2), "utf8");

    const statusCounts = nodes.reduce((acc, node) => {
        const status = node.status || "UNKNOWN";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});

    const latencies = nodes
        .map((n) => typeof n.latency === "number" ? n.latency : null)
        .filter((n) => n !== null);

    const avgLatency = latencies.length
        ? Math.round((latencies.reduce((a, b) => a + b, 0) / latencies.length) * 100) / 100
        : null;

    const sortedByLatency = nodes
        .filter((n) => typeof n.latency === "number")
        .sort((a, b) => b.latency - a.latency)
        .slice(0, 5)
        .map((n) => ({
            name: n.name,
            url: n.url,
            latency: n.latency,
            status: n.status
        }));

    const lastCheckedTimes = nodes
        .map((n) => n.lastChecked ? new Date(n.lastChecked).getTime() : null)
        .filter((t) => t !== null);

    const analysis = {
        totalNodes: nodes.length,
        statusCounts,
        avgLatency,
        minLatency: latencies.length ? Math.min(...latencies) : null,
        maxLatency: latencies.length ? Math.max(...latencies) : null,
        lastChecked: {
            oldest: lastCheckedTimes.length ? new Date(Math.min(...lastCheckedTimes)).toISOString() : null,
            newest: lastCheckedTimes.length ? new Date(Math.max(...lastCheckedTimes)).toISOString() : null
        },
        missingUrlCount: nodes.filter((n) => !n.url).length,
        top5Slowest: sortedByLatency
    };

    fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2), "utf8");

    console.log("Backup and analysis completed.");
    console.log(`Backup file: ${path.relative(root, backupFile)}`);
    console.log(`Analysis file: ${path.relative(root, analysisFile)}`);

    await mongoose.disconnect();
}

main().catch((err) => {
    console.error("Backup failed:", err.message);
    process.exit(1);
});
