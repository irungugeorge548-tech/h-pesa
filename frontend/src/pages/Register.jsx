import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { Icon, GREEN_GRADIENT } from '../components/ui'
import { useT } from '../i18n'

const field = 'w-full px-4 py-3.5 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary'

export default function Register({ onLogin }) {
  const { t } = useT()
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', pin: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await axios.post('/api/auth/register', form)
      onLogin(res.data)
      navigate('/apps')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: GREEN_GRADIENT }}>
      <div className="flex flex-col items-center text-white pt-10 pb-6">
        <div className="w-16 h-16 rounded-3xl bg-white/15 border border-white/25 flex items-center justify-center"><Icon name="wallet" size={36} /></div>
        <h1 className="text-3xl font-extrabold mt-3">H-Pesa</h1>
      </div>
      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-8 flex-1">
        <h2 className="text-xl font-bold">{t('Create account')}</h2>
        <p className="text-gray-500 text-sm mb-4">Your H-Pesa wallet account</p>
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className={field} placeholder="Full name" value={form.name} onChange={set('name')} required />
          <input className={field} type="tel" placeholder="Phone number (07XX XXX XXX)" value={form.phone} onChange={set('phone')} required />
          <input className={field} type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
          <input className={field} type="password" placeholder="Password (6+ characters)" value={form.password} onChange={set('password')} minLength={6} required />
          <input className={field} type="password" inputMode="numeric" placeholder="4-digit PIN" maxLength={4} pattern="\d{4}" value={form.pin} onChange={set('pin')} required />
          <button type="submit" disabled={loading} className="w-full bg-primary text-white py-4 rounded-2xl font-semibold text-lg disabled:opacity-50">{loading ? 'Creating…' : 'Register'}</button>
        </form>
        <p className="text-center mt-5 text-sm">Already have an account? <Link to="/login" className="text-primary font-semibold">{t('Log in')}</Link></p>
      </div>
    </div>
  )
}
