const path = require("path");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const { uploadsDir } = require("./config/env");
const { initializeDatabase } = require("./db");
const apiRoutes = require("./routes/api");

const app = express();

app.set("trust proxy", 1);

// middleware
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// rate limiting
if (!process.env.VERCEL) {
  app.use("/api", rateLimit({
    windowMs: 60 * 1000,
    max: 120,
  }));
}

// static uploads
app.use("/uploads", express.static(uploadsDir, { maxAge: "7d" }));

// API routes
app.use("/api", apiRoutes);

// static frontend
const publicPath = path.join(process.cwd(), "public");
app.use(express.static(publicPath, { extensions: ["html"] }));

// ✅ FIXED catch-all route
app.use((req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// error handler
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.statusCode || 500).json({
    error: error.message || "Something went wrong."
  });
});

// ✅ IMPORTANT: initialize DB safely
initializeDatabase().catch((err) => {
  console.error("Database init failed:", err);
});

// export for Vercel
module.exports = app;
