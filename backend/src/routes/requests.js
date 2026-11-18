const express = require('express');
const prisma = require('../lib/db');
const auth = require('../middleware/auth');
const L = require('../lib/ledger');
const { uniqueCode } = require('../lib/chamaService');

// Payment requests and payment links (Pochi-style when "reusable")
const router = express.Router();

// Create a request / link
router.post('/', auth, L.wrap(async (req, res) => {
  const { amount, note, reusable } = req.body || {};
  const data = { requesterId: req.userId, reusable: !!reusable };
  if (amount !== undefined && amount !== null && amount !== '') data.amount = L.parseAmount(amount);
  if (note) data.note = String(note).trim().slice(0, 100);
  data.code = await uniqueCode('paymentRequest', 8);
  const created = await prisma.paymentRequest.create({ data });
  res.json({ id: created.id, code: created.code, amount: created.amount, note: created.note, reusable: created.reusable, path: `/pay/${created.code}` });
}));

// My requests
router.get('/', auth, L.wrap(async (req, res) => {
  const list = await prisma.paymentRequest.findMany({ where: { requesterId: req.userId }, orderBy: { createdAt: 'desc' }, take: 50 });
  res.json(list);
}));

// Public preview for the pay page (no login needed to look at it)
router.get('/public/:code', L.wrap(async (req, res) => {
  const reqst = await prisma.paymentRequest.findUnique({ where: { code: String(req.params.code).toUpperCase() } });
  if (!reqst) throw new L.LedgerError('Payment request not found', 404);
  const owner = await prisma.user.findUnique({ where: { id: reqst.requesterId } });
  res.json({
    code: reqst.code, amount: reqst.amount, note: reqst.note, reusable: reqst.reusable, status: reqst.status,
    requesterName: owner ? owner.name.split(' ')[0] : 'Someone',
  });
}));

// Pay a request
router.post('/:code/pay', auth, L.wrap(async (req, res) => {
  const { pin, amount } = req.body || {};
  const code = String(req.params.code).toUpperCase();
  const reqst = await prisma.paymentRequest.findUnique({ where: { code } });
  if (!reqst) throw new L.LedgerError('Payment request not found', 404);
  if (reqst.status !== 'OPEN') throw new L.LedgerError('This request is no longer open');
  if (reqst.requesterId === req.userId) throw new L.LedgerError('You cannot pay your own request');

  const amt = reqst.amount != null ? reqst.amount : L.parseAmount(amount);
  await L.verifyPin(req.userId, pin);

  await prisma.$transaction(async (t) => {
    if (!reqst.reusable) {
      const flip = await t.paymentRequest.updateMany({
        where: { id: reqst.id, status: 'OPEN' },
        data: { status: 'PAID', paidById: req.userId, paidAt: new Date() },
      });
      if (flip.count !== 1) throw new L.LedgerError('This request was just paid by someone else');
    }
    await L.debit(t, req.userId, amt);
    await L.credit(t, reqst.requesterId, amt);
    await L.record(t, {
      type: 'REQUEST_PAYMENT',
      amount: amt,
      description: `Payment request${reqst.note ? `: ${reqst.note}` : ''}`,
      senderId: req.userId,
      recipientId: reqst.requesterId,
    });
  });
  const wallet = await prisma.wallet.findUnique({ where: { userId: req.userId } });
  res.json({ message: `Paid KES ${amt.toLocaleString()}`, balance: wallet.balance });
}));

// Cancel my request
router.delete('/:id', auth, L.wrap(async (req, res) => {
  const r = await prisma.paymentRequest.updateMany({
    where: { id: req.params.id, requesterId: req.userId, status: 'OPEN' },
    data: { status: 'CANCELLED' },
  });
  if (r.count !== 1) throw new L.LedgerError('Request not found or already closed', 404);
  res.json({ message: 'Request cancelled' });
}));

module.exports = router;
