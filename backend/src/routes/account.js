const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/db');
const auth = require('../middleware/auth');
const L = require('../lib/ledger');
const S = require('../lib/security');

// The signed-in user's own profile and security settings.
const router = express.Router();

const publicUser = (u) => ({ id: u.id, name: u.name, phone: u.phone, email: u.email, username: u.username || null, photo: u.photo || null, pinResetPending: !!u.pendingPin, createdAt: u.createdAt });

// Password attempts are limited like PIN attempts (5 wrong tries -> 15 minutes)
const pwFails = new Map();
function checkPwLock(userId) {
  const r = pwFails.get(userId);
  if (r && Date.now() - r.first >= 15 * 60 * 1000) pwFails.delete(userId);
  const live = pwFails.get(userId);
  if (live && live.count >= 5) throw new L.LedgerError('Too many wrong attempts. Try again in 15 minutes.', 429);
}
function notePwFail(userId) {
  const r = pwFails.get(userId) || { count: 0, first: Date.now() };
  r.count += 1;
  pwFails.set(userId, r);
}

router.get('/me', auth, L.wrap(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) throw new L.LedgerError('Account not found', 404);
  res.json(publicUser(user));
}));

router.patch('/profile', auth, L.wrap(async (req, res) => {
  const { name, email } = req.body || {};
  const data = {};
  if (name !== undefined) {
    const n = String(name).trim();
    if (n.length < 2 || n.length > 60) throw new L.LedgerError('Enter your full name');
    data.name = n;
  }
  if (email !== undefined) {
    const e = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new L.LedgerError('Enter a valid email address');
    const clash = await prisma.user.findFirst({ where: { email: e } });
    if (clash && clash.id !== req.userId) throw new L.LedgerError('That email is already used by another account', 409);
    data.email = e;
  }
  if (!Object.keys(data).length) throw new L.LedgerError('Nothing to update');
  const updated = await prisma.user.update({ where: { id: req.userId }, data });
  res.json(publicUser(updated));
}));

router.post('/change-pin', auth, L.wrap(async (req, res) => {
  const { currentPin, newPin } = req.body || {};
  if (!/^\d{4}$/.test(String(newPin || ''))) throw new L.LedgerError('New PIN must be exactly 4 digits');
  await L.verifyPin(req.userId, currentPin);
  await prisma.user.update({ where: { id: req.userId }, data: { pin: await bcrypt.hash(String(newPin), 10) } });
  res.json({ message: 'PIN changed' });
}));

router.post('/change-password', auth, L.wrap(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 6) throw new L.LedgerError('New password must be at least 6 characters');
  checkPwLock(req.userId);
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  const ok = !!(user && currentPassword && (await bcrypt.compare(String(currentPassword), user.password)));
  if (!ok) { notePwFail(req.userId); throw new L.LedgerError('Current password is incorrect'); }
  pwFails.delete(req.userId);
  await prisma.user.update({ where: { id: req.userId }, data: { password: await bcrypt.hash(String(newPassword), 10) } });
  res.json({ message: 'Password changed' });
}));

// Used by the lock screen: is this the right PIN? (same lockout as payments)
router.post('/verify-pin', auth, S.rateLimit({ windowMs: 60 * 1000, max: 15, key: (req) => req.userId }), L.wrap(async (req, res) => {
  await L.verifyPin(req.userId, req.body?.pin);
  res.json({ ok: true });
}));

// Profile picture: a small image (the app shrinks it first). null removes it.
router.patch('/photo', auth, L.wrap(async (req, res) => {
  const { photo } = req.body || {};
  if (photo !== null && !(typeof photo === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(photo) && photo.length <= 100000)) {
    throw new L.LedgerError('Choose a smaller picture (PNG or JPG)');
  }
  const updated = await prisma.user.update({ where: { id: req.userId }, data: { photo } });
  res.json(publicUser(updated));
}));

// Who owns this username? (shown before you send money to @username)
router.get('/lookup/:username', auth, L.wrap(async (req, res) => {
  const u = await prisma.user.findUnique({ where: { username: String(req.params.username || '').replace(/^@/, '').toLowerCase() } });
  if (!u) throw new L.LedgerError('No user with that username', 404);
  res.json({ name: u.name, username: u.username, photo: u.photo || null });
}));

module.exports = router;
