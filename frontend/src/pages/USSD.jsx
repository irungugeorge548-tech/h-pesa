import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function USSD() {
  const [screen, setScreen] = useState('menu')
  const [input, setInput] = useState('')
  const [message, setMessage] = useState('')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const navigate = useNavigate()
  const token = localStorage.getItem('hpesa_token')

  const sendRequest = async (type, data) => {
    try {
      if (type === 'balance') {
        const res = await axios.get('/api/wallet/balance', { headers: { Authorization: `Bearer ${token}` } })
        setMessage(`Balance: KES ${res.data.balance.toLocaleString()}`)
        setScreen('result')
      } else if (type === 'send') {
        const res = await axios.post('/api/transactions/send', { phone, amount, pin: '1234' }, { headers: { Authorization: `Bearer ${token}` } })
        setMessage(res.data.message)
        setScreen('result')
      }
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed')
      setScreen('result')
    }
  }

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono flex items-center justify-center p-4">
      <div className="w-full max-w-sm border-4 border-green-600 rounded-lg p-4 bg-black">
        <div className="text-center text-xs mb-2 text-green-600">H-PESA USSD *384*1#</div>
        
        {screen === 'menu' && (
          <div>
            <p className="mb-4">H-Pesa Menu</p>
            <p>1. Send Money</p>
            <p>2. Check Balance</p>
            <p>3. Pay Bill</p>
            <p>4. Buy Goods</p>
            <p>5. Exit</p>
            <input
              autoFocus
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (input === '1') setScreen('send')
                  else if (input === '2') sendRequest('balance')
                  else if (input === '5') navigate('/')
                  setInput('')
                }
              }}
              className="w-full mt-4 bg-black border border-green-600 text-green-400 p-2"
              placeholder="Enter option"
            />
          </div>
        )}

        {screen === 'send' && (
          <div>
            <p>Enter phone number:</p>
            <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-black border border-green-600 text-green-400 p-2 my-2" />
            <p>Enter amount:</p>
            <input value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-black border border-green-600 text-green-400 p-2 my-2" />
            <button onClick={() => sendRequest('send')} className="w-full bg-green-700 text-black py-2 mt-2">Send</button>
            <button onClick={() => setScreen('menu')} className="w-full mt-2 text-green-400">Back</button>
          </div>
        )}

        {screen === 'result' && (
          <div>
            <p className="mb-4">{message}</p>
            <button onClick={() => { setScreen('menu'); setMessage('') }} className="w-full bg-green-700 text-black py-2">OK</button>
          </div>
        )}
      </div>
    </div>
  )
}
