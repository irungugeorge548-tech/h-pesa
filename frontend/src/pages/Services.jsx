import { Link } from 'react-router-dom'
import { Icon, TabBar, GREEN_GRADIENT } from '../components/ui'
import { useT } from '../i18n'

const services = [
  { to: '/chama', label: 'Chama', sub: 'Savings groups, take turns', icon: 'people' },
  { to: '/requests', label: 'Payment Links', sub: 'Ask anyone to pay you', icon: 'link' },
  { to: '/autopay', label: 'Auto-Pay', sub: 'Pay on a schedule', icon: 'repeat' },
  { to: '/rewards', label: 'Rewards', sub: 'Earn points on payments', icon: 'gift' },
  { to: '/paybill', label: 'Pay Bill', sub: 'Utilities and business bills', icon: 'doc' },
  { to: '/till', label: 'Buy Goods', sub: 'Pay a till number', icon: 'hash' },
  { to: '/airtime', label: 'Airtime', sub: 'Top up any number', icon: 'phone' },
  { to: '/bundles', label: 'Data Bundles', sub: 'Internet and SMS', icon: 'wifi' },
  { to: '/ussd', label: 'USSD', sub: 'Use the *123# menu', icon: 'hash' },
  { to: '/homes', label: 'H-Homes', sub: 'Rent and your unit', icon: 'home2' },
  { to: '/mart', label: 'H-Mart', sub: 'Groceries and essentials', icon: 'cart' },
]

export default function Services() {
  const { t } = useT()
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="text-white px-5 py-5" style={{ background: GREEN_GRADIENT }}>
        <h1 className="text-2xl font-extrabold">{t('Services')}</h1>
        <p className="text-white/80 text-sm">{t('Everything you can do with H-Pesa')}</p>
      </header>
      <main className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3 content-start">
        {services.map(s => (
          <Link key={s.to} to={s.to} className="bg-white rounded-2xl border shadow-sm p-4 flex flex-col gap-2">
            <span className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Icon name={s.icon} size={24} /></span>
            <p className="font-bold">{t(s.label)}</p>
            <p className="text-xs text-gray-500">{t(s.sub)}</p>
          </Link>
        ))}
      </main>
      <TabBar />
    </div>
  )
}
