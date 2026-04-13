const Database = require("better-sqlite3");
const path = require("path");

// Use /tmp for Vercel (writable but temporary)
const dbPath = process.env.VERCEL
  ? "/tmp/data.db"
  : path.join(__dirname, "../../data.db");

// Create DB instance
const {db} = new Database(dbPath);

// Initialize tables
function initializeDatabase() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      price INTEGER,
      location TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  console.log("Database initialized at:", dbPath);
}

module.exports = {
  db, // ✅ THIS FIXES YOUR CRASH
  initializeDatabase
};
