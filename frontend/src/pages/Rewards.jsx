import { useEffect, useState } from 'react'
import { PasswordInput } from '../components/extras'
import { Screen, Icon, GREEN_GRADIENT } from '../components/ui'
import { useT } from '../i18n'
import { get, post, errMsg } from '../lib/api'

export default function Rewards() {
  const { t } = useT()
  const [r, setR] = useState(null)
  const [points, setPoints] = useState('')
  const [pin, setPin] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => get('/api/rewards').then(setR).catch(() => {})
  useEffect(() => { load() }, [])

  const redeem = async (e) => {
    e.preventDefault(); setBusy(true); setError(''); setMsg('')
    try { const x = await post('/api/rewards/redeem', { points, pin }); setMsg(x.message); setPoints(''); setPin(''); await load() }
    catch (err) { setError(errMsg(err, t('Something went wrong'))) } finally { setBusy(false) }
  }
  const field = 'w-full px-4 py-3.5 border rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-primary'

  return (
    <Screen title="Rewards" tabbar>
      {!r ? <p className="text-gray-400">{t('Loading…')}</p> : (<>
        <div className="rounded-3xl text-white p-5" style={{ background: GREEN_GRADIENT }}>
          <div className="flex items-center gap-2 text-sm"><Icon name="gift" size={20} />{t('Points')}</div>
          <p className="text-4xl font-extrabold mt-1">{r.points.toLocaleString()}</p>
          <p className="text-sm text-white/80">{t('Worth')} KES {r.valueKES.toLocaleString()}</p>
        </div>
        <p className="text-xs text-gray-500 mt-3">{t('You earn 1 point for every KES 10 you spend with H-Pesa and partner apps.')}</p>

        <form onSubmit={redeem} className="bg-white rounded-3xl border shadow-sm p-5 mt-3 space-y-3">
          {msg && <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm">{msg}</div>}
          {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm">{error}</div>}
          <input className={field} type="number" inputMode="numeric" placeholder={`${t('Points to redeem')} (${t('Minimum')} ${r.minRedeem})`} value={points} onChange={e => setPoints(e.target.value)} required />
          <PasswordInput className={field} inputMode="numeric" maxLength={4} placeholder={t('H-Pesa PIN')} value={pin} onChange={e => setPin(e.target.value)} required />
          <button disabled={busy || r.points < r.minRedeem} className="w-full bg-primary disabled:opacity-50 text-white py-3.5 rounded-2xl font-semibold">{t('Redeem')}</button>
        </form>

        <h2 className="font-bold mt-5 mb-2">{t('History')}</h2>
        <div className="bg-white rounded-2xl border px-4">
          {r.history.length === 0 ? <p className="text-gray-400 text-sm py-6 text-center">{t('No transactions yet')}</p> : r.history.map(h => (
            <div key={h.id} className="flex items-center gap-3 py-3 border-b last:border-0">
              <div className="flex-1 min-w-0"><p className="font-medium truncate">{h.reason}</p><p className="text-xs text-gray-500">{new Date(h.createdAt).toLocaleDateString('en-GB')}</p></div>
              <p className={`font-bold ${h.points >= 0 ? 'text-primary' : 'text-gray-700'}`}>{h.points >= 0 ? '+' : ''}{h.points}</p>
            </div>))}
        </div>
      </>)}
    </Screen>
  )
}
