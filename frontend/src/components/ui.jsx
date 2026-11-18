import { NavLink, useNavigate } from 'react-router-dom'
import { useT } from '../i18n'

export const GREEN_GRADIENT = 'linear-gradient(165deg, #0A5C36 0%, #0E7A47 60%, #00A86B 100%)'

const P = {
  home: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9z" />,
  tx: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  grid: (<><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>),
  user: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>),
  send: <path d="M21 3L3 10.500l7 3 3 7L21 3z" />,
  qr: (<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM19 14v0M14 20h3M20 17v4" /></>),
  down: <path d="M12 4v14M6 12l6 6 6-6" />,
  up: <path d="M12 20V6M6 12l6-6 6 6" />,
  bag: (<><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8a3 3 0 0 1 6 0" /></>),
  card: (<><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></>),
  bell: (<><path d="M6 17V11a6 6 0 0 1 12 0v6l1.500 2h-15L6 17z" /><path d="M10 21a2 2 0 0 0 4 0" /></>),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  eye: (<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>),
  eyeoff: (<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><path d="M4 4l16 16" /></>),
  shield: (<><path d="M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6l8-3z" /><path d="M8.500 12l2.500 2.500 4.500-5" /></>),
  lock: (<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>),
  back: <path d="M15 5l-7 7 7 7" />,
  chev: <path d="M9 5l7 7-7 7" />,
  wallet: (<><path d="M3 7a2 2 0 0 1 2-2h13v4" /><rect x="3" y="7" width="18" height="13" rx="2" /><circle cx="16.500" cy="13.500" r="1.200" /></>),
  phone: <path d="M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  wifi: (<><path d="M2 9a15 15 0 0 1 20 0M5 12.500a10 10 0 0 1 14 0M8.500 16a5 5 0 0 1 7 0" /><circle cx="12" cy="19" r="1" /></>),
  doc: (<><path d="M6 3h9l4 4v14H6z" /><path d="M9 12h7M9 16h7" /></>),
  hash: <path d="M5 9h14M5 15h14M10 4L8 20M16 4l-2 16" />,
  home2: (<><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>),
  cart: (<><path d="M3 4h3l2.500 11h10l2-8H7" /><circle cx="10" cy="19.500" r="1.200" /><circle cx="17" cy="19.500" r="1.200" /></>),
  out: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
  people: (<><circle cx="9" cy="8" r="3.500" /><circle cx="17" cy="9" r="2.500" /><path d="M2.500 20c0-3.500 3-6 6.500-6s6.500 2.500 6.500 6M16 14.500c3 0 5.500 2 5.500 5.500" /></>),
  link: (<><path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1" /><path d="M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1" /></>),
  repeat: (<><path d="M17 3l4 4-4 4" /><path d="M3 11V9a2 2 0 0 1 2-2h16" /><path d="M7 21l-4-4 4-4" /><path d="M21 13v2a2 2 0 0 1-2 2H3" /></>),
  gift: (<><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v9h14v-9M12 8v13" /><path d="M12 8C10 8 8 7 8 5.500S9 3.500 10 4c1 .5 2 2.500 2 4zM12 8c2 0 4-1 4-2.500s-1-2-2-1.500c-1 .5-2 2.500-2 4z" /></>),
  globe: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>),
  plus: <path d="M12 5v14M5 12h14" />,
}

export function Icon({ name, size = 24, stroke = 1.8, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" className={className}>{P[name]}</svg>
  )
}

const tabs = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/history', label: 'Transactions', icon: 'tx' },
  { to: '/services', label: 'Services', icon: 'grid' },
  { to: '/account', label: 'Account', icon: 'user' },
]

export function TabBar() {
  const { t } = useT()
  return (
    <nav className="bg-white border-t flex justify-around pt-2 pb-3 relative z-20">
      {tabs.map(tb => (
        <NavLink key={tb.to} to={tb.to} end={tb.end}
          className={({ isActive }) => `flex flex-col items-center gap-0.5 text-xs w-20 ${isActive ? 'text-primary font-semibold' : 'text-gray-500'}`}>
          <Icon name={tb.icon} size={26} />
          {t(tb.label)}
        </NavLink>
      ))}
    </nav>
  )
}

// Standard inner-screen frame: green header with back arrow, scrolling body, optional tab bar
export function Screen({ title, children, tabbar = false }) {
  const navigate = useNavigate()
  const { t } = useT()
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="text-white px-4 py-4 flex items-center gap-3" style={{ background: GREEN_GRADIENT }}>
        <button onClick={() => navigate(-1)} aria-label="Back"><Icon name="back" /></button>
        <h1 className="text-lg font-bold">{t(title)}</h1>
      </header>
      <main className="flex-1 overflow-y-auto p-4">{children}</main>
      {tabbar && <TabBar />}
    </div>
  )
}

const fmtDate = (iso) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).replace(', ', ' • ').replace(/, (\d{1,2}:)/, ' • $1')

const iconFor = (type) => ({ DEPOSIT: 'down', SEND: 'send', WITHDRAW: 'up', TILL: 'bag', PAYBILL: 'doc', CHAMA_CONTRIBUTION: 'people', CHAMA_PAYOUT: 'people', REQUEST_PAYMENT: 'link', SCHEDULED_PAYMENT: 'repeat', REWARD_REDEEM: 'gift', REFUND: 'down' }[type] || 'card')
const INCOMING_TYPES = ['DEPOSIT', 'CHAMA_PAYOUT', 'REWARD_REDEEM', 'REFUND']

export function TxRow({ tx, userId }) {
  const { t } = useT()
  const incoming = INCOMING_TYPES.includes(tx.type) || (tx.recipientId === userId && tx.senderId !== userId)
  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
      <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
        <Icon name={iconFor(tx.type)} size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{tx.description || tx.type}</p>
        <p className="text-xs text-gray-500">{fmtDate(tx.createdAt)}</p>
      </div>
      <div className="text-right">
        <p className={`font-bold ${incoming ? 'text-primary' : 'text-gray-900'}`}>{incoming ? '+' : '−'} KES {tx.amount.toLocaleString()}</p>
        <p className="text-[11px] text-primary">{t('Successful')}</p>
      </div>
    </div>
  )
}
