import { useState } from 'react'
import { PasswordInput } from '../components/extras'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function Deposit() {
  const [method, setMethod] = useState('agent') // agent, bank, mpesa
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [pin, setPin] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const token = localStorage.getItem('hpesa_token')
      // Simulate deposit by calling a special endpoint or reuse logic
      // For demo we will just credit via a custom call (we'll add backend support if needed)
      const res = await axios.post('/api/transactions/deposit', {
        method,
        amount,
        reference,
        pin
      }, { headers: { Authorization: `Bearer ${token}` } })
      setMessage(res.data.message)
      setTimeout(() => navigate('/'), 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'Deposit failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white p-4">
        <div className="max-w-md mx-auto flex items-center">
          <button onClick={() => navigate(-1)} className="mr-4 text-2xl">←</button>
          <h1 className="text-xl font-bold">Deposit / Cash In</h1>
        </div>
      </header>
      <main className="max-w-md mx-auto p-4">
        <div className="flex gap-2 mb-4">
          <button onClick={() => setMethod('agent')} className={`flex-1 py-2 rounded-xl text-sm ${method === 'agent' ? 'bg-primary text-white' : 'bg-white'}`}>Agent</button>
          <button onClick={() => setMethod('bank')} className={`flex-1 py-2 rounded-xl text-sm ${method === 'bank' ? 'bg-primary text-white' : 'bg-white'}`}>Bank</button>
          <button onClick={() => setMethod('mpesa')} className={`flex-1 py-2 rounded-xl text-sm ${method === 'mpesa' ? 'bg-primary text-white' : 'bg-white'}`}>M-Pesa</button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 space-y-4">
          {error && <div className="bg-red-100 text-red-700 p-3 rounded text-sm">{error}</div>}
          {message && <div className="bg-green-100 text-green-700 p-3 rounded text-sm">{message}</div>}

          <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-4 py-3 border rounded-xl" required />
          <input type="text" placeholder={method === 'agent' ? 'Agent Number' : method === 'bank' ? 'Bank Reference' : 'M-Pesa Transaction Code'} value={reference} onChange={e => setReference(e.target.value)} className="w-full px-4 py-3 border rounded-xl" required />
          <PasswordInput placeholder="PIN" maxLength="4" value={pin} onChange={e => setPin(e.target.value)} className="w-full px-4 py-3 border rounded-xl" required />

          <button type="submit" disabled={loading} className="w-full bg-primary text-white py-3 rounded-xl font-semibold">
            {loading ? 'Processing...' : `Deposit via ${method.toUpperCase()}`}
          </button>
        </form>
      </main>
    </div>
  )
}
