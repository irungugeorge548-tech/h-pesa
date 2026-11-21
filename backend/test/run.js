// Offline test: runs the real Express app and routes against an in-memory database.
// (No Prisma engine or network needed.)  Usage: node test/run.js
const path = require('path');
const Module = require('module');
const { createFakePrisma } = require('./fakePrisma');

process.env.DISABLE_SCHEDULER = '1';
process.env.REQUIRE_TERMS = '0';
process.env.DISABLE_RATE_LIMIT = '1';
process.env.PIN_RESET_HOURS = '0';
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

  // ---- v6 features ----
  const call = async (method, path, { token, body, headers } = {}) => {
    const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(headers || {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, data: await r.json().catch(() => ({})) };
  };
  let v6 = 0;
  const ok6 = (name, cond, extra) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`); if (!cond) { v6++; if (extra !== undefined) console.log('       ', JSON.stringify(extra)); } };
  console.log('Usernames, terms, wallets per phone');
  const s6 = String(Date.now()).slice(-6);
  process.env.REQUIRE_TERMS = '1';
  let r = await call('POST', '/api/auth/register', { body: { name: 'Titus Nirungu', phone: `0701${s6}`, email: `t${s6}@t.app`, password: 'password123', pin: '1234' } });
  ok6('registering without accepting the terms is refused', r.status === 400 && /Terms/.test(r.data.error), r);
  const dev = 'device-' + s6 + '-abcdefghij';
  r = await call('POST', '/api/auth/register', { body: { name: 'Titus Nirungu', phone: `0701${s6}`, email: `t${s6}@t.app`, password: 'password123', pin: '1234', acceptTerms: true, deviceId: dev } });
  ok6('register gives a username built from the name (e.g. tnirungu27)', r.status === 200 && /^tnirungu\d{2,3}$/.test(r.data.user.username), r);
  const t1 = r.data.token, uname = r.data.user?.username, phoneA = `0701${s6}`;
  r = await call('POST', '/api/auth/register', { body: { name: 'Titus Nirungu', phone: `0702${s6}`, email: `t${s6}@t.app`, password: 'password123', pin: '1234', acceptTerms: true, deviceId: dev } });
  ok6('a second wallet cannot reuse the same email', r.status === 400 && /email/i.test(r.data.error), r);
  for (const n of [2, 3]) r = await call('POST', '/api/auth/register', { body: { name: 'Titus Nirungu', phone: `070${n}${s6}`, email: `t${n}${s6}@t.app`, password: 'password123', pin: '1234', acceptTerms: true, deviceId: dev } });
  ok6('wallet 3 on the same phone is allowed and gets its own username', r.status === 200 && r.data.user.username !== uname, r);
  r = await call('POST', '/api/auth/register', { body: { name: 'Titus Nirungu', phone: `0704${s6}`, email: `t4${s6}@t.app`, password: 'password123', pin: '1234', acceptTerms: true, deviceId: dev } });
  ok6('a 4th wallet on the same phone is refused', r.status === 403, r);
  process.env.REQUIRE_TERMS = '0';
  r = await call('POST', '/api/auth/login', { body: { phone: `@${uname}`, password: 'password123' } });
  ok6('login also works with the @username', r.status === 200, r);
  r = await call('GET', `/api/account/lookup/${uname}`, { token: t1 });
  ok6('username lookup shows the owner', r.status === 200 && r.data.name === 'Titus Nirungu', r);

  console.log('Send by username');
  const friend = await call('POST', '/api/auth/register', { body: { name: 'Mary Wanjiku', phone: `0705${s6}`, email: `m${s6}@t.app`, password: 'password123', pin: '4321' } });
  r = await call('POST', '/api/transactions/send', { token: t1, body: { phone: `@${friend.data.user.username}`, amount: 250, pin: '1234' } });
  const fb = await call('GET', '/api/wallet/balance', { token: friend.data.token });
  ok6('money sent to @username arrives', r.status === 200 && fb.data.balance === 10250, [r, fb.data]);
  r = await call('POST', '/api/transactions/send', { token: t1, body: { phone: '@nobodyhere99', amount: 10, pin: '1234' } });
  ok6('unknown username is refused', r.status === 404, r);

  console.log('Lock screen PIN, photo, support');
  r = await call('POST', '/api/account/verify-pin', { token: t1, body: { pin: '1234' } });
  ok6('lock screen accepts the right PIN', r.status === 200 && r.data.ok, r);
  r = await call('POST', '/api/account/verify-pin', { token: t1, body: { pin: '0000' } });
  ok6('...and refuses a wrong one', r.status === 400, r);
  const tiny = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  r = await call('PATCH', '/api/account/photo', { token: t1, body: { photo: tiny } });
  ok6('profile photo can be set', r.status === 200 && !!r.data.photo, r);
  r = await call('PATCH', '/api/account/photo', { token: t1, body: { photo: 'http://evil.example/x.js' } });
  ok6('a non-image "photo" is refused', r.status === 400, r);
  r = await call('POST', '/api/support', { token: t1, body: { subject: 'Help', message: 'I need help with my wallet' } });
  ok6('support message is saved', r.status === 200, r);

  console.log('Forgot password and forgot PIN');
  r = await call('POST', '/api/auth/forgot-password', { body: { phone: phoneA, email: `t${s6}@t.app`, pin: '9999', newPassword: 'brandnew1' } });
  ok6('forgot password with the wrong PIN is refused', r.status === 400, r);
  r = await call('POST', '/api/auth/forgot-password', { body: { phone: phoneA, email: `t${s6}@t.app`, pin: '1234', newPassword: 'brandnew1' } });
  ok6('forgot password with phone + email + PIN works', r.status === 200, r);
  r = await call('POST', '/api/auth/login', { body: { phone: phoneA, password: 'brandnew1' } });
  ok6('...and the new password logs in', r.status === 200, r);
  r = await call('POST', '/api/auth/forgot-pin', { body: { phone: phoneA, email: `t${s6}@t.app`, password: 'wrong-one', newPin: '2468' } });
  ok6('forgot PIN needs the password', r.status === 400, r);
  r = await call('POST', '/api/auth/forgot-pin', { body: { phone: phoneA, email: `t${s6}@t.app`, password: 'brandnew1', newPin: '2468' } });
  ok6('forgot PIN is accepted', r.status === 200, r);
  r = await call('POST', '/api/account/verify-pin', { token: t1, body: { pin: '1234' } });
  ok6('using the OLD PIN cancels the reset (owner protected)', r.status === 200, r);
  r = await call('POST', '/api/account/verify-pin', { token: t1, body: { pin: '2468' } });
  ok6('...so the requested new PIN no longer works', r.status === 400, r);
  await call('POST', '/api/auth/forgot-pin', { body: { phone: phoneA, email: `t${s6}@t.app`, password: 'brandnew1', newPin: '2468' } });
  r = await call('POST', '/api/account/verify-pin', { token: t1, body: { pin: '2468' } });
  ok6('with no old-PIN use, the new PIN activates after the wait', r.status === 200, r);

  console.log('Attack protection');
  r = await fetch(base + '/api/health');
  ok6('security headers are set', r.headers.get('x-content-type-options') === 'nosniff' && r.headers.get('x-frame-options') === 'DENY' && !r.headers.get('x-powered-by'));
  const sec = require('../src/lib/security');
  let blocked = 0;
  for (let i = 0; i < 6; i++) { const x = await call('POST', '/api/auth/login', { body: { phone: `0799${s6}`, password: 'nope-nope' } }); if (x.status === 429) blocked++; }
  ok6('5 wrong logins lock the account for 15 minutes', blocked >= 1);
  sec.resetLoginLocks();
  process.env.DISABLE_RATE_LIMIT = '0';
  let limited = 0;
  for (let i = 0; i < 25; i++) { const x = await call('POST', '/api/auth/login', { body: { phone: `0798${s6}`, password: 'nope-nope-' + i } }); if (x.status === 429) limited++; }
  ok6('a flood of login attempts from one address is rate-limited', limited >= 1);
  process.env.DISABLE_RATE_LIMIT = '1'; sec.resetLoginLocks();

  server.close();
  const bad = failed + v6 + (raceOk ? 0 : 1) + (dupOk ? 0 : 1);
  console.log(bad ? `\n${bad} problem(s)` : '\nALL GOOD');
  process.exit(bad ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
