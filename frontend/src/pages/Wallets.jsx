import { useNavigate } from 'react-router-dom'
import { Screen } from '../components/ui'
import { Avatar } from '../components/extras'
import { wallets, MAX_WALLETS } from '../lib/device'

export default function Wallets({ onSwitch, current }) {
  const navigate = useNavigate()
  const list = wallets()
  return (
    <Screen title="My wallets">
      <p className="text-sm text-gray-500 mb-3">You can have up to {MAX_WALLETS} wallets on this phone ({list.length}/{MAX_WALLETS}). Each has its own phone, email and username. Only one connects to the other Haraka apps.</p>
      <div className="space-y-3">
        {list.map(w => <button key={w.user.id} onClick={() => { onSwitch(w); navigate('/') }} className={`w-full flex items-center gap-3 bg-white border rounded-2xl p-4 text-left shadow-sm ${w.user.id === current?.id ? 'border-primary' : ''}`}>
          <Avatar user={w.user} size={44} /><div className="flex-1 min-w-0"><p className="font-semibold truncate">{w.user.name}</p><p className="text-xs text-gray-500">@{w.user.username || '—'} • {w.user.phone}</p></div>
          {w.user.id === current?.id && <span className="text-xs text-primary font-bold">In use</span>}</button>)}
      </div>
      {list.length < MAX_WALLETS
        ? <button onClick={() => navigate('/register?add=1')} className="w-full mt-4 border border-primary text-primary py-3 rounded-2xl font-semibold">+ Add another wallet</button>
        : <p className="text-xs text-amber-700 bg-amber-50 rounded-xl p-3 mt-4">You have reached the limit of {MAX_WALLETS} wallets.</p>}
    </Screen>
  )
}
