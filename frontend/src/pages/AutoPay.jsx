import { useEffect, useState } from 'react'
import { PasswordInput } from '../components/extras'
import { Screen, Icon } from '../components/ui'
import { useT } from '../i18n'
import { get, post, del, errMsg } from '../lib/api'

const field = 'w-full px-4 py-3.5 border rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-primary'

export default function AutoPay() {
  const { t } = useT()
  const [list, setList] = useState(null)
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState('SEND')
  const [phone, setPhone] = useState('')
  const [chamas, setChamas] = useState([])
  const [chamaId, setChamaId] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState('MONTHLY')
  const [startDate, setStartDate] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => get('/api/scheduled').then(setList).catch(() => setList([]))
  useEffect(() => { load(); get('/api/chama').then(c => { setChamas(c); if (c[0]) setChamaId(c[0].id) }).catch(() => {}) }, [])

  const create = async (e) => {
    e.preventDefault(); setBusy(true); setError('')
    try {
      const body = { kind, frequency, pin, startDate: startDate ? new Date(startDate).toISOString() : undefined }
      if (kind === 'SEND') { body.recipientPhone = phone; body.amount = amount } else body.chamaId = chamaId
      await post('/api/scheduled', body)
      setOpen(false); setPin(''); setPhone(''); setAmount(''); setStartDate(''); await load()
    } catch (err) { setError(errMsg(err, t('Something went wrong'))) } finally { setBusy(false) }
  }
  const stop = async (id) => { try { await del(`/api/scheduled/${id}`); await load() } catch { /* ignore */ } }
  const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <Screen title="Auto-Pay" tabbar>
      <button onClick={() => setOpen(!open)} className="w-full bg-primary text-white rounded-2xl py-3 font-semibold flex items-center justify-center gap-2 mb-4"><Icon name="plus" size={18} />{t('New automatic payment')}</button>
      {open && (
        <form onSubmit={create} className="bg-white rounded-3xl border shadow-sm p-5 space-y-3 mb-4">
          {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm">{error}</div>}
          <div className="flex gap-2">
            {[['SEND', 'Send money'], ['CHAMA', 'Pay a chama']].map(([v, l]) => (
              <button type="button" key={v} onClick={() => setKind(v)} className={`flex-1 rounded-full py-2 text-sm border ${kind === v ? 'bg-primary text-white border-primary' : 'text-gray-600'}`}>{t(l)}</button>))}
          </div>
          {kind === 'SEND' ? (<>
            <input className={field} type="tel" placeholder={t('Recipient phone')} value={phone} onChange={e => setPhone(e.target.value)} required />
            <input className={field} type="number" inputMode="decimal" placeholder={t('Amount (KES)')} value={amount} onChange={e => setAmount(e.target.value)} required />
          </>) : (
            <select className={field} value={chamaId} onChange={e => setChamaId(e.target.value)} required>
              {chamas.map(c => <option key={c.id} value={c.id}>{c.name} (KES {c.contributionAmount})</option>)}
            </select>)}
          <div>
            <p className="text-sm text-gray-700 mb-1">{t('Repeat')}</p>
            <div className="flex gap-2">
              {[['DAILY', 'Daily'], ['WEEKLY', 'Weekly'], ['MONTHLY', 'Monthly']].map(([v, l]) => (
                <button type="button" key={v} onClick={() => setFrequency(v)} className={`flex-1 rounded-full py-2 text-sm border ${frequency === v ? 'bg-primary text-white border-primary' : 'text-gray-600'}`}>{t(l)}</button>))}
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-700 mb-1">{t('Starts on')}</p>
            <input className={field} type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <PasswordInput className={field} inputMode="numeric" maxLength={4} placeholder={t('H-Pesa PIN')} value={pin} onChange={e => setPin(e.target.value)} required />
          <button disabled={busy} className="w-full bg-primary disabled:opacity-60 text-white py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2"><Icon name="lock" size={18} />{t('Confirm')}</button>
        </form>)}

      <h2 className="font-bold mb-2">{t('Automatic payments')}</h2>
      {list === null ? <p className="text-gray-400 text-sm">{t('Loading…')}</p>
        : list.filter(p => p.active).length === 0 ? <p className="text-gray-400 text-sm text-center py-8">{t('No automatic payments yet')}</p>
        : <div className="space-y-3">{list.filter(p => p.active).map(p => (
          <div key={p.id} className="bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Icon name="repeat" size={20} /></span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{p.label}</p>
              <p className="text-xs text-gray-500">KES {p.amount.toLocaleString()} • {t(p.frequency === 'DAILY' ? 'Daily' : p.frequency === 'WEEKLY' ? 'Weekly' : 'Monthly')} • {t('Next:')} {fmt(p.nextRunAt)}</p>
              {p.lastStatus && p.lastStatus.startsWith('FAILED') && <p className="text-xs text-red-600 mt-0.5">{p.lastStatus}</p>}
            </div>
            <button onClick={() => stop(p.id)} className="text-sm text-red-600">{t('Stop')}</button>
          </div>))}</div>}
    </Screen>
  )
}
