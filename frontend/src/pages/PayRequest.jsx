import { useEffect, useState } from 'react'
import { PasswordInput } from '../components/extras'
import { Link, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { Icon, GREEN_GRADIENT } from '../components/ui'
import { useT } from '../i18n'
import { post, setRedirect, errMsg } from '../lib/api'

// Opened from a shared payment link. Anyone can look; paying needs a login.
export default function PayRequest({ loggedIn }) {
  const { code } = useParams()
  const { t } = useT()
  const navigate = useNavigate()
  const [info, setInfo] = useState(null)
  const [missing, setMissing] = useState(false)
  const [amount, setAmount] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    axios.get(`/api/requests/public/${code}`).then(r => setInfo(r.data)).catch(() => setMissing(true))
  }, [code])

  const pay = async (e) => {
    e.preventDefault(); setBusy(true); setError('')
    try {
      const r = await post(`/api/requests/${code}/pay`, { pin, amount: info.amount ? undefined : amount })
      setDone(r.message); setTimeout(() => navigate('/'), 1800)
    } catch (err) { setError(errMsg(err, t('Something went wrong'))) } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: GREEN_GRADIENT }}>
      <div className="flex-1 flex flex-col items-center justify-center text-white py-8">
        <div className="w-16 h-16 rounded-3xl bg-white/15 border border-white/25 flex items-center justify-center"><Icon name="wallet" size={36} /></div>
        <h1 className="text-2xl font-extrabold mt-3">H-Pesa</h1>
      </div>
      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-10">
        {missing ? <p className="text-center text-gray-600">{t('Request not found')}</p> : !info ? <p className="text-center text-gray-400">{t('Loading…')}</p> : (<>
          <p className="text-center text-gray-500 text-sm">{info.requesterName} {t('asks you to pay')}</p>
          {info.amount && <p className="text-center text-4xl font-extrabold text-primary mt-2">KES {info.amount.toLocaleString()}</p>}
          {info.note && <p className="text-center text-gray-700 mt-1">{info.note}</p>}
          {info.status !== 'OPEN' ? <p className="text-center text-gray-500 mt-6">{t('This request is no longer open')}</p>
            : !loggedIn ? (
              <Link to="/login" onClick={() => setRedirect(`/pay/${code}`)} className="block text-center bg-primary text-white py-4 rounded-2xl font-semibold mt-6">{t('Log in to pay')}</Link>
            ) : done ? <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm mt-6 text-center">{done}</div> : (
              <form onSubmit={pay} className="space-y-3 mt-6">
                {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm">{error}</div>}
                {!info.amount && <input type="number" inputMode="decimal" placeholder={t('Amount (KES)')} value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-4 py-3.5 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary" required />}
                <PasswordInput inputMode="numeric" maxLength={4} placeholder={t('H-Pesa PIN')} value={pin} onChange={e => setPin(e.target.value)} className="w-full px-4 py-3.5 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary" required />
                <button disabled={busy} className="w-full bg-primary disabled:opacity-60 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"><Icon name="lock" size={20} />{t('Pay')}</button>
              </form>)}
        </>)}
      </div>
    </div>
  )
}
