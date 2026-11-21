const express = require('express');
const prisma = require('../lib/db');
const auth = require('../middleware/auth');
const S = require('../lib/security');
const router = express.Router();

// Messages to the Haraka support team
router.post('/', auth, S.rateLimit({ windowMs: 10 * 60 * 1000, max: 10, key: (req) => req.userId }), async (req, res) => {
  const subject = String(req.body?.subject || '').trim().slice(0, 100);
  const message = String(req.body?.message || '').trim().slice(0, 2000);
  if (subject.length < 3 || message.length < 5) return res.status(400).json({ error: 'Add a subject and a short message' });
  const m = await prisma.supportMessage.create({ data: { userId: req.userId, subject, message } });
  res.json({ id: m.id, message: 'Thanks. Our team will reply as soon as we can.' });
});
router.get('/', auth, async (req, res) => {
  res.json(await prisma.supportMessage.findMany({ where: { userId: req.userId }, orderBy: { createdAt: 'desc' }, take: 30 }));
});
module.exports = router;
