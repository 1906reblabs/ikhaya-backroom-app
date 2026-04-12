const fs = require("fs");
const Database = require("better-sqlite3");

const { dataDir, uploadsDir, dbPath } = require("../config/env");
const { schemaSql } = require("./schema");
const { seedDatabase } = require("./seed");

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");
db.exec(schemaSql);

let initialized = false;

async function initializeDatabase() {
  if (!initialized) {
    await seedDatabase(db);
    initialized = true;
  }
  return db;
}

module.exports = { db, initializeDatabase };
