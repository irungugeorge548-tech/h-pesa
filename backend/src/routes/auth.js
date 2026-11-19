const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.post('/register', async (req, res) => {
  try {
    const { name, password, pin } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase(); // same address in different capitals is the same account
    // 0712..., +254712... and 254712... are the same number: always store the 07.. form
    const phone = require('../lib/ledger').normalizePhone(req.body.phone);
    if (!name || !phone || !email || !password || !pin) {
      return res.status(400).json({ error: 'All fields required' });
    }
    if (!/^(07|01)\d{8}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid Kenyan phone number' });
    if (!/^\d{4}$/.test(String(pin))) return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

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
    const { password } = req.body;
    const phone = require('../lib/ledger').normalizePhone(req.body.phone);
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
