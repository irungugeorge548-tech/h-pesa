// Small, dependency-free protections shared by the routes.
const prisma = require('./db');

// --- Rate limiting (per IP, in memory; fine for one server) ---
const buckets = new Map();
function rateLimit({ windowMs, max, key, message }) {
  return (req, res, next) => {
    if (process.env.DISABLE_RATE_LIMIT === '1') return next();
    const k = `${req.baseUrl}${req.path}|${key ? key(req) : req.ip}`;
    const now = Date.now();
    let b = buckets.get(k);
    if (!b || now - b.start >= windowMs) { b = { start: now, count: 0 }; buckets.set(k, b); }
    b.count += 1;
    if (b.count > max) {
      res.set('Retry-After', String(Math.ceil((b.start + windowMs - now) / 1000)));
      return res.status(429).json({ error: message || 'Too many attempts. Please wait a few minutes and try again.' });
    }
    next();
  };
}
setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (now - b.start > 3600000) buckets.delete(k); }, 600000).unref();

// --- Failed-login lockout per phone/username (5 wrong tries -> 15 minutes) ---
const fails = new Map();
const LOCK = 15 * 60 * 1000;
const loginLocked = (id) => { const r = fails.get(id); if (r && Date.now() - r.first >= LOCK) fails.delete(id); const l = fails.get(id); return !!(l && l.count >= 5); };
const loginFailed = (id) => { const r = fails.get(id) || { count: 0, first: Date.now() }; r.count += 1; fails.set(id, r); };
const loginOk = (id) => fails.delete(id);
const resetLoginLocks = () => fails.clear();

// --- Headers ---
function securityHeaders(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Strict-Transport-Security': 'max-age=15552000; includeSubDomains',
    'Cache-Control': 'no-store',
    'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
  });
  res.removeHeader('X-Powered-By');
  next();
}

// --- Audit trail (best effort: never blocks a request) ---
function audit(action, req, userId, detail) {
  try { prisma.auditLog.create({ data: { action, userId: userId || null, ip: String(req.ip || '').slice(0, 60), detail: detail ? String(detail).slice(0, 190) : null } }).catch(() => {}); } catch { /* ignore */ }
}

module.exports = { rateLimit, loginLocked, loginFailed, loginOk, resetLoginLocks, securityHeaders, audit };
