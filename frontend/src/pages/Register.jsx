import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { GREEN_GRADIENT } from '../components/ui'
import { Cheetah, PasswordInput, Sticker } from '../components/extras'
import { useT } from '../i18n'
import { deviceId, bioSupported, bioEnrol } from '../lib/device'

const field = 'w-full px-4 py-3.5 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary'

export default function Register({ onLogin }) {
  const { t } = useT()
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', pin: '' })
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(null) // the new account, shown with its username sticker
  const [canBio, setCanBio] = useState(false)
  const [bioMsg, setBioMsg] = useState('')
  const navigate = useNavigate()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  useEffect(() => { bioSupported().then(setCanBio) }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!accepted) return setError('Please accept the Terms of Use and Privacy Policy to continue')
    setLoading(true); setError('')
    try {
      const res = await axios.post('/api/auth/register', { ...form, acceptTerms: true, deviceId: deviceId() })
      setDone(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Check your connection and try again.')
    } finally { setLoading(false) }
  }
  const finish = () => { onLogin(done); navigate('/apps') }
  const enrol = async () => { try { await bioEnrol(done.user.name); setBioMsg('Fingerprint lock is on.') } catch { setBioMsg('Could not turn it on. You can try later in Account.') } }

  if (done) return (
    <div className="min-h-screen flex flex-col" style={{ background: GREEN_GRADIENT }}>
      <div className="flex flex-col items-center text-white pt-12 pb-6"><Cheetah size={90} /><h1 className="text-2xl font-extrabold mt-2">Karibu, {done.user.name.split(' ')[0]}!</h1><p className="text-white/80 text-sm">Your wallet is ready</p></div>
      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-8 flex-1 space-y-4">
        <div><p className="text-sm text-gray-500 mb-2">This is your username. It is permanent. Share it so friends can send you money.</p><Sticker user={done.user} /></div>
        {canBio && <div className="border rounded-2xl p-4"><p className="font-semibold">Unlock with your fingerprint?</p><p className="text-xs text-gray-500 mb-3">Uses your phone's own fingerprint. Your PIN always still works.</p>
          {bioMsg ? <p className="text-primary text-sm font-semibold">{bioMsg}</p> : <button onClick={enrol} className="w-full border border-primary text-primary py-2.5 rounded-xl font-semibold">Turn on fingerprint</button>}</div>}
        <button onClick={finish} className="w-full bg-primary text-white py-4 rounded-2xl font-semibold text-lg">Continue</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: GREEN_GRADIENT }}>
      <div className="flex flex-col items-center text-white pt-8 pb-4"><Cheetah size={64} /><h1 className="text-3xl font-extrabold mt-1">H-Pesa</h1></div>
      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-8 flex-1">
        <h2 className="text-xl font-bold">{t('Create account')}</h2>
        <p className="text-gray-500 text-sm mb-4">Use your real name: your username is made from it.</p>
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className={field} placeholder="Full name (e.g. Titus Nirungu)" value={form.name} onChange={set('name')} required />
          <input className={field} type="tel" placeholder="Phone number (07XX XXX XXX)" value={form.phone} onChange={set('phone')} required />
          <input className={field} type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
          <PasswordInput className={field} placeholder="Password (6+ characters) for logging in" value={form.password} onChange={set('password')} minLength={6} required />
          <PasswordInput className={field} inputMode="numeric" placeholder="4-digit PIN for paying" maxLength={4} pattern="\d{4}" value={form.pin} onChange={set('pin')} required />
          <label className="flex items-start gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1 w-5 h-5 accent-green-700" />
            <span>I have read and accept the <Link to="/terms" className="text-primary font-semibold underline">Terms of Use</Link> and <Link to="/privacy" className="text-primary font-semibold underline">Privacy Policy</Link>.</span>
          </label>
          <button type="submit" disabled={loading} className="w-full bg-primary text-white py-4 rounded-2xl font-semibold text-lg disabled:opacity-50">{loading ? 'Creating…' : 'Register'}</button>
        </form>
        <p className="text-center mt-5 text-sm">Already have an account? <Link to="/login" className="text-primary font-semibold">{t('Log in')}</Link></p>
      </div>
    </div>
  )
}
