// A short, memorable, permanent username made from the name used at sign-up:
// first initial + surname + 2 digits, e.g. "Titus Nirungu" -> tnirungu27.
const clean = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
async function makeUsername(prisma, fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  let base = parts.length > 1 ? clean(parts[0])[0] + clean(parts[parts.length - 1]) : clean(parts[0]);
  base = (base || 'haraka').slice(0, 12);
  if (base.length < 3) base = (base + 'haraka').slice(0, 8);
  for (let i = 0; i < 12; i++) {
    const digits = i < 8 ? 2 : 3;
    const n = String(Math.floor(Math.random() * 10 ** digits)).padStart(digits, '0');
    const candidate = base + n;
    if (!(await prisma.user.findUnique({ where: { username: candidate } }))) return candidate;
  }
  return base + Date.now().toString().slice(-6);
}
module.exports = { makeUsername };
