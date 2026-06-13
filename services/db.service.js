const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

let db;

/**
 * Initializes the database connection and ensures tables exist.
 * Note: On Vercel (Serverless), this file will be wiped on cold starts.
 * For production serverless deployments, swap this file with a Vercel Postgres or MongoDB driver.
 */
async function initDB() {
    console.log("Initializing database service...");
    const dbPath = process.env.VERCEL ? '/tmp/database.sqlite' : path.join(__dirname, '..', 'database.sqlite');
    db = await open({
        // Point to a writable directory on Vercel (/tmp) or the root directory locally
        filename: dbPath,
        driver: sqlite3.Database
    });
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            progress TEXT DEFAULT '{}'
        )
    `);
}

async function findUserByUsername(username) {
    if (!db) await initDB();
    return db.get('SELECT * FROM users WHERE username = ?', [username]);
}

async function findUserById(id) {
    if (!db) await initDB();
    return db.get('SELECT * FROM users WHERE id = ?', [id]);
}

async function createUser(username, hashedPassword) {
    if (!db) await initDB();
    const result = await db.run(
        'INSERT INTO users (username, password, progress) VALUES (?, ?, ?)',
        [username, hashedPassword, '{}']
    );
    return result.lastID;
}

async function updateProgress(id, progressString) {
    if (!db) await initDB();
    const result = await db.run('UPDATE users SET progress = ? WHERE id = ?', [progressString, id]);
    return result.changes > 0;
}

async function closeDB() {
    if (db) {
        await db.close();
    }
}

module.exports = {
    initDB,
    findUserByUsername,
    findUserById,
    createUser,
    updateProgress,
    closeDB
};
