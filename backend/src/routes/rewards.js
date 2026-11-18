const express = require('express');
const prisma = require('../lib/db');
const auth = require('../middleware/auth');
const L = require('../lib/ledger');
const rewards = require('../lib/rewards');

const router = express.Router();

router.get('/', auth, L.wrap(async (req, res) => {
  const points = await rewards.balanceOf(req.userId);
  const history = await prisma.rewardEntry.findMany({ where: { userId: req.userId }, orderBy: { createdAt: 'desc' }, take: 30 });
  res.json({
    points,
    valueKES: L.round2(Math.max(points, 0) * rewards.KES_PER_POINT_REDEEMED),
    minRedeem: rewards.MIN_REDEEM_POINTS,
    kesPerPoint: rewards.KES_PER_POINT_REDEEMED,
    history,
  });
}));

// Turn points into wallet money
router.post('/redeem', auth, L.wrap(async (req, res) => {
  const { points, pin } = req.body || {};
  const n = parseInt(points, 10);
  if (!Number.isInteger(n) || n < rewards.MIN_REDEEM_POINTS) {
    throw new L.LedgerError(`Redeem at least ${rewards.MIN_REDEEM_POINTS} points`);
  }
  await L.verifyPin(req.userId, pin);
  const kes = L.round2(n * rewards.KES_PER_POINT_REDEEMED);

  await prisma.$transaction(async (t) => {
    const balance = await rewards.balanceOf(req.userId, t);
    if (n > balance) throw new L.LedgerError('You do not have that many points');
    await t.rewardEntry.create({ data: { userId: req.userId, points: -n, source: 'H-PESA', reason: 'Redeemed to wallet' } });
    await L.credit(t, req.userId, kes);
    await L.record(t, {
      type: 'REWARD_REDEEM', amount: kes, description: `Redeemed ${n} points`, senderId: req.userId, recipientId: req.userId,
    });
  });
  const wallet = await prisma.wallet.findUnique({ where: { userId: req.userId } });
  res.json({ message: `Redeemed ${n} points for KES ${kes}`, balance: wallet.balance, points: await rewards.balanceOf(req.userId) });
}));

module.exports = router;
