import { useEffect, useState } from 'react'
import { Screen, Icon } from '../components/ui'
import { useT } from '../i18n'
import { get, post, del, errMsg } from '../lib/api'

const field = 'w-full px-4 py-3.5 border rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-primary'
const linkFor = (code) => `${window.location.origin}/pay/${code}`

export default function Requests() {
  const { t } = useT()
  const [list, setList] = useState(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [reusable, setReusable] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => get('/api/requests').then(setList).catch(() => setList([]))
  useEffect(() => { load() }, [])

  const create = async (e) => {
    e.preventDefault(); setBusy(true); setError('')
    try {
      await post('/api/requests', { amount: amount || undefined, note, reusable })
      setAmount(''); setNote(''); setReusable(false); await load()
    } catch (err) { setError(errMsg(err, t('Something went wrong'))) } finally { setBusy(false) }
  }

  const copy = async (code) => {
    const url = linkFor(code)
    try { await navigator.clipboard.writeText(url) } catch { window.prompt(t('Copy link'), url) }
    setCopied(code); setTimeout(() => setCopied(''), 1800)
  }
  const share = async (r) => {
    const text = `${r.note || 'H-Pesa'}${r.amount ? ` - KES ${r.amount}` : ''}`
    if (navigator.share) { try { await navigator.share({ title: 'H-Pesa', text, url: linkFor(r.code) }) } catch { /* cancelled */ } } else copy(r.code)
  }
  const cancel = async (id) => { try { await del(`/api/requests/${id}`); await load() } catch { /* ignore */ } }

  return (
    <Screen title="Payment Links" tabbar>
      <form onSubmit={create} className="bg-white rounded-3xl border shadow-sm p-5 space-y-3">
        <h2 className="font-bold">{t('Create a payment link')}</h2>
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm">{error}</div>}
        <input className={field} type="number" inputMode="decimal" placeholder={t('Amount (KES)')} value={amount} onChange={e => setAmount(e.target.value)} />
        <p className="text-xs text-gray-500 -mt-1">{t('Leave the amount empty to let people choose')}</p>
        <input className={field} placeholder={t('Note (optional)')} value={note} onChange={e => setNote(e.target.value)} maxLength={100} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reusable} onChange={e => setReusable(e.target.checked)} className="w-4 h-4 accent-[#00A86B]" />{t('Reusable (many people can pay)')}</label>
        <button disabled={busy} className="w-full bg-primary disabled:opacity-60 text-white py-3.5 rounded-2xl font-semibold">{t('Create')}</button>
      </form>

      <h2 className="font-bold mt-5 mb-2">{t('Your links')}</h2>
      {list === null ? <p className="text-gray-400 text-sm">{t('Loading…')}</p> : (
        <div className="space-y-3">{list.map(r => (
          <div key={r.id} className="bg-white rounded-2xl border shadow-sm p-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Icon name="link" size={20} /></span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{r.note || t('Payment link')}</p>
                <p className="text-xs text-gray-500">{r.amount ? `KES ${r.amount.toLocaleString()}` : t('Amount')} • {r.code}</p>
              </div>
              <span className="text-xs bg-gray-100 rounded-full px-2.5 py-1">{t(r.status === 'OPEN' ? 'Open' : r.status === 'PAID' ? 'Paid' : 'Cancelled')}</span>
            </div>
            {r.status === 'OPEN' && (
              <div className="flex gap-2 mt-3">
                <button onClick={() => copy(r.code)} className="flex-1 border rounded-xl py-2 text-sm">{copied === r.code ? t('Copied!') : t('Copy link')}</button>
                <button onClick={() => share(r)} className="flex-1 bg-primary text-white rounded-xl py-2 text-sm">{t('Share')}</button>
                <button onClick={() => cancel(r.id)} className="px-3 text-sm text-red-600">{t('Cancel')}</button>
              </div>)}
          </div>))}</div>)}
    </Screen>
  )
}
