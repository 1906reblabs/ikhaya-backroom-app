const path = require("path");

const rootDir = path.resolve(__dirname, "..", "..");
const configuredDataDir =
  process.env.DATA_DIR ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  path.join(rootDir, "data");

module.exports = {
  host: process.env.HOST || "0.0.0.0",
  port: Number(process.env.PORT || 3000),
  rootDir,
  dataDir: configuredDataDir,
  uploadsDir: path.join(configuredDataDir, "uploads"),
  dbPath: path.join(configuredDataDir, "ikhaya.sqlite"),
  demoOtpCode: process.env.DEMO_OTP_CODE || "123456",
};
