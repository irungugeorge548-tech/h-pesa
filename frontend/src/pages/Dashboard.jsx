import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Icon, TabBar, TxRow, GREEN_GRADIENT } from '../components/ui'
import { useT } from '../i18n'

const actions = [
  { to: '/send', label: 'Send', icon: 'send' },
  { to: '/qr', label: 'QR', icon: 'qr' },
  { to: '/deposit', label: 'Deposit', icon: 'down' },
  { to: '/withdraw', label: 'Withdraw', icon: 'up' },
]

export default function Dashboard({ user }) {
  const { t } = useT()
  const [balance, setBalance] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('hpesa_token')}` }
    axios.get('/api/wallet/balance', { headers }).then(r => setBalance(r.data.balance)).catch(() => {})
    axios.get('/api/transactions/history', { headers }).then(r => setTransactions(r.data.slice(0, 4))).catch(() => {})
  }, [])

  const firstName = (user?.name || '').split(' ')[0] || 'there'

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="flex-1 overflow-y-auto">
        <div className="text-white px-5 pt-5 pb-24" style={{ background: GREEN_GRADIENT }}>
          <div className="flex items-center justify-between">
            <Icon name="menu" size={28} />
            <div className="flex items-center gap-4">
              <Icon name="bell" size={26} />
              <Link to="/account"><Icon name="user" size={28} /></Link>
            </div>
          </div>

          <div className="flex items-start justify-between mt-5">
            <div>
              <h1 className="text-3xl font-extrabold">{t('Hi')}, {firstName}</h1>
              <p className="text-white/80 text-sm mt-1">{t('Welcome back to H-Pesa')} 👋</p>
            </div>
            <div className="w-20 h-16 rounded-2xl bg-white/15 border border-white/25 flex flex-col items-center justify-center text-xs font-bold gap-0.5">
              <Icon name="wallet" size={24} />H-Pesa
            </div>
          </div>

          <div className="mt-5 rounded-3xl bg-white/10 border border-white/15 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                {t('Wallet Balance')}
                <button onClick={() => setHidden(!hidden)} aria-label="Show or hide balance">
                  <Icon name={hidden ? 'eyeoff' : 'eye'} size={20} />
                </button>
              </div>
              <span className="text-xs bg-white/85 text-primary font-semibold rounded-full px-3 py-1">H-Pesa Wallet</span>
            </div>
            <p className="text-4xl font-extrabold mt-2">
              {hidden ? 'KES ••••••' : balance === null ? 'KES …' : `KES ${balance.toLocaleString()}`}
            </p>
            <p className="text-sm text-white/80 mt-1">{t('Kenyan Shillings')}</p>
          </div>
        </div>

        <div className="bg-white rounded-t-3xl -mt-12 relative px-5 pt-5 pb-4">
          <div className="flex justify-between">
            {actions.map(a => (
              <Link key={a.to} to={a.to} className="flex flex-col items-center gap-2 text-sm w-20">
                <span className="w-16 h-16 rounded-full bg-white shadow-lg border border-gray-100 text-primary flex items-center justify-center">
                  <Icon name={a.icon} size={28} />
                </span>
                {t(a.label)}
              </Link>
            ))}
          </div>

          <div className="flex items-center justify-between mt-6 mb-2">
            <h2 className="font-bold">{t('Recent Transactions')}</h2>
            <Link to="/history" className="text-primary text-sm font-medium flex items-center gap-1">{t('View All')} <Icon name="chev" size={14} /></Link>
          </div>
          <div className="border rounded-2xl px-3 shadow-sm">
            {transactions.length === 0
              ? <p className="text-gray-400 text-sm py-6 text-center">{t('No transactions yet')}</p>
              : transactions.map(tx => <TxRow key={tx.id} tx={tx} userId={user?.id} />)}
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-primary/10 border border-primary/20 p-4">
            <Icon name="shield" size={34} className="text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm">{t('Your wallet is secure')}</p>
              <p className="text-xs text-gray-500">{t('Keep your PIN private. Never share it with anyone.')}</p>
            </div>
            <Icon name="chev" size={18} className="text-primary" />
          </div>
        </div>
      </div>
      <TabBar />
    </div>
  )
}
