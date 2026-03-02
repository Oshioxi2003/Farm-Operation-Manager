const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const logFile = path.join(__dirname, "fix-enum-log.txt");
function log(msg) {
  const line = new Date().toISOString() + " " + msg + "\n";
  fs.appendFileSync(logFile, line);
  process.stdout.write(line);
}

// Read .env file manually
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  log("Found .env file");
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx);
      const val = trimmed.substring(eqIdx + 1);
      process.env[key] = val;
    }
  });
} else {
  log("No .env file found at " + envPath);
}

const url = process.env.DATABASE_URL;
if (!url) {
  log("ERROR: DATABASE_URL not found");
  process.exit(1);
}

log("Connecting to DB...");
mysql.createConnection({ uri: url, connectTimeout: 10000 }).then(async (c) => {
  log("Connected!");
  await c.query("SET FOREIGN_KEY_CHECKS=0");
  log("FK checks disabled");
  await c.query("ALTER TABLE seasons MODIFY COLUMN current_stage ENUM('preparation','planting','caring','harvesting') DEFAULT 'preparation'");
  log("seasons.current_stage updated");
  await c.query("ALTER TABLE tasks MODIFY COLUMN stage ENUM('preparation','planting','caring','harvesting')");
  log("tasks.stage updated");
  await c.query("SET FOREIGN_KEY_CHECKS=1");
  log("FK checks re-enabled");
  log("ALL DONE!");
  await c.end();
  process.exit(0);
}).catch(e => {
  log("DB Error: " + e.message);
  process.exit(1);
});
