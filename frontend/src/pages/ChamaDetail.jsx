import { useEffect, useState } from 'react'
import { PasswordInput } from '../components/extras'
import { useParams } from 'react-router-dom'
import { Screen, Icon } from '../components/ui'
import { useT } from '../i18n'
import { get, post, errMsg } from '../lib/api'

export default function ChamaDetail() {
  const { id } = useParams()
  const { t } = useT()
  const [c, setC] = useState(null)
  const [action, setAction] = useState(null) // 'contribute' | 'payout'
  const [pin, setPin] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => get(`/api/chama/${id}`).then(setC).catch(e => setError(errMsg(e)))
  useEffect(() => { load() }, [id])

  const run = async (e) => {
    e.preventDefault(); setBusy(true); setError(''); setMsg('')
    try {
      const r = await post(`/api/chama/${id}/${action}`, { pin })
      setMsg(r.message); setAction(null); setPin(''); await load()
    } catch (err) { setError(errMsg(err, t('Something went wrong'))) } finally { setBusy(false) }
  }

  if (!c) return <Screen title="Chama">{error ? <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm">{error}</div> : <p className="text-gray-400">{t('Loading…')}</p>}</Screen>

  return (
    <Screen title={c.name}>
      {msg && <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm mb-3">{msg}</div>}
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm mb-3">{error}</div>}

      <div className="bg-white rounded-3xl border shadow-sm p-5">
        <div className="flex justify-between text-sm text-gray-500"><span>{t('Round')} {c.currentCycle}</span><span>{c.memberCount} {t('members')}</span></div>
        <p className="text-sm text-gray-500 mt-3">{t('Pot')}</p>
        <p className="text-3xl font-extrabold text-primary">KES {c.balance.toLocaleString()}</p>
        <p className="text-xs text-gray-500 mt-1">KES {c.contributionAmount.toLocaleString()} {t(c.frequency === 'WEEKLY' ? 'Weekly' : 'Monthly')}</p>
        {c.status === 'FORMING' && (
          <div className="mt-4 bg-primary/10 rounded-2xl p-3 text-center">
            <p className="text-xs text-gray-600">{t('Share this code so friends can join:')}</p>
            <p className="text-2xl font-extrabold tracking-widest text-primary mt-1">{c.code}</p>
          </div>)}
      </div>

      {c.nextRecipient && c.status !== 'COMPLETED' && (
        <p className="text-sm text-center text-gray-600 mt-3">{t('Next to receive')}: <b>{c.nextRecipient.name}</b></p>)}

      <div className="bg-white rounded-2xl border shadow-sm mt-3 px-4">
        {c.members.map(m => (
          <div key={m.userId} className="flex items-center gap-3 py-3 border-b last:border-0">
            <span className="w-8 h-8 rounded-full bg-gray-100 text-xs font-bold flex items-center justify-center">{m.position}</span>
            <p className="flex-1 font-medium">{m.name}{m.isMe ? ` (${t('You')})` : ''}</p>
            <span className={`text-xs rounded-full px-2.5 py-1 ${m.contributed ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}>{m.contributed ? t('Paid') : t('Not yet')}</span>
          </div>))}
      </div>

      {c.status !== 'COMPLETED' && !action && (
        <div className="mt-4 space-y-2">
          {!c.iContributed && c.memberCount >= 2 && (
            <button onClick={() => setAction('contribute')} className="w-full bg-primary text-white py-3.5 rounded-2xl font-semibold">{t('Contribute')} KES {c.contributionAmount.toLocaleString()}</button>)}
          {c.canPayout && c.isCreator && (<>
            <p className="text-xs text-center text-gray-500">{t('Everyone has paid. The pot can be released.')}</p>
            <button onClick={() => setAction('payout')} className="w-full border-2 border-primary text-primary py-3.5 rounded-2xl font-semibold">{t('Release payout')}</button></>)}
        </div>)}

      {action && (
        <form onSubmit={run} className="bg-white rounded-3xl border shadow-sm p-5 mt-4 space-y-3">
          <label className="block text-sm font-medium text-gray-700">{t('H-Pesa PIN')}</label>
          <PasswordInput inputMode="numeric" maxLength={4} placeholder="••••" value={pin} onChange={e => setPin(e.target.value)} className="w-full px-4 py-3.5 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary" required autoFocus />
          <div className="flex gap-2">
            <button type="button" onClick={() => { setAction(null); setPin('') }} className="flex-1 border rounded-2xl py-3">{t('Cancel')}</button>
            <button disabled={busy} className="flex-1 bg-primary disabled:opacity-60 text-white rounded-2xl py-3 font-semibold flex items-center justify-center gap-2"><Icon name="lock" size={18} />{t('Confirm')}</button>
          </div>
        </form>)}
    </Screen>
  )
}
