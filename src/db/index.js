const fs = require("fs");
const path = require("path");

// Use /tmp for Vercel (writable, but temporary)
const dataDir = process.env.VERCEL
  ? "/tmp/data"
  : path.join(__dirname, "../../data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

module.exports = {
  initializeDatabase: async () => {
    console.log("Database initialized at:", dataDir);
  },
  dataDir
};
