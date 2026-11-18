const crypto = require('crypto');
const prisma = require('./db');
const { LedgerError, debit, credit, record } = require('./ledger');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_MEMBERS = 30;

function makeCode(length = 6) {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return out;
}

async function uniqueCode(model, length) {
  for (let i = 0; i < 10; i++) {
    const code = makeCode(length);
    const hit = await prisma[model].findUnique({ where: { code } });
    if (!hit) return code;
  }
  throw new LedgerError('Could not create a code, try again', 500);
}

// A member puts this cycle's contribution into the group pool.
async function contribute(userId, chamaId) {
  const chama = await prisma.chama.findUnique({ where: { id: chamaId } });
  if (!chama) throw new LedgerError('Chama not found', 404);
  if (chama.status === 'COMPLETED') throw new LedgerError('This chama has completed all its cycles');
  const member = await prisma.chamaMember.findFirst({ where: { chamaId, userId } });
  if (!member) throw new LedgerError('You are not a member of this chama', 403);

  const cycle = chama.currentCycle;
  const amount = chama.contributionAmount;

  await prisma.$transaction(async (t) => {
    const dup = await t.chamaEntry.findFirst({ where: { chamaId, userId, type: 'CONTRIBUTION', cycle } });
    if (dup) throw new LedgerError('You have already contributed this cycle');
    await debit(t, userId, amount);
    const upd = await t.chama.updateMany({
      where: { id: chamaId, currentCycle: cycle },
      data: { balance: { increment: amount }, status: 'ACTIVE' },
    });
    if (upd.count !== 1) throw new LedgerError('The chama moved to a new cycle. Please try again.');
    await t.chamaEntry.create({ data: { chamaId, userId, type: 'CONTRIBUTION', amount, cycle } });
    await record(t, {
      type: 'CHAMA_CONTRIBUTION',
      amount,
      description: `Chama ${chama.name} - cycle ${cycle}`,
      senderId: userId,
      recipientId: null,
    });
  });
  return { cycle, amount };
}

// The chama creator releases the pooled money to the member whose turn it is.
async function payout(userId, chamaId) {
  const chama = await prisma.chama.findUnique({ where: { id: chamaId } });
  if (!chama) throw new LedgerError('Chama not found', 404);
  if (chama.createdById !== userId) throw new LedgerError('Only the chama creator can release the payout', 403);
  if (chama.status === 'COMPLETED') throw new LedgerError('This chama has completed all its cycles');

  const members = await prisma.chamaMember.findMany({ where: { chamaId } });
  const n = members.length;
  if (n < 2) throw new LedgerError('A chama needs at least 2 members');
  const cycle = chama.currentCycle;
  const paid = await prisma.chamaEntry.count({ where: { chamaId, type: 'CONTRIBUTION', cycle } });
  if (paid < n) throw new LedgerError(`Waiting for ${n - paid} more contribution${n - paid === 1 ? '' : 's'}`);

  const recipient = members.find((m) => m.position === cycle);
  if (!recipient) throw new LedgerError('No recipient found for this cycle', 500);
  const pool = chama.balance;

  await prisma.$transaction(async (t) => {
    const upd = await t.chama.updateMany({
      where: { id: chamaId, currentCycle: cycle, balance: pool },
      data: { balance: 0, currentCycle: { increment: 1 }, status: cycle >= n ? 'COMPLETED' : 'ACTIVE' },
    });
    if (upd.count !== 1) throw new LedgerError('Payout already released or the pool changed. Refresh and try again.');
    await credit(t, recipient.userId, pool);
    await t.chamaEntry.create({ data: { chamaId, userId: recipient.userId, type: 'PAYOUT', amount: pool, cycle } });
    await record(t, {
      type: 'CHAMA_PAYOUT',
      amount: pool,
      description: `Chama ${chama.name} payout - cycle ${cycle}`,
      senderId: recipient.userId,
      recipientId: recipient.userId,
    });
  });
  return { cycle, amount: pool, recipientUserId: recipient.userId };
}

module.exports = { contribute, payout, uniqueCode, MAX_MEMBERS };
