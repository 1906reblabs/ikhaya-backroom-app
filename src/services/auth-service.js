const crypto = require("crypto");
const dayjs = require("dayjs");
const { z } = require("zod");

const { demoOtpCode } = require("../config/env");
const { db } = require("../db");

const requestOtpSchema = z.object({
  phoneNumber: z.string().min(8).max(20),
  role: z.enum(["landlord", "tenant"]),
  name: z.string().min(2).max(80),
});

const verifyOtpSchema = requestOtpSchema.extend({
  code: z.string().length(6),
});

function requestOtp(payload) {
  const data = requestOtpSchema.parse(payload);
  db.prepare("DELETE FROM otp_requests WHERE phone_number = ?").run(data.phoneNumber);
  db.prepare("INSERT INTO otp_requests (phone_number, code, expires_at) VALUES (?, ?, ?)").run(
    data.phoneNumber,
    demoOtpCode,
    dayjs().add(10, "minute").toISOString(),
  );

  return {
    success: true,
    demoCode: demoOtpCode,
    message: "OTP generated for local development.",
  };
}

function verifyOtp(payload) {
  const data = verifyOtpSchema.parse(payload);
  const otp = db.prepare(`
    SELECT *
    FROM otp_requests
    WHERE phone_number = ?
    ORDER BY id DESC
    LIMIT 1
  `).get(data.phoneNumber);

  if (!otp || otp.code !== data.code || dayjs(otp.expires_at).isBefore(dayjs())) {
    const error = new Error("Invalid or expired OTP.");
    error.statusCode = 400;
    throw error;
  }

  const existingUser = db.prepare("SELECT * FROM users WHERE phone_number = ?").get(data.phoneNumber);
  let userId = existingUser?.id;

  if (existingUser) {
    db.prepare("UPDATE users SET name = ?, role = ? WHERE id = ?").run(data.name, data.role, userId);
  } else {
    const result = db.prepare(`
      INSERT INTO users (role, name, phone_number, preferred_language, verification_status)
      VALUES (?, ?, ?, 'en', ?)
    `).run(data.role, data.name, data.phoneNumber, data.role === "tenant" ? "verified" : "pending");
    userId = result.lastInsertRowid;
  }

  db.prepare("DELETE FROM otp_requests WHERE phone_number = ?").run(data.phoneNumber);

  const token = crypto.randomBytes(24).toString("hex");
  db.prepare("INSERT INTO sessions (user_id, token) VALUES (?, ?)").run(userId, token);
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);

  return { token, user };
}

module.exports = { requestOtp, verifyOtp };
