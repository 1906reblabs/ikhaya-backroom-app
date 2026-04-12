const path = require("path");

const rootDir = path.resolve(__dirname, "..", "..");

module.exports = {
  port: Number(process.env.PORT || 3000),
  rootDir,
  dataDir: path.join(rootDir, "data"),
  uploadsDir: path.join(rootDir, "data", "uploads"),
  dbPath: path.join(rootDir, "data", "ikhaya.sqlite"),
  demoOtpCode: process.env.DEMO_OTP_CODE || "123456",
};
