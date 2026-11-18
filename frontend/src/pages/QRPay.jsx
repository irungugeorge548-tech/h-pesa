import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import axios from 'axios'

export default function QRPay() {
  const [mode, setMode] = useState('generate') // generate or scan
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [pin, setPin] = useState('')
  const [qrValue, setQrValue] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('hpesa_user') || '{}')

  const generateQR = () => {
    if (!amount) return setError('Enter amount')
    const payload = JSON.stringify({
      type: 'H-PESA',
      phone: user.phone,
      amount: parseFloat(amount),
      note: note || 'Payment',
      name: user.name
    })
    setQrValue(payload)
    setError('')
  }

  const simulateScanPay = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      const token = localStorage.getItem('hpesa_token')
      const res = await axios.post('/api/transactions/send', {
        phone: '0798765432', // demo recipient
        amount,
        pin
      }, { headers: { Authorization: `Bearer ${token}` } })
      setMessage('QR Payment successful!')
      setTimeout(() => navigate('/'), 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'Payment failed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white p-4">
        <div className="max-w-md mx-auto flex items-center">
          <button onClick={() => navigate(-1)} className="mr-4 text-2xl">←</button>
          <h1 className="text-xl font-bold">QR Payment</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        <div className="flex gap-2 mb-4">
          <button onClick={() => setMode('generate')} className={`flex-1 py-2 rounded-xl ${mode === 'generate' ? 'bg-primary text-white' : 'bg-white'}`}>
            Generate QR
          </button>
          <button onClick={() => setMode('scan')} className={`flex-1 py-2 rounded-xl ${mode === 'scan' ? 'bg-primary text-white' : 'bg-white'}`}>
            Scan & Pay
          </button>
        </div>

        {mode === 'generate' && (
          <div className="bg-white rounded-2xl shadow p-6 space-y-4">
            <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-4 py-3 border rounded-xl" />
            <input type="text" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} className="w-full px-4 py-3 border rounded-xl" />
            <button onClick={generateQR} className="w-full bg-primary text-white py-3 rounded-xl font-semibold">Generate QR</button>
            
            {qrValue && (
              <div className="flex flex-col items-center mt-4">
                <QRCodeSVG value={qrValue} size={200} />
                <p className="text-sm text-gray-500 mt-2">Show this QR to receive payment</p>
              </div>
            )}
          </div>
        )}

        {mode === 'scan' && (
          <form onSubmit={simulateScanPay} className="bg-white rounded-2xl shadow p-6 space-y-4">
            {error && <div className="bg-red-100 text-red-700 p-3 rounded text-sm">{error}</div>}
            {message && <div className="bg-green-100 text-green-700 p-3 rounded text-sm">{message}</div>}
            <p className="text-sm text-gray-600 text-center">Demo: Scanning QR of 0798765432</p>
            <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-4 py-3 border rounded-xl" required />
            <input type="password" placeholder="PIN" maxLength="4" value={pin} onChange={e => setPin(e.target.value)} className="w-full px-4 py-3 border rounded-xl" required />
            <button type="submit" className="w-full bg-primary text-white py-3 rounded-xl font-semibold">Pay via QR</button>
          </form>
        )}
      </main>
    </div>
  )
}
