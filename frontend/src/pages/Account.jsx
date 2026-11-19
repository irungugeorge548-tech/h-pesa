import { Link } from 'react-router-dom'
import { Icon, TabBar } from '../components/ui'
import { useT } from '../i18n'

export default function Account({ user, logout }) {
  const { t, lang, setLang } = useT()
  const rows = [
    { icon: 'user', title: 'Profile', sub: 'Name, phone and email', to: '/account/profile' },
    { icon: 'lock', title: 'PIN & Security', sub: 'Change your PIN', to: '/account/security' },
    { icon: 'bell', title: 'Notifications', sub: 'Alerts and receipts', to: '/account/notifications' },
  ]
  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="flex-1 overflow-y-auto px-5 pt-6">
        <h1 className="text-3xl font-extrabold">{t('Account')}</h1>
        <div className="flex items-center gap-4 mt-5">
          <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold">{(user?.name || '?')[0]}</div>
          <div>
            <p className="text-2xl font-extrabold">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.phone}</p>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {rows.map(r => (
            <Link key={r.title} to={r.to} className="flex items-center gap-4 border rounded-2xl p-4 shadow-sm">
              <span className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Icon name={r.icon} size={22} /></span>
              <div className="flex-1"><p className="font-semibold">{t(r.title)}</p><p className="text-xs text-gray-500">{t(r.sub)}</p></div>
              <Icon name="chev" size={18} className="text-gray-400" />
            </Link>
          ))}
          <div className="flex items-center gap-4 border rounded-2xl p-4 shadow-sm">
            <span className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Icon name="globe" size={22} /></span>
            <p className="flex-1 font-semibold">{t('Language')}</p>
            <div className="flex rounded-full border overflow-hidden text-sm">
              {[['en', 'English'], ['sw', 'Kiswahili']].map(([v, l]) => (
                <button key={v} onClick={() => setLang(v)} className={`px-3 py-1.5 ${lang === v ? 'bg-primary text-white' : 'text-gray-600'}`}>{l}</button>))}
            </div>
          </div>
          <Link to="/rewards" className="flex items-center gap-4 border rounded-2xl p-4 shadow-sm">
            <span className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Icon name="gift" size={22} /></span>
            <p className="flex-1 font-semibold">{t('Rewards')}</p>
            <Icon name="chev" size={18} className="text-gray-400" />
          </Link>
        </div>
        <button onClick={logout} className="w-full mt-6 mb-6 border border-red-200 text-red-600 py-3 rounded-2xl font-semibold">{t('Log out')}</button>
      </div>
      <TabBar />
    </div>
  )
}
