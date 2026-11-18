const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

async function main() {
  const password = await bcrypt.hash('password123', 10);
  const pin = await bcrypt.hash('1234', 10);

  const landlord = await prisma.user.upsert({
    where: { phone: '0700111222' },
    update: {},
    create: {
      name: 'Landlord Demo',
      phone: '0700111222',
      email: 'landlord@haraka.com',
      password,
      pin,
      role: 'LANDLORD',
      wallet: { create: { balance: 50000 } },
    },
  });

  const tenant = await prisma.user.upsert({
    where: { phone: '0712345678' },
    update: {},
    create: {
      name: 'Demo User',
      phone: '0712345678',
      email: 'demo@hpesa.com',
      password,
      pin,
      role: 'TENANT',
      wallet: { create: { balance: 25000 } },
    },
  });

  // Safe to run on every start: only create the demo property, tenancy and products once.
  let property = await prisma.property.findFirst({ where: { name: 'Greenview Apartments', landlordId: landlord.id }, include: { units: true } });
  if (!property) {
    property = await prisma.property.create({
      data: {
        name: 'Greenview Apartments',
        location: 'Kilimani, Nairobi',
        landlordId: landlord.id,
        units: {
          create: [
            { unitNumber: 'A1', rentAmount: 25000, status: 'OCCUPIED' },
            { unitNumber: 'A2', rentAmount: 22000, status: 'VACANT' },
          ],
        },
      },
      include: { units: true },
    });
  }

  const hasTenancy = await prisma.tenancy.findUnique({ where: { unitId: property.units[0].id } });
  if (!hasTenancy) {
    await prisma.tenancy.create({ data: { unitId: property.units[0].id, tenantId: tenant.id } });
  }

  if ((await prisma.product.count()) === 0) {
    const products = [
      { name: 'Unga wa Ngano 2kg', price: 180, category: 'Groceries' },
      { name: 'Sukari 2kg', price: 250, category: 'Groceries' },
      { name: 'Mafuta ya Kupikia 1L', price: 320, category: 'Groceries' },
      { name: 'Chai Leaves 500g', price: 150, category: 'Groceries' },
      { name: 'Kahawa 200g', price: 280, category: 'Groceries' },
      { name: 'Maziwa 500ml', price: 60, category: 'Groceries' },
      { name: 'Soap Bar', price: 80, category: 'Household' },
      { name: 'Detergent 1kg', price: 200, category: 'Household' },
      { name: 'Beauty Cream', price: 450, category: 'Beauty' },
      { name: 'Cooking Pot', price: 1200, category: 'Utensils' },
    ];
    for (const p of products) await prisma.product.create({ data: p });
  }

  // Merchant accounts + API keys for the partner apps.
  // Set HFLEET_API_KEY / HHOMES_API_KEY / HMART_API_KEY in the environment to keep the keys
  // stable across redeploys; otherwise a key is generated and printed once below.
  const clients = [
    { name: 'H-Fleet', env: 'HFLEET_API_KEY', phone: '0700000101', email: 'merchant@hfleet.app', allowRecipients: false },
    { name: 'H-Homes', env: 'HHOMES_API_KEY', phone: '0700000102', email: 'merchant@hhomes.app', allowRecipients: true },
    { name: 'H-Mart', env: 'HMART_API_KEY', phone: '0700000103', email: 'merchant@hmart.app', allowRecipients: false },
  ];
  const unusable = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
  for (const c of clients) {
    const merchant = await prisma.user.upsert({
      where: { phone: c.phone },
      update: {},
      create: {
        name: `${c.name} Merchant`, phone: c.phone, email: c.email,
        password: unusable, pin: unusable, role: 'MERCHANT',
        wallet: { create: { balance: 0 } },
      },
    });
    const existing = await prisma.serviceClient.findUnique({ where: { name: c.name } });
    const given = process.env[c.env];
    if (!existing) {
      const key = given || `hpk_${crypto.randomBytes(24).toString('hex')}`;
      await prisma.serviceClient.create({
        data: { name: c.name, keyHash: sha256(key), merchantUserId: merchant.id, allowRecipients: c.allowRecipients },
      });
      if (!given) console.log(`>>> ${c.name} API key (shown once, copy it now): ${key}`);
    } else if (given && existing.keyHash !== sha256(given)) {
      await prisma.serviceClient.update({ where: { name: c.name }, data: { keyHash: sha256(given) } });
    }
  }

  console.log('Seed complete: demo users, property, products, merchant accounts');
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
