import { Screen } from '../components/ui'

const NOTE = 'DRAFT for the pre-launch demo. Haraka Pesa (H-Pesa, H-Fleet, H-Homes, H-Mart) is not yet a registered company and is not licensed to hold real money. These texts are placeholders and must be reviewed by a Kenyan lawyer before a public launch.'
const TERMS = [
  ['1. About the service', 'H-Pesa is the wallet of the Haraka Pesa ecosystem. At this stage it is a demonstration. Balances are demo money, cannot be withdrawn and have no cash value.'],
  ['2. Your account', 'You must give true details and keep your password and PIN secret. You are responsible for what is done with them. You may hold up to 3 wallets, each with its own phone number, email and username.'],
  ['3. Acceptable use', 'No fraud, no money laundering, no impersonation, no attempts to break or overload the service, and no use of the service for anything illegal.'],
  ['4. Payments', 'Transfers you confirm with your PIN are final. Check the recipient before you confirm. Fees, limits and rewards may change.'],
  ['5. Other Haraka apps', 'You may connect one wallet to H-Fleet, H-Homes and H-Mart. They use your wallet only to take payments you approve with your PIN.'],
  ['6. Suspension', 'We may suspend or close accounts that break these terms or put others at risk.'],
  ['7. Liability', 'The demo is provided as is. To the extent the law allows, Haraka Pesa is not liable for losses from the demo.'],
  ['8. Changes and law', 'We may update these terms and will tell you in the app. Kenyan law applies.'],
]
const PRIVACY = [
  ['What we collect', 'Name, phone number, email, username, optional profile photo, your transactions, device identifier (to limit wallets per phone) and security logs.'],
  ['Why', 'To run your wallet, keep it secure, prevent fraud, give support and meet legal duties.'],
  ['Sharing', 'We do not sell your data. Other Haraka apps only receive what is needed for a payment you approve. We may share data when the law requires it.'],
  ['Security', 'Passwords and PINs are stored hashed. We limit login attempts and lock accounts after repeated failures.'],
  ['Your rights', 'Under the Kenya Data Protection Act you may ask to see, correct or delete your data. Contact support in the app.'],
  ['Retention', 'We keep records as long as needed for the service and the law.'],
]
export default function Legal({ kind }) {
  const items = kind === 'privacy' ? PRIVACY : TERMS
  return (
    <Screen title={kind === 'privacy' ? 'Privacy Policy' : 'Terms of Use'}>
      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-3 text-xs mb-4">{NOTE}</div>
      <div className="bg-white rounded-3xl border shadow-sm p-5 space-y-4">
        {items.map(([h, p]) => <div key={h}><p className="font-bold">{h}</p><p className="text-sm text-gray-600">{p}</p></div>)}
      </div>
    </Screen>
  )
}
