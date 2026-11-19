const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/db');

// "One account": a partner app sends the H-Pesa token a user got by logging in,
// and learns who the user is. No passwords are shared with the partner app.
const router = express.Router();
const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

// Returns { error } when the partner key is wrong, otherwise { user } (or {} for a bad token)
async function check(req) {
  const key = req.headers['x-api-key'];
  const client = key ? await prisma.serviceClient.findUnique({ where: { keyHash: sha256(key) } }) : null;
  if (!client || !client.active) return { error: true };
  const { token } = req.body || {};
  if (!token) return {};
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'hpesa-secret-key');
  } catch {
    return {};
  }
  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  return user ? { user } : {};
}

router.post('/verify', async (req, res) => {
  try {
    const r = await check(req);
    if (r.error) return res.status(401).json({ error: 'Invalid API key' });
    if (!r.user) return res.json({ valid: false });
    const u = r.user;
    res.json({ valid: true, user: { id: u.id, name: u.name, phone: u.phone, email: u.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Lets a partner app show the wallet balance of the signed-in user (never the PIN or password).
router.post('/balance', async (req, res) => {
  try {
    const r = await check(req);
    if (r.error) return res.status(401).json({ error: 'Invalid API key' });
    if (!r.user) return res.status(401).json({ error: 'Invalid token' });
    const wallet = await prisma.wallet.findUnique({ where: { userId: r.user.id } });
    res.json({ balance: wallet ? wallet.balance : 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
