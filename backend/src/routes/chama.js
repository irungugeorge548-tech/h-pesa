const express = require('express');
const prisma = require('../lib/db');
const auth = require('../middleware/auth');
const L = require('../lib/ledger');
const chamaService = require('../lib/chamaService');

const router = express.Router();
const FREQUENCIES = ['WEEKLY', 'MONTHLY'];

async function namesFor(ids) {
  const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } } }) : [];
  return Object.fromEntries(users.map((u) => [u.id, u.name]));
}

// My chamas
router.get('/', auth, L.wrap(async (req, res) => {
  const memberships = await prisma.chamaMember.findMany({ where: { userId: req.userId } });
  const out = [];
  for (const m of memberships) {
    const chama = await prisma.chama.findUnique({ where: { id: m.chamaId } });
    if (!chama) continue;
    const memberCount = await prisma.chamaMember.count({ where: { chamaId: chama.id } });
    const mine = await prisma.chamaEntry.findFirst({
      where: { chamaId: chama.id, userId: req.userId, type: 'CONTRIBUTION', cycle: chama.currentCycle },
    });
    out.push({
      id: chama.id, name: chama.name, code: chama.code, status: chama.status,
      contributionAmount: chama.contributionAmount, frequency: chama.frequency,
      balance: chama.balance, currentCycle: chama.currentCycle, memberCount,
      myPosition: m.position, iContributed: !!mine, isCreator: chama.createdById === req.userId,
    });
  }
  res.json(out);
}));

// Create a chama; the creator is member #1
router.post('/', auth, L.wrap(async (req, res) => {
  const { name, contributionAmount, frequency } = req.body || {};
  const trimmed = String(name || '').trim();
  if (trimmed.length < 2 || trimmed.length > 40) throw new L.LedgerError('Give the chama a name (2-40 characters)');
  const amount = L.parseAmount(contributionAmount);
  const freq = FREQUENCIES.includes(frequency) ? frequency : 'MONTHLY';
  const code = await chamaService.uniqueCode('chama', 6);
  const chama = await prisma.$transaction(async (t) => {
    const c = await t.chama.create({ data: { name: trimmed, code, createdById: req.userId, contributionAmount: amount, frequency: freq } });
    await t.chamaMember.create({ data: { chamaId: c.id, userId: req.userId, position: 1 } });
    return c;
  });
  res.json({ id: chama.id, code: chama.code, name: chama.name });
}));

// Join with a code (only while the group is still forming)
router.post('/join', auth, L.wrap(async (req, res) => {
  const code = String((req.body || {}).code || '').trim().toUpperCase();
  if (!code) throw new L.LedgerError('Enter the chama code');
  const chama = await prisma.chama.findUnique({ where: { code } });
  if (!chama) throw new L.LedgerError('No chama found with that code', 404);
  if (chama.status !== 'FORMING') throw new L.LedgerError('This chama has already started and is closed to new members');
  const already = await prisma.chamaMember.findFirst({ where: { chamaId: chama.id, userId: req.userId } });
  if (already) throw new L.LedgerError('You are already a member of this chama');
  const count = await prisma.chamaMember.count({ where: { chamaId: chama.id } });
  if (count >= chamaService.MAX_MEMBERS) throw new L.LedgerError('This chama is full');
  await prisma.chamaMember.create({ data: { chamaId: chama.id, userId: req.userId, position: count + 1 } });
  res.json({ id: chama.id, name: chama.name });
}));

// Details of one chama (members only)
router.get('/:id', auth, L.wrap(async (req, res) => {
  const chama = await prisma.chama.findUnique({ where: { id: req.params.id } });
  if (!chama) throw new L.LedgerError('Chama not found', 404);
  const members = await prisma.chamaMember.findMany({ where: { chamaId: chama.id } });
  if (!members.some((m) => m.userId === req.userId)) throw new L.LedgerError('You are not a member of this chama', 403);

  const entries = await prisma.chamaEntry.findMany({ where: { chamaId: chama.id }, orderBy: { createdAt: 'desc' }, take: 30 });
  const cycleContribs = await prisma.chamaEntry.findMany({ where: { chamaId: chama.id, type: 'CONTRIBUTION', cycle: chama.currentCycle } });
  const paidIds = new Set(cycleContribs.map((e) => e.userId));
  const names = await namesFor(members.map((m) => m.userId));
  const sorted = [...members].sort((a, b) => a.position - b.position);
  const next = sorted.find((m) => m.position === chama.currentCycle);

  res.json({
    id: chama.id, name: chama.name, code: chama.code, status: chama.status,
    contributionAmount: chama.contributionAmount, frequency: chama.frequency,
    balance: chama.balance, currentCycle: chama.currentCycle, memberCount: members.length,
    isCreator: chama.createdById === req.userId,
    iContributed: paidIds.has(req.userId),
    contributedCount: paidIds.size,
    canPayout: chama.status !== 'COMPLETED' && members.length >= 2 && paidIds.size === members.length,
    nextRecipient: next ? { userId: next.userId, name: names[next.userId], position: next.position } : null,
    members: sorted.map((m) => ({
      userId: m.userId, name: names[m.userId] || 'Member', position: m.position,
      contributed: paidIds.has(m.userId), isMe: m.userId === req.userId,
    })),
    history: entries.map((e) => ({ id: e.id, type: e.type, amount: e.amount, cycle: e.cycle, name: names[e.userId] || 'Member', createdAt: e.createdAt })),
  });
}));

router.post('/:id/contribute', auth, L.wrap(async (req, res) => {
  await L.verifyPin(req.userId, (req.body || {}).pin);
  const result = await chamaService.contribute(req.userId, req.params.id);
  const wallet = await prisma.wallet.findUnique({ where: { userId: req.userId } });
  res.json({ message: `Contributed KES ${result.amount.toLocaleString()} for cycle ${result.cycle}`, balance: wallet.balance });
}));

router.post('/:id/payout', auth, L.wrap(async (req, res) => {
  await L.verifyPin(req.userId, (req.body || {}).pin);
  const result = await chamaService.payout(req.userId, req.params.id);
  res.json({ message: `Released KES ${result.amount.toLocaleString()} for cycle ${result.cycle}`, amount: result.amount });
}));

module.exports = router;
