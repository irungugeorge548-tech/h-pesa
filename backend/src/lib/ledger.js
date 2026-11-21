const bcrypt = require('bcryptjs');
const prisma = require('./db');

class LedgerError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const round2 = (n) => Math.round(n * 100) / 100;

function parseAmount(v) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (!Number.isFinite(n) || n <= 0) throw new LedgerError('Invalid amount');
  if (n > 1000000) throw new LedgerError('Amount too large');
  return round2(n);
}

// 0712345678, +254712345678, 254712345678 and 0112345678 all become 07.../01... form
function normalizePhone(input) {
  if (!input) return '';
  let p = String(input).replace(/[\s\-()]/g, '');
  if (p.startsWith('+254')) p = '0' + p.slice(4);
  else if (p.startsWith('254') && p.length === 12) p = '0' + p.slice(3);
  return p;
}

async function findUserByPhone(phone) {
  const normalized = normalizePhone(phone);
  return prisma.user.findUnique({ where: { phone: normalized } });
}

// --- PIN check with lockout (5 wrong tries -> 15 minutes) -------------------
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const pinFails = new Map();

async function verifyPin(userId, pin) {
  const rec = pinFails.get(userId);
  if (rec && Date.now() - rec.first >= LOCK_MS) pinFails.delete(userId);
  const live = pinFails.get(userId);
  if (live && live.count >= MAX_FAILS) {
    throw new LedgerError('Too many wrong PIN attempts. Try again in 15 minutes.', 429);
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  let ok = !!(user && pin && (await bcrypt.compare(String(pin), user.pin)));
  if (ok && user.pendingPin) {
    // The real owner is still using the old PIN: cancel any reset someone requested.
    await prisma.user.update({ where: { id: userId }, data: { pendingPin: null, pendingPinAt: null } });
  } else if (!ok && user && user.pendingPin && user.pendingPinAt && user.pendingPinAt <= new Date() && pin && (await bcrypt.compare(String(pin), user.pendingPin))) {
    // The waiting period is over and the new PIN is being used: make it the PIN.
    await prisma.user.update({ where: { id: userId }, data: { pin: user.pendingPin, pendingPin: null, pendingPinAt: null } });
    ok = true;
  }
  if (!ok) {
    const r = pinFails.get(userId) || { count: 0, first: Date.now() };
    r.count += 1;
    pinFails.set(userId, r);
    throw new LedgerError('Invalid PIN');
  }
  pinFails.delete(userId);
  return user;
}

function resetPinLockouts() { pinFails.clear(); }

// --- Money movement (always call inside prisma.$transaction) -----------------
// Debits only if the balance is enough, in a single conditional update, so two
// simultaneous requests can never spend the same money twice.
async function debit(tx, userId, amount) {
  const r = await tx.wallet.updateMany({
    where: { userId, balance: { gte: amount } },
    data: { balance: { decrement: amount } },
  });
  if (r.count !== 1) throw new LedgerError('Insufficient balance');
}

async function credit(tx, userId, amount) {
  const w = await tx.wallet.findUnique({ where: { userId } });
  if (!w) throw new LedgerError('Recipient wallet not found');
  await tx.wallet.update({ where: { userId }, data: { balance: { increment: amount } } });
}

async function record(tx, data) {
  return tx.transaction.create({ data });
}

// Wrap an async express handler so LedgerError becomes a clean JSON error
const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err instanceof LedgerError) return res.status(err.status).json({ error: err.message });
    if (err && err.code === 'P2002') return res.status(409).json({ error: 'Duplicate request' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  LedgerError, round2, parseAmount, normalizePhone, findUserByPhone,
  verifyPin, resetPinLockouts, debit, credit, record, wrap,
};
