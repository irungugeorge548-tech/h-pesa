const prisma = require('./db');
const { LedgerError, findUserByPhone, debit, credit, record } = require('./ledger');
const chamaService = require('./chamaService');

function addPeriod(date, frequency) {
  const d = new Date(date);
  if (frequency === 'DAILY') d.setDate(d.getDate() + 1);
  else if (frequency === 'WEEKLY') d.setDate(d.getDate() + 7);
  else {
    // MONTHLY: keep the day of the month, clamped to the end of shorter months
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
  }
  return d;
}

async function executeOne(p, now) {
  if (p.kind === 'CHAMA') {
    await chamaService.contribute(p.userId, p.chamaId);
    return;
  }
  const recipient = await findUserByPhone(p.recipientPhone);
  if (!recipient) throw new LedgerError('Recipient account not found');
  if (recipient.id === p.userId) throw new LedgerError('Recipient is yourself');
  await prisma.$transaction(async (t) => {
    await debit(t, p.userId, p.amount);
    await credit(t, recipient.id, p.amount);
    await record(t, {
      type: 'SCHEDULED_PAYMENT',
      amount: p.amount,
      description: `Auto-pay to ${recipient.name}${p.note ? ` - ${p.note}` : ''}`,
      senderId: p.userId,
      recipientId: recipient.id,
    });
  });
}

// Runs every payment that is due. Safe to call from several places at once:
// each payment is "claimed" first, so it can only run once per due date.
// If the server was down, a missed payment is made once and then the schedule
// jumps to the next future date (no surprise catch-up charges).
async function runDue(now = new Date()) {
  const due = await prisma.scheduledPayment.findMany({ where: { active: true, nextRunAt: { lte: now } }, take: 200 });
  const results = [];
  for (const p of due) {
    let next = addPeriod(p.nextRunAt, p.frequency);
    while (next <= now) next = addPeriod(next, p.frequency);

    const claim = await prisma.scheduledPayment.updateMany({
      where: { id: p.id, active: true, nextRunAt: p.nextRunAt },
      data: { nextRunAt: next },
    });
    if (claim.count !== 1) continue;

    try {
      await executeOne(p, now);
      await prisma.scheduledPayment.update({ where: { id: p.id }, data: { lastRunAt: now, lastStatus: 'OK', failCount: 0 } });
      results.push({ id: p.id, ok: true });
    } catch (err) {
      const fails = p.failCount + 1;
      const retry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      await prisma.scheduledPayment.update({
        where: { id: p.id },
        data: {
          lastRunAt: now,
          lastStatus: `FAILED: ${err.message}`.slice(0, 200),
          failCount: fails,
          active: fails < 3,
          nextRunAt: retry < next ? retry : next,
        },
      });
      results.push({ id: p.id, ok: false, error: err.message });
    }
  }
  return results;
}

module.exports = { runDue, addPeriod };
