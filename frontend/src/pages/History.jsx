import { useEffect, useState } from 'react'
import axios from 'axios'
import { Screen, TxRow } from '../components/ui'

export default function History() {
  const [transactions, setTransactions] = useState(null)
  const user = JSON.parse(localStorage.getItem('hpesa_user') || '{}')

  useEffect(() => {
    const token = localStorage.getItem('hpesa_token')
    axios.get('/api/transactions/history', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setTransactions(res.data))
      .catch(() => setTransactions([]))
  }, [])

  return (
    <Screen title="Transactions" tabbar>
      <div className="bg-white rounded-3xl border shadow-sm px-4">
        {transactions === null && <p className="py-10 text-center text-gray-400">Loading…</p>}
        {transactions && transactions.length === 0 && <p className="py-10 text-center text-gray-400">No transactions yet</p>}
        {transactions && transactions.map(tx => <TxRow key={tx.id} tx={tx} userId={user.id} />)}
      </div>
    </Screen>
  )
}
