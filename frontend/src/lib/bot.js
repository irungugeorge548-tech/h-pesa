// The Haraka guide: written answers, not an AI. Each topic has keywords; the best match is shown.
export const TOPICS = [
  { id: 'start', q: 'Getting started with H-Pesa', k: ['start', 'begin', 'new', 'account', 'register', 'sign up', 'create', 'anza', 'fungua'],
    a: 'H-Pesa is your Haraka Pesa wallet. Create an account with your name, phone, email, a password and a 4-digit PIN. You also get a username like @tnirungu27 that others can use to send you money. Your password is for logging in; your PIN is for paying.' },
  { id: 'send', q: 'How do I send money?', k: ['send', 'transfer', 'tuma', 'username', 'sticker'],
    a: 'Tap Send, enter the phone number or @username, the amount and your PIN. Check the name that appears before you confirm. Money sent to the wrong person cannot be pulled back by the app, so double check.' },
  { id: 'balance', q: 'Why is my balance hidden?', k: ['balance', 'salio', 'hidden', 'hide', 'show', 'see'],
    a: 'To keep your money private, the balance is hidden. Tap "Request balance" and it shows for a few seconds, then hides again. You can still pay without showing it.' },
  { id: 'pin', q: 'I forgot my PIN', k: ['pin', 'forgot', 'reset', 'sahau'],
    a: 'On the login screen tap "Forgot PIN?". Enter your phone, email and password and choose a new PIN. For your safety, the new PIN starts working after 24 hours. If it was not you, just use your old PIN once and the reset is cancelled.' },
  { id: 'password', q: 'I forgot my password', k: ['password', 'nenosiri', 'login', 'log in', 'invalid', 'credentials', 'cannot'],
    a: 'Tap "Forgot password?" on the login screen. Enter your phone, email and PIN, then choose a new password. Remember: the password is for logging in, the PIN is only for paying. After 5 wrong tries the account is locked for 15 minutes.' },
  { id: 'lock', q: 'Why does the app ask for my PIN?', k: ['lock', 'locked', 'fingerprint', 'biometric', 'unlock', 'alama'],
    a: 'If you leave the app for about a minute it locks, like M-Pesa. Enter your PIN (or use your fingerprint if you turned it on in Account) to continue. After a long time away you log in fully again.' },
  { id: 'wallets', q: 'Can I have more than one wallet?', k: ['wallet', 'wallets', 'three', '3', 'another', 'second', 'switch'],
    a: 'Yes, up to 3 wallets on one phone. Each needs its own phone number, email and username. Only one wallet is connected to the other Haraka apps. Add or switch in Account > Wallets.' },
  { id: 'deposit', q: 'How do I add money?', k: ['deposit', 'top up', 'topup', 'add money', 'weka', 'load'],
    a: 'Tap Deposit. While we are in the pre-launch (demo) stage, the money in the wallet is demo money and cannot be withdrawn. Real deposits will be switched on when Haraka Pesa is fully licensed.' },
  { id: 'fleet', q: 'How does H-Fleet work?', k: ['fleet', 'ride', 'rides', 'bike', 'car', 'parcel', 'delivery', 'schedule', 'safari'],
    a: 'H-Fleet is the ride app. Open it, create its own account, choose Bike, Car or Delivery, set pickup and destination and request. To pay with your wallet, connect your H-Pesa wallet once (Profile > Connect H-Pesa). You pay with your H-Pesa PIN. You can also schedule a ride for later, and see receipts in Ride history.' },
  { id: 'homes', q: 'How does H-Homes work?', k: ['homes', 'house', 'rent', 'rental', 'lipa', 'mdogo', 'landlord', 'nyumba'],
    a: 'H-Homes is for finding and paying for rentals. You can pay rent from your H-Pesa wallet. Lipa Mdogo Mdogo lets you pay in small instalments. Connect your wallet when asked.' },
  { id: 'mart', q: 'What is H-Mart?', k: ['mart', 'food', 'shop', 'buy', 'order'],
    a: 'H-Mart is where you will order food and goods and pay with H-Pesa. It is part of the Haraka ecosystem and is coming soon.' },
  { id: 'receipt', q: 'Where are my receipts and statements?', k: ['receipt', 'statement', 'download', 'share', 'history', 'risiti'],
    a: 'Open Transactions and tap any transaction for its receipt: you can share or download it. For a full list, open Account > Statements, pick the dates and download it.' },
  { id: 'safe', q: 'How do I keep my account safe?', k: ['safe', 'secure', 'scam', 'fraud', 'hack', 'stolen', 'lost', 'phone'],
    a: 'Never share your PIN or password, not even with Haraka staff. We will never ask for them. Turn on the fingerprint lock. If your phone is lost, log in on another phone and change your PIN and password right away, then message support.' },
]
const clean = (s) => s.toLowerCase().replace(/[^a-z0-9\s@]/g, ' ')
export const answer = (text) => {
  const q = clean(text)
  let best = null, score = 0
  for (const t of TOPICS) {
    const s = t.k.reduce((n, k) => n + (q.includes(k) ? 1 : 0), 0)
    if (s > score) { best = t; score = s }
  }
  return best
}
