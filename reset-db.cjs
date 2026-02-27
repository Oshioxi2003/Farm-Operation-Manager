const mysql = require('mysql2/promise');

async function resetDatabase() {
    console.log('Connecting to MySQL...');
    const conn = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '123456',
        database: 'farm'
    });

    console.log('Connected! Truncating tables...');
    await conn.execute('SET FOREIGN_KEY_CHECKS = 0');

    const [tables] = await conn.query('SHOW TABLES');
    for (const row of tables) {
        const tableName = Object.values(row)[0];
        await conn.execute('TRUNCATE TABLE `' + tableName + '`');
        console.log('Truncated:', tableName);
    }

    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('All tables cleared! Run "npm run dev" to re-seed.');

    await conn.end();
    process.exit(0);
}

resetDatabase().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
