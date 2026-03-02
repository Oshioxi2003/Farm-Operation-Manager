import mysql from "mysql2/promise";

async function main() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error("ERROR: DATABASE_URL not set in environment");
        process.exit(1);
    }
    console.log("Connecting to database...");
    const c = await mysql.createConnection(url);
    console.log("Connected. Updating enums...");
    await c.query("SET FOREIGN_KEY_CHECKS=0");
    await c.query("ALTER TABLE seasons MODIFY COLUMN current_stage ENUM('preparation','planting','caring','harvesting') DEFAULT 'preparation'");
    await c.query("ALTER TABLE tasks MODIFY COLUMN stage ENUM('preparation','planting','caring','harvesting')");
    await c.query("SET FOREIGN_KEY_CHECKS=1");
    console.log("Done! Enum updated successfully.");
    await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
