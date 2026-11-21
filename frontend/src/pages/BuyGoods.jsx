import { useState } from 'react'
import { PasswordInput } from '../components/extras'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function BuyGoods() {
  const [tillNumber, setTillNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [pin, setPin] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('hpesa_token')
      const res = await axios.post('/api/transactions/till', { tillNumber, amount, pin }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessage(res.data.message)
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
          <button onClick={() => navigate(-1)} className="mr-4">←</button>
          <h1 className="text-xl font-bold">Buy Goods</h1>
        </div>
      </header>
      <main className="max-w-md mx-auto p-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 space-y-4">
          {error && <div className="bg-red-100 text-red-700 p-3 rounded text-sm">{error}</div>}
          {message && <div className="bg-green-100 text-green-700 p-3 rounded text-sm">{message}</div>}
          
          <input type="text" placeholder="Till Number" value={tillNumber} onChange={e => setTillNumber(e.target.value)} className="w-full px-4 py-3 border rounded-xl" required />
          <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-4 py-3 border rounded-xl" required />
          <PasswordInput placeholder="PIN" maxLength="4" value={pin} onChange={e => setPin(e.target.value)} className="w-full px-4 py-3 border rounded-xl" required />
          
          <button type="submit" disabled={loading} className="w-full bg-primary text-white py-3 rounded-xl font-semibold">
            {loading ? 'Processing...' : 'Pay'}
          </button>
        </form>
      </main>
    </div>
  )
}
