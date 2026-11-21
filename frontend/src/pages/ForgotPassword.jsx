import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { GREEN_GRADIENT } from '../components/ui'
import { Cheetah, PasswordInput } from '../components/extras'
const field = 'w-full px-4 py-3.5 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary'

// mode "password": phone + email + PIN -> new password.  mode "pin": phone + email + password -> new PIN (starts after a wait)
export default function Forgot({ mode }) {
  const isPin = mode === 'pin'
  const [f, setF] = useState({ phone: '', email: '', secret: '', fresh: '' })
  const [msg, setMsg] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(''); setMsg('')
    try {
      const body = isPin ? { phone: f.phone, email: f.email, password: f.secret, newPin: f.fresh } : { phone: f.phone, email: f.email, pin: f.secret, newPassword: f.fresh }
      const r = await axios.post(isPin ? '/api/auth/forgot-pin' : '/api/auth/forgot-password', body)
      setMsg(r.data.message || 'Done.')
    } catch (err) { setError(err.response?.data?.error || 'Something went wrong. Try again.') } finally { setBusy(false) }
  }
  return (
    <div className="min-h-screen flex flex-col" style={{ background: GREEN_GRADIENT }}>
      <div className="flex flex-col items-center text-white pt-8 pb-4"><Cheetah size={56} /><h1 className="text-2xl font-extrabold mt-1">{isPin ? 'Forgot PIN' : 'Forgot password'}</h1></div>
      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-8 flex-1">
        <p className="text-gray-500 text-sm mb-4">{isPin ? 'Enter your phone, email and password. For your safety, the new PIN starts working after 24 hours. If it was not you, use your old PIN once and the change is cancelled.' : 'Enter your phone, email and your current PIN to choose a new password.'}</p>
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 text-sm">{error}</div>}
        {msg && <div className="bg-green-50 text-green-700 p-3 rounded-xl mb-4 text-sm">{msg}</div>}
        <form onSubmit={submit} className="space-y-3">
          <input className={field} type="tel" placeholder="Phone number" value={f.phone} onChange={set('phone')} required />
          <input className={field} type="email" placeholder="Email on the account" value={f.email} onChange={set('email')} required />
          {isPin ? <PasswordInput className={field} placeholder="Your password" value={f.secret} onChange={set('secret')} required />
            : <PasswordInput className={field} inputMode="numeric" maxLength={4} placeholder="Your current PIN" value={f.secret} onChange={set('secret')} required />}
          {isPin ? <PasswordInput className={field} inputMode="numeric" maxLength={4} placeholder="New 4-digit PIN" value={f.fresh} onChange={set('fresh')} pattern="\d{4}" required />
            : <PasswordInput className={field} placeholder="New password (6+ characters)" value={f.fresh} onChange={set('fresh')} minLength={6} required />}
          <button disabled={busy} className="w-full bg-primary text-white py-4 rounded-2xl font-semibold text-lg disabled:opacity-50">{busy ? 'Please wait…' : 'Continue'}</button>
        </form>
        <p className="text-center mt-5 text-sm"><Link to="/login" className="text-primary font-semibold">Back to log in</Link></p>
      </div>
    </div>
  )
}
