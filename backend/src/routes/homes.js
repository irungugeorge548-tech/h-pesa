const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// List properties (marketplace)
router.get('/properties', async (req, res) => {
  const properties = await prisma.property.findMany({ include: { units: true, landlord: { select: { name: true } } } });
  res.json(properties);
});

// My properties (landlord)
router.get('/my-properties', auth, async (req, res) => {
  const properties = await prisma.property.findMany({
    where: { landlordId: req.userId },
    include: { units: { include: { tenancy: { include: { tenant: { select: { name: true, phone: true } } } } } } },
  });
  res.json(properties);
});

// My unit (tenant)
router.get('/my-unit', auth, async (req, res) => {
  const tenancy = await prisma.tenancy.findFirst({
    where: { tenantId: req.userId },
    include: { unit: { include: { property: true } } },
  });
  res.json(tenancy);
});

// Pay rent (full or partial)
router.post('/pay-rent', auth, async (req, res) => {
  try {
    const { amount, pin } = req.body;
    const bcrypt = require('bcryptjs');
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || !(await bcrypt.compare(pin, user.pin))) return res.status(400).json({ error: 'Invalid PIN' });

    const numAmount = parseFloat(amount);
    const wallet = await prisma.wallet.findUnique({ where: { userId: req.userId } });
    if (wallet.balance < numAmount) return res.status(400).json({ error: 'Insufficient balance' });

    await prisma.$transaction(async (tx) => {
      await tx.wallet.update({ where: { userId: req.userId }, data: { balance: { decrement: numAmount } } });
      await tx.transaction.create({
        data: { type: 'RENT', amount: numAmount, description: 'Rent payment', senderId: req.userId },
      });
    });

    const updated = await prisma.wallet.findUnique({ where: { userId: req.userId } });
    res.json({ message: 'Rent paid successfully', balance: updated.balance });
  } catch (err) {
    res.status(500).json({ error: 'Payment failed' });
  }
});

module.exports = router;
