// End-to-end check of the H-Pesa API. Works against any running server:
//   BASE_URL=http://localhost:5000 HFLEET_API_KEY=hpk_... HHOMES_API_KEY=hpk_... node scripts/smoke.js
// It creates fresh throw-away users each run, so it is safe to repeat.
// The same checks are used by test/run.js against an in-memory database.

async function run(base, keys, log = console.log) {
  let passed = 0;
  let failed = 0;
  const check = (name, cond, extra) => {
    if (cond) { passed++; log(`  ok   ${name}`); }
    else { failed++; log(`  FAIL ${name}${extra !== undefined ? ' -> ' + JSON.stringify(extra) : ''}`); }
  };
  const call = async (method, path, { token, key, cron, body } = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (key) headers['x-api-key'] = key;
    if (cron) headers['x-cron-secret'] = cron;
    const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    let data = null;
    try { data = await res.json(); } catch { /* empty */ }
    return { status: res.status, data };
  };

  const stamp = String(Date.now()).slice(-7);
  const mk = async (tag, n) => {
    const phone = `07${n}${stamp}`.slice(0, 10);
    const r = await call('POST', '/api/auth/register', {
      body: { name: `${tag} Tester`, phone, email: `${tag}${stamp}@test.app`, password: 'password123', pin: '1234' },
    });
    return { phone, token: r.data && r.data.token, balance: r.data && r.data.balance, status: r.status };
  };
  const bal = async (u) => (await call('GET', '/api/wallet/balance', { token: u.token })).data.balance;

  log('Health & accounts');
  const h = await call('GET', '/api/health');
  check('health responds', h.status === 200, h);
  const A = await mk('Amina', 1);
  const B = await mk('Brian', 2);
  const C = await mk('Chebet', 3);
  check('register works', !!(A.token && B.token && C.token), [A.status, B.status, C.status]);
  check('new wallet has starting balance', A.balance === 10000, A.balance);

  log('Original features still work');
  let r = await call('POST', '/api/transactions/send', { token: A.token, body: { phone: B.phone, amount: 100, pin: '1234' } });
  check('send money', r.status === 200, r);
  check('sender debited', (await bal(A)) === 9900);
  check('recipient credited', (await bal(B)) === 10100);
  r = await call('POST', '/api/transactions/send', { token: A.token, body: { phone: B.phone, amount: 100, pin: '9999' } });
  check('wrong PIN refused on send', r.status >= 400, r);

  if (keys.hfleet) {
    log('Merchant API (H-Fleet)');
    const ref = `ride-${stamp}`;
    r = await call('POST', '/api/merchant/charge', { key: 'wrong-key', body: {} });
    check('bad API key rejected', r.status === 401, r);
    r = await call('POST', '/api/merchant/charge', { key: keys.hfleet, body: { phone: A.phone, pin: '1234', amount: 350, reference: ref, description: 'Ride' } });
    check('charge succeeds', r.status === 200 && r.data.status === 'COMPLETED', r);
    check('charge earns points', r.data && r.data.pointsEarned === 35, r.data);
    const afterCharge = await bal(A);
    check('wallet debited by charge', afterCharge === 9550, afterCharge);
    r = await call('POST', '/api/merchant/charge', { key: keys.hfleet, body: { phone: A.phone, pin: '1234', amount: 350, reference: ref } });
    check('same reference is not charged twice', r.status === 200 && r.data.duplicate === true, r);
    check('balance unchanged after retry', (await bal(A)) === 9550);
    r = await call('GET', `/api/merchant/status/${ref}`, { key: keys.hfleet });
    check('status reports COMPLETED', r.data && r.data.status === 'COMPLETED', r.data);
    r = await call('POST', '/api/merchant/charge', { key: keys.hfleet, body: { phone: A.phone, pin: '0000', amount: 50, reference: `bad-${stamp}` } });
    check('wrong PIN refused on charge', r.status === 400, r);
    r = await call('POST', '/api/merchant/charge', { key: keys.hfleet, body: { phone: A.phone, pin: '1234', amount: 99999999, reference: `big-${stamp}` } });
    check('too-large amount refused', r.status === 400, r);
    r = await call('POST', '/api/merchant/charge', { key: keys.hfleet, body: { phone: A.phone, pin: '1234', amount: 50, reference: `to-${stamp}`, toPhone: B.phone } });
    check('H-Fleet may not pay a person directly', r.status === 403, r);
    r = await call('POST', '/api/merchant/refund', { key: keys.hfleet, body: { reference: ref, reason: 'Test' } });
    check('refund succeeds', r.status === 200 && r.data.status === 'REFUNDED', r);
    check('refund restores balance', (await bal(A)) === 9900);
    r = await call('POST', '/api/merchant/refund', { key: keys.hfleet, body: { reference: ref } });
    check('refund is idempotent', r.status === 200 && r.data.duplicate === true, r);
    check('balance not refunded twice', (await bal(A)) === 9900);
    r = await call('GET', '/api/rewards', { token: A.token });
    check('refund took back the points', r.data && r.data.points === 0, r.data);
    r = await call('POST', '/api/merchant/refund', { key: keys.hfleet, body: { reference: 'does-not-exist' } });
    check('refund of unknown charge is 404', r.status === 404, r);

    log('Rewards');
    // earn 150 points: charge 1500
    r = await call('POST', '/api/merchant/charge', { key: keys.hfleet, body: { phone: A.phone, pin: '1234', amount: 1500, reference: `big-ride-${stamp}` } });
    check('large charge ok', r.status === 200, r);
    r = await call('GET', '/api/rewards', { token: A.token });
    check('points balance is 150', r.data && r.data.points === 150, r.data);
    r = await call('POST', '/api/rewards/redeem', { token: A.token, body: { points: 50, pin: '1234' } });
    check('cannot redeem below minimum', r.status === 400, r);
    const before = await bal(A);
    r = await call('POST', '/api/rewards/redeem', { token: A.token, body: { points: 100, pin: '1234' } });
    check('redeem works', r.status === 200, r);
    check('redeem adds KES 10', Math.abs((await bal(A)) - before - 10) < 0.001);
    r = await call('POST', '/api/rewards/redeem', { token: A.token, body: { points: 100, pin: '1234' } });
    check('cannot redeem more than owned', r.status === 400, r);
    r = await call('POST', '/api/merchant/reward', { key: keys.hfleet, body: { phone: A.phone, points: 20, reference: `bonus-${stamp}`, reason: 'Bonus' } });
    check('bonus points awarded', r.status === 200 && r.data.awarded === true, r);
    r = await call('POST', '/api/merchant/reward', { key: keys.hfleet, body: { phone: A.phone, points: 20, reference: `bonus-${stamp}` } });
    check('same bonus not awarded twice', r.data && r.data.awarded === false, r);

    log('One account (SSO)');
    r = await call('POST', '/api/sso/verify', { key: keys.hfleet, body: { token: A.token } });
    check('valid token verifies', r.data && r.data.valid === true && r.data.user.phone === A.phone, r);
    check('no password data leaked', r.data && r.data.user && !('password' in r.data.user) && !('pin' in r.data.user));
    r = await call('POST', '/api/sso/verify', { key: keys.hfleet, body: { token: 'garbage' } });
    check('bad token is invalid', r.data && r.data.valid === false, r);
    r = await call('POST', '/api/sso/verify', { key: 'nope', body: { token: A.token } });
    check('SSO needs API key', r.status === 401, r);
  }

  if (keys.hhomes) {
    log('Merchant API (H-Homes pays a landlord)');
    r = await call('POST', '/api/merchant/charge', { key: keys.hhomes, body: { phone: B.phone, pin: '1234', amount: 500, reference: `rent-${stamp}`, toPhone: C.phone, description: 'Rent' } });
    check('rent paid to landlord', r.status === 200, r);
    check('landlord received rent', (await bal(C)) === 10500);
    r = await call('POST', '/api/merchant/charge', { key: keys.hhomes, body: { phone: B.phone, pin: '1234', amount: 500, reference: `rent2-${stamp}`, toPhone: '0799999999' } });
    check('unknown landlord refused', r.status === 404, r);
  }

  log('Payment requests / links');
  r = await call('POST', '/api/requests', { token: C.token, body: { amount: 200, note: 'Lunch' } });
  check('create request', r.status === 200 && r.data.code, r);
  const code = r.data && r.data.code;
  r = await call('GET', `/api/requests/public/${code}`);
  check('public preview works without login', r.status === 200 && r.data.amount === 200, r);
  check('preview shows first name only', r.data && r.data.requesterName === 'Chebet', r.data);
  r = await call('POST', `/api/requests/${code}/pay`, { token: C.token, body: { pin: '1234' } });
  check('cannot pay own request', r.status === 400, r);
  r = await call('POST', `/api/requests/${code}/pay`, { token: B.token, body: { pin: '1234' } });
  check('pay request', r.status === 200, r);
  r = await call('POST', `/api/requests/${code}/pay`, { token: A.token, body: { pin: '1234' } });
  check('one-time request cannot be paid twice', r.status === 400, r);
  r = await call('POST', '/api/requests', { token: C.token, body: { reusable: true, note: 'Donations' } });
  const link = r.data && r.data.code;
  r = await call('POST', `/api/requests/${link}/pay`, { token: A.token, body: { pin: '1234', amount: 30 } });
  check('reusable link accepts any amount', r.status === 200, r);
  r = await call('POST', `/api/requests/${link}/pay`, { token: B.token, body: { pin: '1234', amount: 40 } });
  check('reusable link accepts several payers', r.status === 200, r);
  r = await call('POST', `/api/requests/${link}/pay`, { token: B.token, body: { pin: '1234' } });
  check('open-amount link needs an amount', r.status === 400, r);

  log('Chama (rotating savings)');
  r = await call('POST', '/api/chama', { token: A.token, body: { name: 'Test Chama', contributionAmount: 1000, frequency: 'MONTHLY' } });
  check('create chama', r.status === 200 && r.data.code, r);
  const chama = r.data;
  r = await call('POST', '/api/chama/join', { token: B.token, body: { code: chama.code.toLowerCase() } });
  check('join with code', r.status === 200, r);
  r = await call('POST', '/api/chama/join', { token: B.token, body: { code: chama.code } });
  check('cannot join twice', r.status === 400, r);
  r = await call('POST', '/api/chama/join', { token: C.token, body: { code: chama.code } });
  check('third member joins', r.status === 200, r);
  r = await call('POST', `/api/chama/${chama.id}/payout`, { token: A.token, body: { pin: '1234' } });
  check('payout refused before everyone paid', r.status >= 400, r);
  const aBefore = await bal(A);
  r = await call('POST', `/api/chama/${chama.id}/contribute`, { token: A.token, body: { pin: '1234' } });
  check('member A contributes', r.status === 200, r);
  r = await call('POST', `/api/chama/${chama.id}/contribute`, { token: A.token, body: { pin: '1234' } });
  check('cannot contribute twice in a cycle', r.status >= 400, r);
  check('contribution debited', (await bal(A)) === aBefore - 1000);
  r = await call('POST', `/api/chama/${chama.id}/contribute`, { token: B.token, body: { pin: '1234' } });
  check('member B contributes', r.status === 200, r);
  r = await call('POST', `/api/chama/${chama.id}/payout`, { token: A.token, body: { pin: '1234' } });
  check('payout refused with one missing', r.status >= 400, r);
  r = await call('POST', `/api/chama/${chama.id}/contribute`, { token: C.token, body: { pin: '1234' } });
  check('member C contributes', r.status === 200, r);
  r = await call('POST', `/api/chama/${chama.id}/payout`, { token: B.token, body: { pin: '1234' } });
  check('only the creator releases payout', r.status >= 400, r);
  const aMid = await bal(A);
  r = await call('POST', `/api/chama/${chama.id}/payout`, { token: A.token, body: { pin: '1234' } });
  check('creator releases payout', r.status === 200 && r.data.amount === 3000, r);
  check('member #1 (A) received the pot', (await bal(A)) === aMid + 3000);
  r = await call('GET', `/api/chama/${chama.id}`, { token: A.token });
  check('cycle moved to 2', r.data && r.data.currentCycle === 2 && r.data.balance === 0, r.data);
  r = await call('GET', `/api/chama/${chama.id}`, { token: (await mk('Outsider', 4)).token });
  check('outsiders cannot view a chama', r.status === 403, r);
  r = await call('POST', '/api/chama/join', { token: (await mk('Late', 5)).token, body: { code: chama.code } });
  check('started chama is closed to new members', r.status === 400, r);

  log('Scheduled payments');
  r = await call('POST', '/api/scheduled', { token: A.token, body: { kind: 'SEND', recipientPhone: B.phone, amount: 75, frequency: 'WEEKLY', pin: '0000' } });
  check('wrong PIN refused', r.status === 400, r);
  const soon = new Date(Date.now() + 1500).toISOString();
  r = await call('POST', '/api/scheduled', { token: A.token, body: { kind: 'SEND', recipientPhone: B.phone, amount: 75, frequency: 'WEEKLY', pin: '1234', startDate: soon } });
  // A start date in the near future is accepted as given only when it is later than now
  check('create automatic payment', r.status === 200, r);
  const sched = r.data;
  r = await call('POST', '/api/scheduled', { token: A.token, body: { kind: 'SEND', recipientPhone: A.phone, amount: 75, frequency: 'WEEKLY', pin: '1234' } });
  check('cannot schedule to yourself', r.status === 400, r);
  r = await call('POST', '/api/scheduled', { token: A.token, body: { kind: 'SEND', recipientPhone: B.phone, amount: 999999, frequency: 'WEEKLY', pin: '1234' } });
  check('amount cap enforced', r.status === 400, r);
  r = await call('GET', '/api/scheduled', { token: A.token });
  check('list shows it with a label', r.status === 200 && r.data.some((p) => p.id === sched.id && /Brian/.test(p.label)), r.data);
  if (keys.cron) {
    await new Promise((res) => setTimeout(res, 1700));
    const aPre = await bal(A);
    r = await call('POST', '/api/scheduled/run', { cron: 'wrong' });
    check('run endpoint needs the secret', r.status === 401, r);
    r = await call('POST', '/api/scheduled/run', { cron: keys.cron });
    check('due payment runs', r.status === 200 && r.data.ran >= 1, r);
    check('automatic payment debited', (await bal(A)) === aPre - 75);
    r = await call('POST', '/api/scheduled/run', { cron: keys.cron });
    check('does not run twice for the same date', r.data && r.data.ran === 0, r.data);
  }
  r = await call('DELETE', `/api/scheduled/${sched.id}`, { token: A.token });
  check('stop automatic payment', r.status === 200, r);
  r = await call('DELETE', `/api/scheduled/${sched.id}`, { token: B.token });
  check('cannot stop someone else\'s', r.status === 404, r);

  log('History');
  r = await call('GET', '/api/transactions/history', { token: A.token });
  check('history loads', r.status === 200, r.status);

  log(`\n${passed} passed, ${failed} failed`);
  return { passed, failed };
}

module.exports = { run };

if (require.main === module) {
  const base = (process.env.BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
  run(base, {
    hfleet: process.env.HFLEET_API_KEY,
    hhomes: process.env.HHOMES_API_KEY,
    cron: process.env.CRON_SECRET,
  }).then(({ failed }) => process.exit(failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}
