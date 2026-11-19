import { useEffect, useState } from 'react'
import { Screen, TxRow } from '../components/ui'
import { useT } from '../i18n'
import { get } from '../lib/api'

const KEY = 'hpesa_notif_seen'
const readSeen = () => { try { return Number(localStorage.getItem(KEY)) || 0 } catch { return 0 } }

// Account activity as alerts: money in, money out, refunds. (No push messages yet; this is the in-app feed.)
export default function Notifications({ user }) {
  const { t } = useT()
  const [list, setList] = useState(null)
  const [seen, setSeen] = useState(readSeen)

  useEffect(() => { get('/api/transactions/history').then(setList).catch(() => setList([])) }, [])

  const markAll = () => {
    const now = Date.now()
    try { localStorage.setItem(KEY, String(now)) } catch { /* ignore */ }
    setSeen(now)
  }
  const unread = (list || []).filter(x => new Date(x.createdAt).getTime() > seen).length

  return (
    <Screen title="Notifications">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-600">{unread ? `${unread} ${t('new')}` : t('You are all caught up')}</p>
        {unread > 0 && <button onClick={markAll} className="text-sm text-primary font-medium">{t('Mark all as read')}</button>}
      </div>
      <div className="bg-white rounded-2xl border px-3">
        {list === null ? <p className="text-gray-400 text-sm py-6 text-center">{t('Loading…')}</p>
          : list.length === 0 ? <p className="text-gray-400 text-sm py-6 text-center">{t('No transactions yet')}</p>
          : list.slice(0, 40).map(tx => (
            <div key={tx.id} className="relative">
              {new Date(tx.createdAt).getTime() > seen && <span className="absolute left-0 top-5 w-2 h-2 rounded-full bg-primary" />}
              <TxRow tx={tx} userId={user?.id} />
            </div>))}
      </div>
    </Screen>
  )
}
