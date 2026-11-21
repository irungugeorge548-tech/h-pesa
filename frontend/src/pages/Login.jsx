import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { GREEN_GRADIENT } from '../components/ui'
import { Cheetah, PasswordInput } from '../components/extras'

const field = 'w-full px-4 py-3.5 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary'

export default function Login({ onLogin }) {
  const [q] = useSearchParams()
  const [phone, setPhone] = useState(q.get('phone') || '') // other apps can pre-fill the number of the wallet you connected
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await axios.post('/api/auth/login', { phone: phone.trim(), password })
      onLogin(res.data)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your connection and try again.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: GREEN_GRADIENT }}>
      <div className="flex-1 flex flex-col items-center justify-center text-white pt-10 pb-6">
        <Cheetah size={250} ride className="shadow-xl" />
        <h1 className="text-4xl font-extrabold mt-4">H-Pesa</h1>
        <p className="text-white/80 text-sm mt-1">Haraka Pesa • Fast Money</p>
      </div>

      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-8">
        <h2 className="text-xl font-bold">Welcome back</h2>
        <p className="text-gray-500 text-sm mb-5">Log in with your phone number or @username. Use your <b>password</b> here. The PIN is only for paying.</p>
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" autoCapitalize="none" placeholder="Phone number or @username" value={phone} onChange={e => setPhone(e.target.value)} className={field} required />
          <PasswordInput placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className={field} required />
          <button type="submit" disabled={loading} className="w-full bg-primary text-white py-4 rounded-2xl font-semibold text-lg disabled:opacity-50">
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <div className="flex justify-between mt-4 text-sm">
          <Link to="/forgot-password" className="text-primary font-semibold">Forgot password?</Link>
          <Link to="/forgot-pin" className="text-primary font-semibold">Forgot PIN?</Link>
        </div>
        <p className="text-center mt-5 text-sm">New here? <Link to="/register" className="text-primary font-semibold">Create account</Link></p>
      </div>
    </div>
  )
}
