const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Products
router.get('/products', async (req, res) => {
  const products = await prisma.product.findMany();
  res.json(products);
});

// Cart
router.get('/cart', auth, async (req, res) => {
  const items = await prisma.cartItem.findMany({ where: { userId: req.userId } });
  res.json(items);
});

router.post('/cart', auth, async (req, res) => {
  const { productId, quantity } = req.body;
  const item = await prisma.cartItem.create({ data: { userId: req.userId, productId, quantity: quantity || 1 } });
  res.json(item);
});

// Checkout
router.post('/checkout', auth, async (req, res) => {
  try {
    const { pin } = req.body;
    const bcrypt = require('bcryptjs');
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || !(await bcrypt.compare(pin, user.pin))) return res.status(400).json({ error: 'Invalid PIN' });

    const cart = await prisma.cartItem.findMany({ where: { userId: req.userId } });
    if (cart.length === 0) return res.status(400).json({ error: 'Cart empty' });

    let total = 0;
    const itemsDetail = [];
    for (const item of cart) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      total += product.price * item.quantity;
      itemsDetail.push({ name: product.name, qty: item.quantity, price: product.price });
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId: req.userId } });
    if (wallet.balance < total) return res.status(400).json({ error: 'Insufficient balance' });

    await prisma.$transaction(async (tx) => {
      await tx.wallet.update({ where: { userId: req.userId }, data: { balance: { decrement: total } } });
      await tx.order.create({ data: { userId: req.userId, total, items: JSON.stringify(itemsDetail) } });
      await tx.transaction.create({
        data: { type: 'MART', amount: total, description: 'H-Mart purchase', senderId: req.userId },
      });
      await tx.cartItem.deleteMany({ where: { userId: req.userId } });
    });

    const updated = await prisma.wallet.findUnique({ where: { userId: req.userId } });
    res.json({ message: 'Order placed successfully', balance: updated.balance, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Checkout failed' });
  }
});

module.exports = router;
