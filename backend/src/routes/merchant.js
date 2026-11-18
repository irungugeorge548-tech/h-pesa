const express = require('express');
const crypto = require('crypto');
const prisma = require('../lib/db');
const L = require('../lib/ledger');
const rewards = require('../lib/rewards');

// Server-to-server payments API for partner apps (H-Fleet, H-Homes, H-Mart).
// Each app has its own API key, so it never needs a user's password.
const router = express.Router();

const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const sourceOf = (client) => client.name.toUpperCase().replace(/\s+/g, '-');

async function serviceAuth(req, res, next) {
  try {
    const key = req.headers['x-api-key'];
    if (!key) return res.status(401).json({ error: 'API key required' });
    const client = await prisma.serviceClient.findUnique({ where: { keyHash: sha256(key) } });
    if (!client || !client.active) return res.status(401).json({ error: 'Invalid API key' });
    req.client = client;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Charge a user. Safe to retry: the same `reference` is only ever charged once.
router.post('/charge', serviceAuth, L.wrap(async (req, res) => {
  const { phone, pin, amount, reference, description, toPhone } = req.body || {};
  if (!phone || !pin || !amount || !reference) {
    throw new L.LedgerError('phone, pin, amount and reference are required');
  }
  const client = req.client;
  const ref = String(reference);

  const existing = await prisma.transaction.findFirst({ where: { serviceClientId: client.id, externalRef: ref } });
  if (existing) {
    return res.json({ status: 'COMPLETED', duplicate: true, transactionId: existing.id, reference: ref, amount: existing.amount });
  }

  const user = await L.findUserByPhone(phone);
  if (!user) throw new L.LedgerError('Account not found', 404);
  const amt = L.parseAmount(amount);
  await L.verifyPin(user.id, pin);

  let recipientId = client.merchantUserId;
  if (toPhone) {
    if (!client.allowRecipients) throw new L.LedgerError('This app may not pay to other accounts', 403);
    const r = await L.findUserByPhone(toPhone);
    if (!r) throw new L.LedgerError('Recipient not found', 404);
    recipientId = r.id;
  }
  if (recipientId === user.id) throw new L.LedgerError('You cannot pay yourself');

  let tx;
  try {
    tx = await prisma.$transaction(async (t) => {
      await L.debit(t, user.id, amt);
      await L.credit(t, recipientId, amt);
      return L.record(t, {
        type: 'PAYMENT',
        amount: amt,
        description: `${client.name}: ${description || 'Payment'}`,
        senderId: user.id,
        recipientId,
        externalRef: ref,
        serviceClientId: client.id,
      });
    });
  } catch (err) {
    if (err && err.code === 'P2002') {
      const again = await prisma.transaction.findFirst({ where: { serviceClientId: client.id, externalRef: ref } });
      if (again) return res.json({ status: 'COMPLETED', duplicate: true, transactionId: again.id, reference: ref, amount: again.amount });
    }
    throw err;
  }

  const pointsEarned = rewards.pointsForSpend(amt);
  await rewards.award(user.id, pointsEarned, sourceOf(client), `Spent on ${client.name}`, ref);
  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  res.json({ status: 'COMPLETED', transactionId: tx.id, reference: ref, amount: amt, balance: wallet.balance, pointsEarned });
}));

// Reverse a charge (for example, when a ride could not be created after paying).
router.post('/refund', serviceAuth, L.wrap(async (req, res) => {
  const { reference, reason } = req.body || {};
  if (!reference) throw new L.LedgerError('reference is required');
  const client = req.client;
  const ref = String(reference);

  const original = await prisma.transaction.findFirst({ where: { serviceClientId: client.id, externalRef: ref } });
  if (!original || original.type !== 'PAYMENT') throw new L.LedgerError('Charge not found', 404);
  const refundRef = `refund:${ref}`;
  const done = await prisma.transaction.findFirst({ where: { serviceClientId: client.id, externalRef: refundRef } });
  if (done) return res.json({ status: 'REFUNDED', duplicate: true, reference: ref, amount: done.amount });

  let refund;
  try {
    refund = await prisma.$transaction(async (t) => {
      await L.debit(t, original.recipientId, original.amount);
      await L.credit(t, original.senderId, original.amount);
      return L.record(t, {
        type: 'REFUND',
        amount: original.amount,
        description: `${client.name}: Refund${reason ? ` - ${reason}` : ''}`,
        senderId: original.recipientId,
        recipientId: original.senderId,
        externalRef: refundRef,
        serviceClientId: client.id,
      });
    });
  } catch (err) {
    if (err && err.code === 'P2002') return res.json({ status: 'REFUNDED', duplicate: true, reference: ref, amount: original.amount });
    throw err;
  }
  await rewards.revoke(original.senderId, sourceOf(client), ref);
  res.json({ status: 'REFUNDED', transactionId: refund.id, reference: ref, amount: refund.amount });
}));

// Did this charge go through? Lets an app reconcile after a timeout or crash.
router.get('/status/:reference', serviceAuth, L.wrap(async (req, res) => {
  const ref = String(req.params.reference);
  const charge = await prisma.transaction.findFirst({ where: { serviceClientId: req.client.id, externalRef: ref } });
  if (!charge) return res.json({ status: 'NOT_FOUND', reference: ref });
  const refund = await prisma.transaction.findFirst({ where: { serviceClientId: req.client.id, externalRef: `refund:${ref}` } });
  res.json({ status: refund ? 'REFUNDED' : 'COMPLETED', reference: ref, amount: charge.amount, createdAt: charge.createdAt });
}));

// Give a user bonus points (for example H-Homes rewarding on-time rent).
router.post('/reward', serviceAuth, L.wrap(async (req, res) => {
  const { phone, points, reason, reference } = req.body || {};
  const n = parseInt(points, 10);
  if (!phone || !reference || !Number.isInteger(n) || n < 1 || n > 1000) {
    throw new L.LedgerError('phone, reference and points (1-1000) are required');
  }
  const user = await L.findUserByPhone(phone);
  if (!user) throw new L.LedgerError('Account not found', 404);
  const entry = await rewards.award(user.id, n, sourceOf(req.client), reason || 'Bonus', String(reference));
  res.json({ awarded: !!entry, balance: await rewards.balanceOf(user.id) });
}));

module.exports = router;
