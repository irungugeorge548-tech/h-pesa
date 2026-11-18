import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Screen, Icon } from '../components/ui'
import { useT } from '../i18n'
import { get, post, errMsg } from '../lib/api'

const field = 'w-full px-4 py-3.5 border rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-primary'

export default function Chama() {
  const { t } = useT()
  const navigate = useNavigate()
  const [list, setList] = useState(null)
  const [mode, setMode] = useState(null) // 'create' | 'join' | null
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState('MONTHLY')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => get('/api/chama').then(setList).catch(() => setList([]))
  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('')
    try {
      const r = mode === 'create'
        ? await post('/api/chama', { name, contributionAmount: amount, frequency })
        : await post('/api/chama/join', { code })
      navigate(`/chama/${r.id}`)
    } catch (err) { setError(errMsg(err, t('Something went wrong'))) } finally { setBusy(false) }
  }

  return (
    <Screen title="Chama" tabbar>
      <div className="flex gap-2 mb-4">
        <button onClick={() => { setMode(mode === 'create' ? null : 'create'); setError('') }} className="flex-1 bg-primary text-white rounded-2xl py-3 font-semibold flex items-center justify-center gap-2"><Icon name="plus" size={18} />{t('Create a chama')}</button>
        <button onClick={() => { setMode(mode === 'join' ? null : 'join'); setError('') }} className="flex-1 border border-primary text-primary rounded-2xl py-3 font-semibold">{t('Join with a code')}</button>
      </div>

      {mode && (
        <form onSubmit={submit} className="bg-white rounded-3xl border shadow-sm p-5 space-y-3 mb-4">
          {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm">{error}</div>}
          {mode === 'create' ? (<>
            <input className={field} placeholder={t('Chama name')} value={name} onChange={e => setName(e.target.value)} maxLength={40} required />
            <input className={field} type="number" inputMode="decimal" placeholder={t('Contribution per round (KES)')} value={amount} onChange={e => setAmount(e.target.value)} required />
            <div className="flex gap-2">
              {[['WEEKLY', 'Weekly'], ['MONTHLY', 'Monthly']].map(([v, l]) => (
                <button type="button" key={v} onClick={() => setFrequency(v)} className={`flex-1 rounded-full py-2 text-sm border ${frequency === v ? 'bg-primary text-white border-primary' : 'text-gray-600'}`}>{t(l)}</button>
              ))}
            </div>
          </>) : (
            <input className={`${field} uppercase tracking-widest text-center text-xl`} placeholder="ABC123" value={code} onChange={e => setCode(e.target.value)} maxLength={10} required />
          )}
          <button disabled={busy} className="w-full bg-primary disabled:opacity-60 text-white py-3.5 rounded-2xl font-semibold">{busy ? t('Loading…') : mode === 'create' ? t('Create') : t('Join')}</button>
        </form>
      )}

      <h2 className="font-bold mb-2">{t('My Chamas')}</h2>
      {list === null ? <p className="text-gray-400 text-sm">{t('Loading…')}</p>
        : list.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">{t('You are not in any chama yet')}</p>
        : <div className="space-y-3">{list.map(c => (
          <Link key={c.id} to={`/chama/${c.id}`} className="block bg-white rounded-2xl border shadow-sm p-4">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Icon name="people" size={22} /></span>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{c.name}</p>
                <p className="text-xs text-gray-500">{c.memberCount} {t('members')} • KES {c.contributionAmount.toLocaleString()} {t(c.frequency === 'WEEKLY' ? 'Weekly' : 'Monthly')}</p>
              </div>
              <span className="text-xs bg-primary/10 text-primary rounded-full px-2.5 py-1">{t(c.status === 'FORMING' ? 'Forming' : c.status === 'COMPLETED' ? 'Completed' : 'Active')}</span>
            </div>
          </Link>))}</div>}
    </Screen>
  )
}
