import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const BUNDLES = [
  { name: 'Daily 1GB', amount: 50 },
  { name: 'Weekly 5GB', amount: 300 },
  { name: 'Monthly 10GB', amount: 1000 },
  { name: 'Monthly 20GB', amount: 2000 },
]

export default function Bundles() {
  const [phone, setPhone] = useState('')
  const [selected, setSelected] = useState(null)
  const [pin, setPin] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selected) return setError('Select a bundle')
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('hpesa_token')
      const res = await axios.post('/api/transactions/send', {
        phone,
        amount: selected.amount,
        pin
      }, { headers: { Authorization: `Bearer ${token}` } })
      setMessage(`${selected.name} sent to ${phone}`)
      setTimeout(() => navigate('/'), 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white p-4">
        <div className="max-w-md mx-auto flex items-center">
          <button onClick={() => navigate(-1)} className="mr-4 text-2xl">←</button>
          <h1 className="text-xl font-bold">Buy Data Bundles</h1>
        </div>
      </header>
      <main className="max-w-md mx-auto p-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 space-y-4">
          {error && <div className="bg-red-100 text-red-700 p-3 rounded text-sm">{error}</div>}
          {message && <div className="bg-green-100 text-green-700 p-3 rounded text-sm">{message}</div>}

          <input type="text" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-3 border rounded-xl" required />

          <div className="space-y-2">
            {BUNDLES.map(b => (
              <button type="button" key={b.name} onClick={() => setSelected(b)} className={`w-full text-left p-3 rounded-xl border ${selected?.name === b.name ? 'bg-primary text-white' : ''}`}>
                {b.name} — KES {b.amount}
              </button>
            ))}
          </div>

          <input type="password" placeholder="PIN" maxLength="4" value={pin} onChange={e => setPin(e.target.value)} className="w-full px-4 py-3 border rounded-xl" required />
          <button type="submit" disabled={loading} className="w-full bg-primary text-white py-3 rounded-xl font-semibold">
            {loading ? 'Processing...' : 'Buy Bundle'}
          </button>
        </form>
      </main>
    </div>
  )
}
