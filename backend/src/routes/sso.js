const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/db');

// "One account": a partner app sends the H-Pesa token a user got by logging in,
// and learns who the user is. No passwords are shared with the partner app.
const router = express.Router();
const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

router.post('/verify', async (req, res) => {
  try {
    const key = req.headers['x-api-key'];
    const client = key ? await prisma.serviceClient.findUnique({ where: { keyHash: sha256(key) } }) : null;
    if (!client || !client.active) return res.status(401).json({ error: 'Invalid API key' });

    const { token } = req.body || {};
    if (!token) return res.json({ valid: false });
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'hpesa-secret-key');
    } catch {
      return res.json({ valid: false });
    }
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.json({ valid: false });
    res.json({ valid: true, user: { id: user.id, name: user.name, phone: user.phone, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
