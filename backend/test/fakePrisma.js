// A small in-memory stand-in for PrismaClient, used ONLY by the offline tests.
// It supports just the calls this project makes, models unique constraints, nested
// creates, `increment`/`decrement`, and $transaction with rollback on error. Writes
// inside a $transaction are serialised (like SQLite), so race tests are meaningful.
const crypto = require('crypto');

const cuid = () => 'c' + crypto.randomBytes(12).toString('hex');
const now = () => new Date();

const MODELS = {
  user: {
    uniques: [['id'], ['phone'], ['email'], ['username']],
    defaults: () => ({ id: cuid(), role: 'TENANT', createdAt: now(), updatedAt: now() }),
    rels: { wallet: { model: 'wallet', foreign: 'userId', many: false } },
  },
  wallet: { uniques: [['id'], ['userId']], defaults: () => ({ id: cuid(), balance: 10000, createdAt: now(), updatedAt: now() }) },
  transaction: {
    uniques: [['id'], ['reference'], ['serviceClientId', 'externalRef']],
    defaults: () => ({ id: cuid(), reference: cuid(), fee: 0, status: 'COMPLETED', description: null, recipientId: null, externalRef: null, serviceClientId: null, createdAt: now() }),
  },
  serviceClient: { uniques: [['id'], ['name'], ['keyHash']], defaults: () => ({ id: cuid(), allowRecipients: false, active: true, createdAt: now() }) },
  chama: { uniques: [['id'], ['code']], defaults: () => ({ id: cuid(), frequency: 'MONTHLY', balance: 0, currentCycle: 1, status: 'FORMING', createdAt: now() }) },
  chamaMember: { uniques: [['id'], ['chamaId', 'userId']], defaults: () => ({ id: cuid(), joinedAt: now() }) },
  chamaEntry: { uniques: [['id'], ['chamaId', 'userId', 'type', 'cycle']], defaults: () => ({ id: cuid(), createdAt: now() }) },
  paymentRequest: { uniques: [['id'], ['code']], defaults: () => ({ id: cuid(), amount: null, note: null, reusable: false, status: 'OPEN', paidById: null, paidAt: null, createdAt: now() }) },
  scheduledPayment: { uniques: [['id']], defaults: () => ({ id: cuid(), kind: 'SEND', recipientPhone: null, chamaId: null, note: null, lastRunAt: null, lastStatus: null, failCount: 0, active: true, createdAt: now() }) },
  rewardEntry: { uniques: [['id'], ['source', 'externalRef']], defaults: () => ({ id: cuid(), externalRef: null, createdAt: now() }) },
  property: {
    uniques: [['id']],
    defaults: () => ({ id: cuid(), description: null, createdAt: now() }),
    rels: { units: { model: 'unit', foreign: 'propertyId', many: true } },
  },
  unit: { uniques: [['id']], defaults: () => ({ id: cuid(), status: 'VACANT', createdAt: now() }) },
  tenancy: { uniques: [['id'], ['unitId']], defaults: () => ({ id: cuid(), startDate: now(), dueDay: 5, createdAt: now() }) },
  supportMessage: { uniques: [['id']], defaults: () => ({ id: cuid(), createdAt: now() }) },
  auditLog: { uniques: [['id']], defaults: () => ({ id: cuid(), userId: null, ip: null, detail: null, createdAt: now() }) },
  product: { uniques: [['id']], defaults: () => ({ id: cuid(), description: null, image: null, stock: 100, createdAt: now() }) },
};

const isDate = (v) => v instanceof Date;
const eq = (a, b) => (isDate(a) && isDate(b) ? a.getTime() === b.getTime() : a === b);
const num = (v) => (isDate(v) ? v.getTime() : v);

function matches(row, where) {
  if (!where) return true;
  for (const [k, v] of Object.entries(where)) {
    if (k === 'OR') { if (!v.some((w) => matches(row, w))) return false; continue; }
    if (k === 'AND') { if (!v.every((w) => matches(row, w))) return false; continue; }
    const val = row[k] === undefined ? null : row[k];
    if (v !== null && typeof v === 'object' && !isDate(v)) {
      for (const [op, x] of Object.entries(v)) {
        if (op === 'equals') { if (!eq(val, x)) return false; }
        else if (op === 'in') { if (!x.some((y) => eq(val, y))) return false; }
        else if (op === 'not') { if (eq(val, x)) return false; }
        else if (op === 'gte') { if (val === null || num(val) < num(x)) return false; }
        else if (op === 'gt') { if (val === null || num(val) <= num(x)) return false; }
        else if (op === 'lte') { if (val === null || num(val) > num(x)) return false; }
        else if (op === 'lt') { if (val === null || num(val) >= num(x)) return false; }
        else throw new Error(`fake prisma: unsupported operator ${op}`);
      }
    } else if (!eq(val, v === undefined ? null : v)) return false;
  }
  return true;
}

function applyData(row, data) {
  for (const [k, v] of Object.entries(data)) {
    if (v !== null && typeof v === 'object' && !isDate(v) && ('increment' in v || 'decrement' in v || 'set' in v)) {
      if ('increment' in v) row[k] = (row[k] || 0) + v.increment;
      else if ('decrement' in v) row[k] = (row[k] || 0) - v.decrement;
      else row[k] = v.set;
    } else row[k] = v === undefined ? row[k] : v;
  }
  row.updatedAt = row.updatedAt ? now() : row.updatedAt;
}

