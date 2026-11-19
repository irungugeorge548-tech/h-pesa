const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/db');
const auth = require('../middleware/auth');
const L = require('../lib/ledger');

// The signed-in user's own profile and security settings.
const router = express.Router();

const publicUser = (u) => ({ id: u.id, name: u.name, phone: u.phone, email: u.email, createdAt: u.createdAt });

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

module.exports = router;
