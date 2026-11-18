const express = require('express');
const prisma = require('../lib/db');
const auth = require('../middleware/auth');
const L = require('../lib/ledger');
const { runDue, addPeriod } = require('../lib/scheduler');

// Standing orders: automatic payments the user authorises once with their PIN.
const router = express.Router();
const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY'];
const MAX_AMOUNT = 50000;   // per automatic payment
const MAX_ACTIVE = 20;      // per user

router.get('/', auth, L.wrap(async (req, res) => {
  const list = await prisma.scheduledPayment.findMany({ where: { userId: req.userId }, orderBy: { createdAt: 'desc' }, take: 50 });
  const chamaIds = [...new Set(list.filter((p) => p.chamaId).map((p) => p.chamaId))];
  const chamas = chamaIds.length ? await prisma.chama.findMany({ where: { id: { in: chamaIds } } }) : [];
  const chamaName = Object.fromEntries(chamas.map((c) => [c.id, c.name]));
  const phones = [...new Set(list.filter((p) => p.recipientPhone).map((p) => p.recipientPhone))];
  const users = phones.length ? await prisma.user.findMany({ where: { phone: { in: phones } } }) : [];
  const userName = Object.fromEntries(users.map((u) => [u.phone, u.name]));
  res.json(list.map((p) => ({
    ...p,
    label: p.kind === 'CHAMA' ? `Chama: ${chamaName[p.chamaId] || 'group'}` : `To ${userName[p.recipientPhone] || p.recipientPhone}`,
  })));
}));

router.post('/', auth, L.wrap(async (req, res) => {
  const { kind, recipientPhone, chamaId, amount, frequency, startDate, note, pin } = req.body || {};
  await L.verifyPin(req.userId, pin);
  if (!FREQUENCIES.includes(frequency)) throw new L.LedgerError('Choose daily, weekly or monthly');
  const k = kind === 'CHAMA' ? 'CHAMA' : 'SEND';

  const active = await prisma.scheduledPayment.count({ where: { userId: req.userId, active: true } });
  if (active >= MAX_ACTIVE) throw new L.LedgerError(`You can have at most ${MAX_ACTIVE} active automatic payments`);

  const data = { userId: req.userId, kind: k, frequency, note: note ? String(note).trim().slice(0, 60) : null };
  if (k === 'SEND') {
    const amt = L.parseAmount(amount);
    if (amt > MAX_AMOUNT) throw new L.LedgerError(`Automatic payments are limited to KES ${MAX_AMOUNT.toLocaleString()} each`);
    const recipient = await L.findUserByPhone(recipientPhone);
    if (!recipient) throw new L.LedgerError('No H-Pesa account with that phone number', 404);
    if (recipient.id === req.userId) throw new L.LedgerError('You cannot schedule a payment to yourself');
    data.amount = amt;
    data.recipientPhone = recipient.phone;
  } else {
    const member = chamaId ? await prisma.chamaMember.findFirst({ where: { chamaId, userId: req.userId } }) : null;
    if (!member) throw new L.LedgerError('You are not a member of that chama', 403);
    const chama = await prisma.chama.findUnique({ where: { id: chamaId } });
    data.amount = chama.contributionAmount;
    data.chamaId = chamaId;
  }

  const now = new Date();
  let first = startDate ? new Date(startDate) : addPeriod(now, 'DAILY');
  if (Number.isNaN(first.getTime())) throw new L.LedgerError('Invalid start date');
  if (first <= now) first = addPeriod(now, 'DAILY');
  if (first.getTime() - now.getTime() > 366 * 24 * 60 * 60 * 1000) throw new L.LedgerError('Start date is too far away');
  data.nextRunAt = first;

  const created = await prisma.scheduledPayment.create({ data });
  res.json(created);
}));

router.delete('/:id', auth, L.wrap(async (req, res) => {
  const r = await prisma.scheduledPayment.updateMany({ where: { id: req.params.id, userId: req.userId, active: true }, data: { active: false } });
  if (r.count !== 1) throw new L.LedgerError('Automatic payment not found', 404);
  res.json({ message: 'Automatic payment stopped' });
}));

// For an external cron service (Render's free tier sleeps, so the in-process timer
// cannot be relied on). Disabled unless CRON_SECRET is set.
router.post('/run', L.wrap(async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(404).json({ error: 'Not found' });
  if (req.headers['x-cron-secret'] !== secret) return res.status(401).json({ error: 'Unauthorized' });
  const results = await runDue();
  res.json({ ran: results.length, results });
}));

module.exports = router;