function uniqueError() {
  return Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
}

function createFakePrisma() {
  const state = { tables: {}, lock: Promise.resolve() };
  for (const name of Object.keys(MODELS)) state.tables[name] = [];

  function checkUnique(model, row, ignore) {
    for (const tuple of MODELS[model].uniques) {
      if (tuple.some((f) => row[f] === null || row[f] === undefined)) continue;
      const clash = state.tables[model].some((r) => r !== ignore && tuple.every((f) => eq(r[f], row[f])));
      if (clash) throw uniqueError();
    }
  }

  function withInclude(model, row, include) {
    const out = structuredClone(row);
    if (include && MODELS[model].rels) {
      for (const [k, on] of Object.entries(include)) {
        if (!on) continue;
        const rel = MODELS[model].rels[k];
        if (!rel) throw new Error(`fake prisma: unknown include ${k}`);
        const kids = state.tables[rel.model].filter((r) => eq(r[rel.foreign], row.id));
        out[k] = rel.many ? structuredClone(kids) : (kids[0] ? structuredClone(kids[0]) : null);
      }
    }
    return out;
  }

  function makeClient(inTx) {
    const wait = async () => { if (!inTx) await state.lock; };
    const client = {};

    function create(model, data, depth = 0) {
      const spec = MODELS[model];
      const nested = {};
      const plain = {};
      for (const [k, v] of Object.entries(data)) {
        if (spec.rels && spec.rels[k]) nested[k] = v; else plain[k] = v;
      }
      const row = { ...spec.defaults(), ...plain };
      checkUnique(model, row);
      state.tables[model].push(row);
      for (const [k, v] of Object.entries(nested)) {
        const rel = spec.rels[k];
        const items = Array.isArray(v.create) ? v.create : [v.create];
        for (const item of items) create(rel.model, { ...item, [rel.foreign]: row.id }, depth + 1);
      }
      return row;
    }

    for (const model of Object.keys(MODELS)) {
      client[model] = {
        async findUnique({ where, include }) {
          await wait();
          const row = state.tables[model].find((r) => matches(r, where));
          return row ? withInclude(model, row, include) : null;
        },
        async findFirst({ where, include, orderBy } = {}) {
          await wait();
          let rows = state.tables[model].filter((r) => matches(r, where));
          if (orderBy) {
            const [[f, dir]] = Object.entries(orderBy);
            rows = rows.map((r, i) => [r, i]).sort((a, b) => (num(a[0][f]) - num(b[0][f]) || a[1] - b[1]) * (dir === 'desc' ? -1 : 1)).map((x) => x[0]);
          }
          return rows[0] ? withInclude(model, rows[0], include) : null;
        },
        async findMany({ where, include, orderBy, take } = {}) {
          await wait();
          let rows = state.tables[model].filter((r) => matches(r, where)).map((r, i) => [r, i]);
          if (orderBy) {
            const [[f, dir]] = Object.entries(orderBy);
            rows.sort((a, b) => (num(a[0][f]) - num(b[0][f]) || a[1] - b[1]) * (dir === 'desc' ? -1 : 1));
          }
          rows = rows.map((x) => x[0]);
          if (take) rows = rows.slice(0, take);
          return rows.map((r) => withInclude(model, r, include));
        },
        async count({ where } = {}) {
          await wait();
          return state.tables[model].filter((r) => matches(r, where)).length;
        },
        async create({ data, include }) {
          await wait();
          // a failed nested create must not leave half a record behind
          const snap = structuredClone(state.tables);
          try {
            const row = create(model, data);
            return withInclude(model, row, include);
          } catch (e) { state.tables = snap; throw e; }
        },
        async update({ where, data }) {
          await wait();
          const row = state.tables[model].find((r) => matches(r, where));
          if (!row) throw Object.assign(new Error('Record to update not found'), { code: 'P2025' });
          const copy = { ...row };
          applyData(copy, data);
          checkUnique(model, copy, row);
          Object.assign(row, copy);
          return structuredClone(row);
        },
        async updateMany({ where, data }) {
          await wait();
          const rows = state.tables[model].filter((r) => matches(r, where));
          for (const row of rows) {
            const copy = { ...row };
            applyData(copy, data);
            checkUnique(model, copy, row);
            Object.assign(row, copy);
          }
          return { count: rows.length };
        },
        async upsert({ where, update, create: createData }) {
          await wait();
          const row = state.tables[model].find((r) => matches(r, where));
          if (row) { applyData(row, update || {}); return structuredClone(row); }
          return structuredClone(create(model, createData));
        },
      };
    }

    client.$connect = async () => {};
    client.$disconnect = async () => {};
    client.$transaction = async (arg) => {
      if (typeof arg !== 'function') throw new Error('fake prisma: only interactive $transaction is supported');
      if (inTx) return arg(client);
      const prev = state.lock;
      let release;
      state.lock = new Promise((r) => { release = r; });
      await prev;
      const snap = structuredClone(state.tables);
      try {
        return await arg(makeClient(true));
      } catch (e) {
        state.tables = snap; // roll back everything the callback did
        throw e;
      } finally {
        release();
      }
    };
    return client;
  }

  const root = makeClient(false);
  root._state = state;
  return root;
}

module.exports = { createFakePrisma };
