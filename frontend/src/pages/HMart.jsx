import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

export default function HMart() {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [pin, setPin] = useState('')
  const [message, setMessage] = useState('')
  const token = localStorage.getItem('hpesa_token')

  useEffect(() => {
    axios.get('/api/mart/products').then(res => setProducts(res.data))
  }, [])

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...product, qty: 1 }]
    })
  }

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0)

  const checkout = async () => {
    if (!pin) return setMessage('Enter PIN')
    try {
      // First add items to backend cart then checkout (simplified)
      for (const item of cart) {
        await axios.post('/api/mart/cart', { productId: item.id, quantity: item.qty }, { headers: { Authorization: `Bearer ${token}` } })
      }
      const res = await axios.post('/api/mart/checkout', { pin }, { headers: { Authorization: `Bearer ${token}` } })
      setMessage(res.data.message)
      setCart([])
      setPin('')
    } catch (err) {
      setMessage(err.response?.data?.error || 'Checkout failed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white p-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="mr-4 text-2xl">←</Link>
            <h1 className="text-xl font-bold">H-Mart</h1>
          </div>
          <span className="bg-white text-primary px-3 py-1 rounded-full text-sm">{cart.length} items</span>
        </div>
      </header>
      <main className="max-w-md mx-auto p-4">
        <div className="grid grid-cols-2 gap-3 mb-6">
          {products.map(p => (
            <div key={p.id} className="bg-white rounded-xl shadow p-3">
              <div className="h-20 bg-gray-100 rounded mb-2 flex items-center justify-center text-2xl">🛒</div>
              <p className="font-medium text-sm">{p.name}</p>
              <p className="text-primary font-bold">KES {p.price}</p>
              <button onClick={() => addToCart(p)} className="mt-2 w-full bg-primary text-white text-sm py-1 rounded-lg">Add</button>
            </div>
          ))}
        </div>

        {cart.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-semibold mb-2">Basket</h2>
            {cart.map(i => (
              <div key={i.id} className="flex justify-between text-sm py-1">
                <span>{i.name} x{i.qty}</span>
                <span>KES {i.price * i.qty}</span>
              </div>
            ))}
            <p className="font-bold mt-2">Total: KES {total.toLocaleString()}</p>
            <input type="password" placeholder="PIN" value={pin} onChange={e => setPin(e.target.value)} className="w-full mt-2 px-3 py-2 border rounded-xl" />
            <button onClick={checkout} className="w-full bg-primary text-white py-2 rounded-xl mt-2">Checkout with H-Pesa</button>
            {message && <p className="text-sm mt-2 text-green-600">{message}</p>}
          </div>
        )}
      </main>
    </div>
  )
}
