import { useEffect, useState } from 'react'
import { Screen, TxRow } from '../components/ui'
import { get } from '../lib/api'
import { ReceiptSheet, download, share } from '../components/extras'

const field = 'px-3 py-2.5 border rounded-xl bg-white w-full'
const iso = (d) => d.toISOString().slice(0, 10)
export default function Statement() {
  const user = JSON.parse(localStorage.getItem('hpesa_user') || '{}')
  const [all, setAll] = useState(null)
  const [from, setFrom] = useState(iso(new Date(Date.now() - 30 * 864e5)))
  const [to, setTo] = useState(iso(new Date()))
  const [open, setOpen] = useState(null)
  useEffect(() => { get('/api/transactions/history').then(setAll).catch(() => setAll([])) }, [])
  const rows = (all || []).filter(t => { const d = iso(new Date(t.createdAt)); return d >= from && d <= to })
  const csv = () => ['Date,Type,Details,Amount (KES)', ...rows.map(t => [new Date(t.createdAt).toISOString(), t.type, `"${(t.description || '').replace(/"/g, '""')}"`, t.amount].join(','))].join('\n')
  const text = () => `H-PESA STATEMENT ${from} to ${to}\n${user.name || ''} ${user.username ? '@' + user.username : ''}\n\n` + rows.map(t => `${new Date(t.createdAt).toLocaleDateString('en-KE')}  ${t.type}  KES ${t.amount}  ${t.description || ''}`).join('\n')
  return (
    <Screen title="Statements">
      <div className="bg-white rounded-3xl border shadow-sm p-4 space-y-3">
        <div className="flex gap-3"><label className="flex-1 text-xs text-gray-500">From<input type="date" value={from} onChange={e => setFrom(e.target.value)} className={field} /></label>
          <label className="flex-1 text-xs text-gray-500">To<input type="date" value={to} onChange={e => setTo(e.target.value)} className={field} /></label></div>
        <div className="flex gap-2">
          <button onClick={() => download(`hpesa-statement-${from}-${to}.csv`, csv(), 'text/csv')} className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-semibold">Download</button>
          <button onClick={() => share('H-Pesa statement', text())} className="flex-1 border border-primary text-primary rounded-xl py-2.5 text-sm font-semibold">Share</button>
          <button onClick={() => window.print()} className="flex-1 border rounded-xl py-2.5 text-sm font-semibold text-gray-600">Print / PDF</button>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-4 mb-2">{all === null ? 'Loading…' : `${rows.length} transaction(s). Tap one for its receipt.`}</p>
      <div className="bg-white rounded-3xl border shadow-sm px-4">
        {rows.map(tx => <div key={tx.id} onClick={() => setOpen(tx)}><TxRow tx={tx} userId={user.id} /></div>)}
      </div>
      <ReceiptSheet tx={open} user={user} onClose={() => setOpen(null)} />
    </Screen>
  )
}
