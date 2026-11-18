const prisma = require('./db');

// Placeholder rates - tune freely. Defaults give roughly 1% back:
//   1 point per KES 10 spent, and 1 point is worth KES 0.10 when redeemed.
const KES_PER_POINT_EARNED = Number(process.env.REWARD_KES_PER_POINT || 10);
const KES_PER_POINT_REDEEMED = Number(process.env.REWARD_REDEEM_KES || 0.1);
const MIN_REDEEM_POINTS = Number(process.env.REWARD_MIN_REDEEM || 100);

const pointsForSpend = (amount) => Math.floor(amount / KES_PER_POINT_EARNED);

async function balanceOf(userId, db = prisma) {
  const rows = await db.rewardEntry.findMany({ where: { userId } });
  return rows.reduce((sum, r) => sum + r.points, 0);
}

// Never throws: rewards must not break a payment. Duplicate (source, ref) is ignored.
async function award(userId, points, source, reason, externalRef) {
  if (!points || points <= 0) return null;
  try {
    return await prisma.rewardEntry.create({ data: { userId, points, source, reason, externalRef: externalRef || null } });
  } catch (err) {
    if (err && err.code === 'P2002') return null;
    console.error('reward award failed', err.message);
    return null;
  }
}

// Take back the points a refunded purchase earned. Never throws.
async function revoke(userId, source, externalRef) {
  try {
    const original = await prisma.rewardEntry.findFirst({ where: { userId, source, externalRef } });
    if (!original || original.points <= 0) return null;
    return await prisma.rewardEntry.create({
      data: { userId, points: -original.points, source, reason: 'Refund - points reversed', externalRef: `refund:${externalRef}` },
    });
  } catch (err) {
    if (err && err.code === 'P2002') return null;
    console.error('reward revoke failed', err.message);
    return null;
  }
}

module.exports = { pointsForSpend, balanceOf, award, revoke, KES_PER_POINT_REDEEMED, MIN_REDEEM_POINTS };
