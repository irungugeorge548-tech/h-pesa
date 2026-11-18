import { createContext, useContext, useState, useCallback } from 'react'

// Text is written in English everywhere; Kiswahili is looked up by the English text.
// Anything missing from this list simply stays in English, so nothing can break.
const SW = {
  'Home': 'Nyumbani', 'Transactions': 'Miamala', 'Services': 'Huduma', 'Account': 'Akaunti',
  'Send': 'Tuma', 'QR': 'QR', 'Deposit': 'Weka', 'Withdraw': 'Toa',
  'Recent Transactions': 'Miamala ya Hivi Karibuni', 'View All': 'Tazama Yote',
  'Wallet Balance': 'Salio la Wallet', 'Welcome back to H-Pesa': 'Karibu tena H-Pesa', 'Hi': 'Habari',
  'Kenyan Shillings': 'Shilingi za Kenya', 'No transactions yet': 'Hakuna miamala bado',
  'Your wallet is secure': 'Wallet yako iko salama', 'Keep your PIN private. Never share it with anyone.': 'Weka PIN yako siri. Usimpe mtu yeyote.',
  'Everything you can do with H-Pesa': 'Kila unachoweza kufanya na H-Pesa',
  'Pay Bill': 'Lipa Bili', 'Buy Goods': 'Nunua Bidhaa', 'Airtime': 'Airtime', 'Data Bundles': 'Bando za Data',
  'Chama': 'Chama', 'Savings groups, take turns': 'Vikundi vya akiba, zamu kwa zamu',
  'Payment Links': 'Viungo vya Malipo', 'Ask anyone to pay you': 'Mwombe mtu akulipe',
  'Auto-Pay': 'Malipo ya Kiotomatiki', 'Pay on a schedule': 'Lipa kwa ratiba',
  'Rewards': 'Zawadi', 'Earn points on payments': 'Pata pointi kwa malipo',
  'Profile': 'Wasifu', 'Name, phone and email': 'Jina, simu na barua pepe', 'PIN & Security': 'PIN na Usalama', 'Change your PIN': 'Badilisha PIN yako',
  'Language': 'Lugha', 'Log out': 'Toka',
  'Back': 'Rudi', 'Create': 'Tengeneza', 'Cancel': 'Ghairi', 'Join': 'Jiunge', 'Amount': 'Kiasi', 'Amount (KES)': 'Kiasi (KES)', 'H-Pesa PIN': 'PIN ya H-Pesa',
  'Confirm': 'Thibitisha', 'Loading…': 'Inapakia…', 'Something went wrong': 'Kuna tatizo limetokea', 'Successful': 'Imefanikiwa',
  'My Chamas': 'Machama Yangu', 'Create a chama': 'Anzisha chama', 'Join with a code': 'Jiunge kwa msimbo',
  'Chama name': 'Jina la chama', 'Contribution per round (KES)': 'Mchango kwa kila awamu (KES)', 'Weekly': 'Kila wiki', 'Monthly': 'Kila mwezi', 'Daily': 'Kila siku',
  'Chama code': 'Msimbo wa chama', 'You are not in any chama yet': 'Bado hauko kwenye chama chochote',
  'members': 'wanachama', 'Round': 'Awamu', 'Pot': 'Kapu', 'Contribute': 'Changia', 'Release payout': 'Toa malipo',
  'Next to receive': 'Anayefuata kupokea', 'Paid': 'Amelipa', 'Not yet': 'Bado', 'You': 'Wewe',
  'Share this code so friends can join:': 'Shiriki msimbo huu marafiki wajiunge:', 'Forming': 'Inaundwa', 'Active': 'Inaendelea', 'Completed': 'Imekamilika',
  'Everyone has paid. The pot can be released.': 'Wote wamelipa. Kapu linaweza kutolewa.',
  'Payment link': 'Kiungo cha malipo', 'Create a payment link': 'Tengeneza kiungo cha malipo', 'Note (optional)': 'Maelezo (si lazima)',
  'Leave the amount empty to let people choose': 'Acha kiasi wazi ili watu wachague', 'Reusable (many people can pay)': 'Kinaweza kutumika tena (watu wengi walipe)',
  'Copy link': 'Nakili kiungo', 'Copied!': 'Imenakiliwa!', 'Share': 'Shiriki', 'Your links': 'Viungo vyako', 'Open': 'Wazi', 'Cancelled': 'Imefutwa',
  'Pay': 'Lipa', 'Log in to pay': 'Ingia ili ulipe', 'asks you to pay': 'anakuomba ulipe', 'Request not found': 'Ombi halijapatikana',
  'This request is no longer open': 'Ombi hili halipo wazi tena',
  'Automatic payments': 'Malipo ya kiotomatiki', 'New automatic payment': 'Malipo mapya ya kiotomatiki', 'Recipient phone': 'Simu ya mpokeaji',
  'Repeat': 'Rudia', 'Starts on': 'Inaanza', 'Stop': 'Simamisha', 'Next:': 'Ifuatayo:', 'No automatic payments yet': 'Hakuna malipo ya kiotomatiki bado',
  'Send money': 'Tuma pesa', 'Pay a chama': 'Changia chama',
  'Points': 'Pointi', 'Worth': 'Thamani', 'Redeem': 'Badilisha kuwa pesa', 'Points to redeem': 'Pointi za kubadilisha', 'History': 'Historia',
  'You earn 1 point for every KES 10 you spend with H-Pesa and partner apps.': 'Unapata pointi 1 kwa kila KES 10 unayotumia H-Pesa na programu washirika.',
  'Minimum': 'Kiwango cha chini', 'Welcome back': 'Karibu tena', 'Log in to your wallet': 'Ingia kwenye wallet yako', 'Phone number': 'Namba ya simu', 'Password': 'Nenosiri',
  'Log in': 'Ingia', 'Logging in…': 'Inaingia…', 'New here?': 'Mgeni?', 'Create account': 'Fungua akaunti',
  'Recipient': 'Mpokeaji', 'Send Money': 'Tuma Pesa', 'Secured with your PIN': 'Imelindwa na PIN yako', 'Sending…': 'Inatuma…',
}

const Ctx = createContext({ lang: 'en', setLang: () => {}, t: (s) => s })

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem('hpesa_lang') || 'en' } catch { return 'en' }
  })
  const setLang = useCallback((l) => {
    try { localStorage.setItem('hpesa_lang', l) } catch { /* ignore */ }
    setLangState(l)
  }, [])
  const t = useCallback((s) => (lang === 'sw' && SW[s]) || s, [lang])
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>
}

export const useT = () => useContext(Ctx)
