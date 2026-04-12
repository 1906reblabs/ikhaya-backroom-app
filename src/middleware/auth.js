const { db } = require("../db");

function getSessionUser(token) {
  if (!token) {
    return null;
  }

  return db.prepare(`
    SELECT users.*
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = ?
  `).get(token) || null;
}

function authOptional(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  req.user = getSessionUser(token);
  next();
}

function authRequired(req, res, next) {
  authOptional(req, res, () => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    next();
  });
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    if (req.user.role !== role) {
      res.status(403).json({ error: `Only ${role}s can access this action.` });
      return;
    }
    next();
  };
}

module.exports = { authOptional, authRequired, requireRole };
