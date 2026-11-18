// Offline test: runs the real Express app and routes against an in-memory database.
// (No Prisma engine or network needed.)  Usage: node test/run.js
const path = require('path');
const Module = require('module');
const { createFakePrisma } = require('./fakePrisma');

process.env.DISABLE_SCHEDULER = '1';
process.env.CRON_SECRET = 'test-cron';
process.env.HFLEET_API_KEY = 'hpk_test_fleet';
process.env.HHOMES_API_KEY = 'hpk_test_homes';
process.env.HMART_API_KEY = 'hpk_test_mart';

// Every `new PrismaClient()` in the project shares one fake database.
const fake = createFakePrisma();
const realLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === '@prisma/client') return { PrismaClient: function PrismaClient() { return fake; } };
  return realLoad.call(this, request, ...rest);
};

async function main() {
  // seed through the same fake (keys come from the env above)
  const seedPath = path.join(__dirname, '..', 'prisma', 'seed.js');
  require(seedPath);
  await new Promise((r) => setTimeout(r, 400));

  const app = require('../src/index.js');
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const { run } = require('../scripts/smoke.js');
  const { failed } = await run(base, { hfleet: process.env.HFLEET_API_KEY, hhomes: process.env.HHOMES_API_KEY, cron: process.env.CRON_SECRET });

  // concurrency: 5 simultaneous charges of 3000 against a wallet that can afford only 3
  console.log('Race safety');
  const stamp = String(Date.now()).slice(-6);
  const phone = `0733${stamp}`;
  const reg = await (await fetch(`${base}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Racer', phone, email: `r${stamp}@t.app`, password: 'password123', pin: '1234' }) })).json();
  const results = await Promise.all(Array.from({ length: 5 }, (_, i) => fetch(`${base}/api/merchant/charge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.HFLEET_API_KEY },
    body: JSON.stringify({ phone, pin: '1234', amount: 3000, reference: `race-${stamp}-${i}` }),
  }).then((r) => r.status)));
  const ok = results.filter((s) => s === 200).length;
  const w = await (await fetch(`${base}/api/wallet/balance`, { headers: { Authorization: `Bearer ${reg.token}` } })).json();
  const raceOk = ok === 3 && w.balance === 1000;
  console.log(`  ${raceOk ? 'ok  ' : 'FAIL'} ${ok} of 5 charges succeeded, balance ${w.balance} (expected 3 and 1000)`);

  // same reference sent 5 times at once is charged once
  const dupPhone = `0734${stamp}`;
  const reg2 = await (await fetch(`${base}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Dup', phone: dupPhone, email: `d${stamp}@t.app`, password: 'password123', pin: '1234' }) })).json();
  await Promise.all(Array.from({ length: 5 }, () => fetch(`${base}/api/merchant/charge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.HFLEET_API_KEY },
    body: JSON.stringify({ phone: dupPhone, pin: '1234', amount: 100, reference: `dup-${stamp}` }),
  })));
  const w2 = await (await fetch(`${base}/api/wallet/balance`, { headers: { Authorization: `Bearer ${reg2.token}` } })).json();
  const dupOk = w2.balance === 9900;
  console.log(`  ${dupOk ? 'ok  ' : 'FAIL'} same reference x5 charged once, balance ${w2.balance} (expected 9900)`);

  server.close();
  const bad = failed + (raceOk ? 0 : 1) + (dupOk ? 0 : 1);
  console.log(bad ? `\n${bad} problem(s)` : '\nALL GOOD');
  process.exit(bad ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
