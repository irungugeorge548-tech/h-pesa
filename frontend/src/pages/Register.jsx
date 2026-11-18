import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

export default function Register({ onLogin }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', pin: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await axios.post('/api/auth/register', form)
      onLogin(res.data)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-green-700 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-primary mb-6">Create Account</h1>
        
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-3">
          <input name="name" placeholder="Full Name" onChange={handleChange} className="w-full px-4 py-3 border rounded-xl" required />
          <input name="phone" placeholder="Phone Number" onChange={handleChange} className="w-full px-4 py-3 border rounded-xl" required />
          <input name="email" type="email" placeholder="Email" onChange={handleChange} className="w-full px-4 py-3 border rounded-xl" required />
          <input name="password" type="password" placeholder="Password" onChange={handleChange} className="w-full px-4 py-3 border rounded-xl" required />
          <input name="pin" type="password" placeholder="4-digit PIN" maxLength="4" onChange={handleChange} className="w-full px-4 py-3 border rounded-xl" required />
          <button type="submit" disabled={loading} className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-green-600">
            {loading ? 'Creating...' : 'Register'}
          </button>
        </form>
        
        <p className="text-center mt-6 text-sm">
          Already have an account? <Link to="/login" className="text-primary font-semibold">Login</Link>
        </p>
      </div>
    </div>
  )
}
