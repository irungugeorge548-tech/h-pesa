import { Link, useNavigate } from 'react-router-dom'
import { Icon, TabBar } from '../components/ui'

const clean = (u) => (u || '').replace(/\/$/, '')
// Where the other apps live. H-Homes / H-Mart only show once their address is set.
const APPS = [
  { key: 'fleet', name: 'H-Fleet', sub: 'Book rides and pay from this wallet', icon: 'send', url: clean(import.meta.env.VITE_HFLEET_URL || 'https://h-fleet.vercel.app') },
  { key: 'homes', name: 'H-Homes', sub: 'Rentals and rent payments', icon: 'home', url: clean(import.meta.env.VITE_HHOMES_URL) },
  { key: 'mart', name: 'H-Mart', sub: 'Shopping and food', icon: 'cart', url: clean(import.meta.env.VITE_HMART_URL) },
].filter(a => a.url)

// Opens the app's own sign-up with your name, phone and email already filled in.
// No password or PIN is sent: you choose those in the other app.
const signupUrl = (a, user) => `${a.url}/login?register=1&name=${encodeURIComponent(user?.name || '')}&phone=${encodeURIComponent(user?.phone || '')}&email=${encodeURIComponent(user?.email || '')}`

export default function ConnectApps({ user, fresh = false }) {
  const navigate = useNavigate()
  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="flex-1 overflow-y-auto px-5 pt-6">
        <h1 className="text-3xl font-extrabold">{fresh ? `Welcome, ${(user?.name || '').split(' ')[0]}!` : 'Other apps'}</h1>
        <p className="text-gray-500 mt-1">{fresh ? 'Your H-Pesa wallet is ready. Do you want to open an account in our other apps? It is your choice, and you can do it later.' : 'Open an account in another app. Each app has its own password, and you can connect it to this wallet.'}</p>
        <div className="mt-5 space-y-3">
          {APPS.map(a => (
            <div key={a.key} className="border rounded-2xl p-4 shadow-sm flex items-center gap-4">
              <span className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Icon name={a.icon} size={22} /></span>
              <div className="flex-1 min-w-0"><p className="font-semibold">{a.name}</p><p className="text-xs text-gray-500">{a.sub}</p></div>
              <a href={signupUrl(a, user)} className="bg-primary text-white rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap">Open account</a>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-4">We only pass your name, phone number and email. You choose a new password in the other app, and you can connect your H-Pesa wallet there when you like.</p>
        {fresh
          ? <button onClick={() => navigate('/')} className="w-full mt-6 mb-6 border py-3.5 rounded-2xl font-semibold text-gray-700">Skip for now</button>
          : <Link to="/account" className="block text-center mt-6 mb-6 text-primary font-semibold">Back to account</Link>}
      </div>
      {!fresh && <TabBar />}
    </div>
  )
}
