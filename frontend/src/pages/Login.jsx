import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { Icon, GREEN_GRADIENT } from '../components/ui'

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
      const res = await axios.post('/api/auth/login', { phone, password })
      onLogin(res.data)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: GREEN_GRADIENT }}>
      <div className="flex-1 flex flex-col items-center justify-center text-white pt-10 pb-6">
        <div className="w-20 h-20 rounded-3xl bg-white/15 border border-white/25 flex items-center justify-center">
          <Icon name="wallet" size={44} />
        </div>
        <h1 className="text-4xl font-extrabold mt-4">H-Pesa</h1>
        <p className="text-white/80 text-sm mt-1">Haraka Pesa • Fast Money</p>
      </div>

      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-8">
        <h2 className="text-xl font-bold">Welcome back</h2>
        <p className="text-gray-500 text-sm mb-5">Log in to your wallet</p>
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="tel" placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)}
            className="w-full px-4 py-3.5 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary" required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-3.5 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary" required />
          <button type="submit" disabled={loading} className="w-full bg-primary text-white py-4 rounded-2xl font-semibold text-lg disabled:opacity-50">
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <p className="text-center mt-5 text-sm">New here? <Link to="/register" className="text-primary font-semibold">Create account</Link></p>
      </div>
    </div>
  )
}
