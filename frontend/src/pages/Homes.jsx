import { useEffect, useState } from 'react'
import { PasswordInput } from '../components/extras'
import { Link } from 'react-router-dom'
import axios from 'axios'

export default function Homes() {
  const [myUnit, setMyUnit] = useState(null)
  const [properties, setProperties] = useState([])
  const [amount, setAmount] = useState('')
  const [pin, setPin] = useState('')
  const [message, setMessage] = useState('')
  const token = localStorage.getItem('hpesa_token')

  useEffect(() => {
    axios.get('/api/homes/my-unit', { headers: { Authorization: `Bearer ${token}` } }).then(res => setMyUnit(res.data))
    axios.get('/api/homes/properties').then(res => setProperties(res.data))
  }, [])

  const payRent = async (e) => {
    e.preventDefault()
    try {
      const res = await axios.post('/api/homes/pay-rent', { amount, pin }, { headers: { Authorization: `Bearer ${token}` } })
      setMessage(res.data.message)
      setAmount('')
      setPin('')
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white p-4">
        <div className="max-w-md mx-auto flex items-center">
          <Link to="/" className="mr-4 text-2xl">←</Link>
          <h1 className="text-xl font-bold">Haraka Homes</h1>
        </div>
      </header>
      <main className="max-w-md mx-auto p-4 space-y-6">
        {myUnit && (
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-semibold mb-2">My Unit</h2>
            <p>{myUnit.unit.property.name} - Unit {myUnit.unit.unitNumber}</p>
            <p className="text-primary font-bold">Rent: KES {myUnit.unit.rentAmount.toLocaleString()}</p>
            <form onSubmit={payRent} className="mt-4 space-y-2">
              <input type="number" placeholder="Amount (full or Lipa Mdogo)" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 border rounded-xl" required />
              <PasswordInput placeholder="PIN" value={pin} onChange={e => setPin(e.target.value)} className="w-full px-3 py-2 border rounded-xl" required />
              <button className="w-full bg-primary text-white py-2 rounded-xl">Pay Rent</button>
            </form>
            {message && <p className="text-sm mt-2 text-green-600">{message}</p>}
          </div>
        )}

        <div>
          <h2 className="font-semibold mb-3">Available Apartments</h2>
          {properties.map(p => (
            <div key={p.id} className="bg-white rounded-2xl shadow p-4 mb-3">
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-gray-500">{p.location}</p>
              <p className="text-sm">Units: {p.units.length}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
