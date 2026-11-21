const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const L = require('../lib/ledger');
// Same PIN check as everywhere else (5 wrong tries -> 15 minutes)
const verifyPin = async (userId, pin) => { try { await L.verifyPin(userId, pin); return true; } catch { return false; } };

router.post('/send', auth, async (req, res) => {
  try {
    let { phone, amount, pin } = req.body;
    if (!phone || !amount || !pin) return res.status(400).json({ error: 'Missing fields' });
    // send to a unique username (for example @tnirungu27) as well as to a phone number
    if (String(phone).startsWith('@')) {
      const target = await prisma.user.findUnique({ where: { username: String(phone).slice(1).toLowerCase() } });
      if (!target) return res.status(404).json({ error: 'No user with that username' });
      phone = target.phone;
    }
    if (!(await verifyPin(req.userId, pin))) return res.status(400).json({ error: 'Invalid PIN' });

    const numAmount = parseFloat(amount);
    if (numAmount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const senderWallet = await prisma.wallet.findUnique({ where: { userId: req.userId } });
    if (senderWallet.balance < numAmount) return res.status(400).json({ error: 'Insufficient balance' });

    const recipient = await prisma.user.findUnique({ where: { phone }, include: { wallet: true } });

    await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId: req.userId },
        data: { balance: { decrement: numAmount } },
      });

      if (recipient?.wallet) {
        await tx.wallet.update({
          where: { userId: recipient.id },
          data: { balance: { increment: numAmount } },
        });
      }

      await tx.transaction.create({
        data: {
          type: 'SEND',
          amount: numAmount,
          description: `Sent to ${phone}`,
          senderId: req.userId,
          recipientId: recipient?.id || null,
        },
      });
    });

    const updated = await prisma.wallet.findUnique({ where: { userId: req.userId } });
    res.json({ message: 'Money sent successfully', balance: updated.balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Transaction failed' });
  }
});

router.post('/paybill', auth, async (req, res) => {
  try {
    const { businessNumber, accountNumber, amount, pin } = req.body;
    if (!businessNumber || !accountNumber || !amount || !pin) return res.status(400).json({ error: 'Missing fields' });
    if (!(await verifyPin(req.userId, pin))) return res.status(400).json({ error: 'Invalid PIN' });

    const numAmount = parseFloat(amount);
    const wallet = await prisma.wallet.findUnique({ where: { userId: req.userId } });
    if (wallet.balance < numAmount) return res.status(400).json({ error: 'Insufficient balance' });

    await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId: req.userId },
        data: { balance: { decrement: numAmount } },
      });

      await tx.transaction.create({
        data: {
          type: 'PAYBILL',
          amount: numAmount,
          description: `Paybill ${businessNumber} - Acc ${accountNumber}`,
          senderId: req.userId,
        },
      });
    });

    const updated = await prisma.wallet.findUnique({ where: { userId: req.userId } });
    res.json({ message: 'Bill paid successfully', balance: updated.balance });
  } catch (err) {
    res.status(500).json({ error: 'Payment failed' });
  }
});

router.post('/till', auth, async (req, res) => {
  try {
    const { tillNumber, amount, pin } = req.body;
    if (!tillNumber || !amount || !pin) return res.status(400).json({ error: 'Missing fields' });
    if (!(await verifyPin(req.userId, pin))) return res.status(400).json({ error: 'Invalid PIN' });

    const numAmount = parseFloat(amount);
    const wallet = await prisma.wallet.findUnique({ where: { userId: req.userId } });
    if (wallet.balance < numAmount) return res.status(400).json({ error: 'Insufficient balance' });

    await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId: req.userId },
        data: { balance: { decrement: numAmount } },
      });

      await tx.transaction.create({
        data: {
          type: 'TILL',
          amount: numAmount,
          description: `Buy Goods - Till ${tillNumber}`,
          senderId: req.userId,
        },
      });
    });

    const updated = await prisma.wallet.findUnique({ where: { userId: req.userId } });
    res.json({ message: 'Payment successful', balance: updated.balance });
  } catch (err) {
    res.status(500).json({ error: 'Payment failed' });
  }
});

router.post('/deposit', auth, async (req, res) => {
  try {
    const { method, amount, reference, pin } = req.body;
    if (!method || !amount || !reference || !pin) return res.status(400).json({ error: 'Missing fields' });
    if (!(await verifyPin(req.userId, pin))) return res.status(400).json({ error: 'Invalid PIN' });

    const numAmount = parseFloat(amount);
    if (numAmount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId: req.userId },
        data: { balance: { increment: numAmount } },
      });

      await tx.transaction.create({
        data: {
          type: 'DEPOSIT',
          amount: numAmount,
          description: `Deposit via ${method.toUpperCase()} - Ref ${reference}`,
          senderId: req.userId,
          recipientId: req.userId,
        },
      });
    });

    const updated = await prisma.wallet.findUnique({ where: { userId: req.userId } });
    res.json({ message: `KES ${numAmount} deposited via ${method}`, balance: updated.balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Deposit failed' });
  }
});

router.get('/history', auth, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { OR: [{ senderId: req.userId }, { recipientId: req.userId }] },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
