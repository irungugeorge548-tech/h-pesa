const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.post('/register', async (req, res) => {
  try {
    const { name, phone, email, password, pin } = req.body;
    if (!name || !phone || !email || !password || !pin) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ phone }, { email }] },
    });
    if (existing) return res.status(400).json({ error: 'Phone or email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPin = await bcrypt.hash(pin, 10);

    const user = await prisma.user.create({
      data: {
        name,
        phone,
        email,
        password: hashedPassword,
        pin: hashedPin,
        wallet: { create: { balance: 10000 } },
      },
      include: { wallet: true },
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'hpesa-secret-key', { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user.id, name: user.name, phone: user.phone, email: user.email },
      balance: user.wallet.balance,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await prisma.user.findUnique({ where: { phone }, include: { wallet: true } });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'hpesa-secret-key', { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user.id, name: user.name, phone: user.phone, email: user.email },
      balance: user.wallet.balance,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
