import { useState } from 'react'
import { PasswordInput } from '../components/extras'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { get } from '../lib/api'
import { Screen, Icon } from '../components/ui'

export default function SendMoney() {
  const [phone, setPhone] = useState('')
  const [who, setWho] = useState('')
  const lookup = () => { if (phone.trim().startsWith('@')) get('/api/account/lookup/' + phone.trim().slice(1)).then(u => setWho(u.name)).catch(() => setWho('No user with that username')) }
  const [amount, setAmount] = useState('')
  const [pin, setPin] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError(''); setMessage('')
    try {
      const token = localStorage.getItem('hpesa_token')
      const res = await axios.post('/api/transactions/send', { phone, amount, pin }, { headers: { Authorization: `Bearer ${token}` } })
      setMessage(res.data.message)
      setTimeout(() => navigate('/'), 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed')
    } finally { setLoading(false) }
  }

  const label = 'block text-sm font-medium text-gray-700 mb-1'
  const field = 'w-full px-4 py-3.5 border rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-primary'

  return (
    <Screen title="Send Money">
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border p-5 space-y-4">
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm">{error}</div>}
        {message && <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm">{message}</div>}

        <div>
          <label className={label}>Phone number or @username</label>
          <input type="text" autoCapitalize="none" placeholder="07XX XXX XXX or @username" value={phone} onChange={e => { setPhone(e.target.value); setWho("") }} onBlur={lookup} className={field} required />
          {who && <p className="text-sm mt-1 text-primary font-semibold">{who}</p>}
        </div>
        <div>
          <label className={label}>Amount (KES)</label>
          <div className="relative">
            <input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} className={`${field} text-2xl font-bold text-primary pr-16`} required />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold bg-primary/10 text-primary rounded-full px-3 py-1">KES</span>
          </div>
          <div className="flex gap-2 mt-2">
            {[500, 1000, 2000, 5000].map(v => (
              <button type="button" key={v} onClick={() => setAmount(String(v))} className="flex-1 border rounded-full py-1.5 text-sm text-gray-600">{v.toLocaleString()}</button>
            ))}
          </div>
        </div>
        <div>
          <label className={label}>H-Pesa PIN</label>
          <PasswordInput inputMode="numeric" placeholder="••••" maxLength="4" value={pin} onChange={e => setPin(e.target.value)} className={field} required />
        </div>

        <button type="submit" disabled={loading} className="w-full bg-primary disabled:opacity-60 text-white py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-2">
          <Icon name="lock" size={20} />{loading ? 'Sending…' : `Send${amount ? ` KES ${Number(amount).toLocaleString()}` : ''}`}
        </button>
        <p className="text-center text-xs text-gray-500">Secured with your PIN</p>
      </form>
    </Screen>
  )
}
