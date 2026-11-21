const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/db');
const L = require('../lib/ledger');
const S = require('../lib/security');
const { makeUsername } = require('../lib/username');

const router = express.Router();
const secret = () => process.env.JWT_SECRET || 'hpesa-secret-key';
const sign = (user) => jwt.sign({ userId: user.id }, secret(), { expiresIn: '7d' });
const shape = (u) => ({ id: u.id, name: u.name, phone: u.phone, email: u.email, username: u.username || null, photo: u.photo || null });
const MAX_WALLETS_PER_DEVICE = 3;
const SIGNUP_BONUS = () => { const n = Number(process.env.SIGNUP_BONUS); return Number.isFinite(n) && n >= 0 ? n : 10000; };
const PIN_RESET_HOURS = () => { const n = Number(process.env.PIN_RESET_HOURS); return Number.isFinite(n) && n >= 0 ? n : 24; };

const perIp = (windowMs, max, message) => S.rateLimit({ windowMs, max, message });

router.post('/register', perIp(10 * 60 * 1000, 8, 'Too many sign-ups from this connection. Please wait a few minutes.'), async (req, res) => {
  try {
    const { name, password, pin } = req.body || {};
    const email = String(req.body?.email || '').trim().toLowerCase(); // same address in different capitals is the same account
    const phone = L.normalizePhone(req.body?.phone);
    const deviceId = String(req.body?.deviceId || '').slice(0, 64) || null;
    if (!name || !phone || !email || !password || !pin) return res.status(400).json({ error: 'All fields required' });
    if (process.env.REQUIRE_TERMS !== '0' && req.body?.acceptTerms !== true) return res.status(400).json({ error: 'Please accept the Terms of Use and Privacy Policy to continue' });
    if (!/^(07|01)\d{8}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid Kenyan phone number' });
    if (!/^\d{4}$/.test(String(pin))) return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
    if (String(name).trim().length < 2 || String(name).length > 60) return res.status(400).json({ error: 'Enter your full name' });

    if (deviceId && (await prisma.user.count({ where: { deviceId } })) >= MAX_WALLETS_PER_DEVICE) {
      return res.status(403).json({ error: `This phone already has ${MAX_WALLETS_PER_DEVICE} H-Pesa wallets, which is the maximum.` });
    }
    const existing = await prisma.user.findFirst({ where: { OR: [{ phone }, { email }] } });
    if (existing) return res.status(400).json({ error: 'Phone or email already exists. Each wallet needs its own phone number and email.' });

    const user = await prisma.user.create({
      data: {
        name: String(name).trim(), phone, email,
        password: await bcrypt.hash(String(password), 10),
        pin: await bcrypt.hash(String(pin), 10),
        username: await makeUsername(prisma, name),
        deviceId, termsAcceptedAt: new Date(),
        wallet: { create: { balance: SIGNUP_BONUS() } },
      },
      include: { wallet: true },
    });
    S.audit('REGISTER', req, user.id);
    res.json({ token: sign(user), user: shape(user), balance: user.wallet.balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', perIp(60 * 1000, 20, 'Too many login attempts. Please wait a minute.'), async (req, res) => {
  try {
    const raw = String(req.body?.phone || '').trim();
    const password = String(req.body?.password || '');
    const key = raw.toLowerCase();
    if (S.loginLocked(key)) return res.status(429).json({ error: 'Too many wrong attempts. Try again in 15 minutes.' });
    // sign in with the phone number, or with the permanent @username
    const user = /^@?[a-z][a-z0-9]{2,}$/i.test(raw)
      ? await prisma.user.findUnique({ where: { username: raw.replace(/^@/, '').toLowerCase() }, include: { wallet: true } })
      : await prisma.user.findUnique({ where: { phone: L.normalizePhone(raw) }, include: { wallet: true } });
    const valid = !!(user && password && (await bcrypt.compare(password, user.password)));
    if (!valid) { S.loginFailed(key); S.audit('LOGIN_FAIL', req, user?.id); return res.status(400).json({ error: 'Invalid credentials' }); }
    S.loginOk(key); S.audit('LOGIN', req, user.id);
    res.json({ token: sign(user), user: shape(user), balance: user.wallet?.balance ?? 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Forgot password: prove it is you with the phone, the email on the account and your PIN.
router.post('/forgot-password', perIp(15 * 60 * 1000, 6), async (req, res) => {
  try {
    const phone = L.normalizePhone(req.body?.phone);
    const email = String(req.body?.email || '').trim().toLowerCase();
    const { pin, newPassword } = req.body || {};
    if (String(newPassword || '').length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
    const user = await prisma.user.findUnique({ where: { phone } });
    const fail = () => res.status(400).json({ error: 'Those details do not match this account' });
    if (!user || user.email !== email) return fail();
    try { await L.verifyPin(user.id, pin); } catch (e) { return e.status === 429 ? res.status(429).json({ error: e.message }) : fail(); }
    await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(String(newPassword), 10) } });
    S.resetLoginLocks(); S.audit('PASSWORD_RESET', req, user.id);
    res.json({ message: 'Password changed. You can log in now.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Forgot PIN: like a SIM-swap safe reset. The new PIN only starts working after a waiting period,
// and the request is cancelled if the real owner uses the old PIN in the meantime.
router.post('/forgot-pin', perIp(15 * 60 * 1000, 6), async (req, res) => {
  try {
    const phone = L.normalizePhone(req.body?.phone);
    const email = String(req.body?.email || '').trim().toLowerCase();
    const { password, newPin } = req.body || {};
    if (!/^\d{4}$/.test(String(newPin || ''))) return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    const user = await prisma.user.findUnique({ where: { phone } });
    const ok = !!(user && user.email === email && password && (await bcrypt.compare(String(password), user.password)));
    if (!ok) return res.status(400).json({ error: 'Those details do not match this account' });
    const hours = PIN_RESET_HOURS();
    await prisma.user.update({ where: { id: user.id }, data: { pendingPin: await bcrypt.hash(String(newPin), 10), pendingPinAt: new Date(Date.now() + hours * 3600 * 1000) } });
    S.audit('PIN_RESET_REQUEST', req, user.id);
    res.json({ message: hours > 0 ? `Your new PIN will start working in ${hours} hours. If this was not you, just keep using your old PIN and the request is cancelled.` : 'Your new PIN is ready to use.', hours });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
