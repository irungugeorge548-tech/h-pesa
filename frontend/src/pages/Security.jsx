import { useState } from 'react'
import { Screen, Icon } from '../components/ui'
import { useT } from '../i18n'
import { post, errMsg } from '../lib/api'

const field = 'w-full px-4 py-3.5 border rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-primary'

function Card({ title, children, onSubmit, msg, error, busy }) {
  const { t } = useT()
  return (
    <form onSubmit={onSubmit} className="bg-white rounded-3xl border shadow-sm p-5 space-y-3 mb-4">
      <h2 className="font-bold flex items-center gap-2"><Icon name="lock" size={18} className="text-primary" />{t(title)}</h2>
      {msg && <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm">{msg}</div>}
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm">{error}</div>}
      {children}
      <button disabled={busy} className="w-full bg-primary disabled:opacity-60 text-white py-3.5 rounded-2xl font-semibold">{t('Save')}</button>
    </form>
  )
}

export default function Security() {
  const { t } = useT()
  const [pin, setPin] = useState({ currentPin: '', newPin: '' })
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' })
  const [pinState, setPinState] = useState({})
  const [pwState, setPwState] = useState({})

  const run = (setState, url, body, reset) => async (e) => {
    e.preventDefault(); setState({ busy: true })
    try { const r = await post(url, body); setState({ msg: t(r.message) }); reset() }
    catch (err) { setState({ error: errMsg(err, t('Something went wrong')) }) }
  }

  return (
    <Screen title="PIN & Security">
      <Card title="Change PIN" onSubmit={run(setPinState, '/api/account/change-pin', pin, () => setPin({ currentPin: '', newPin: '' }))} {...pinState}>
        <input className={field} type="password" inputMode="numeric" maxLength={4} placeholder={t('Current PIN')} value={pin.currentPin} onChange={e => setPin({ ...pin, currentPin: e.target.value })} required />
        <input className={field} type="password" inputMode="numeric" maxLength={4} placeholder={t('New 4-digit PIN')} value={pin.newPin} onChange={e => setPin({ ...pin, newPin: e.target.value })} required />
      </Card>
      <Card title="Change password" onSubmit={run(setPwState, '/api/account/change-password', pw, () => setPw({ currentPassword: '', newPassword: '' }))} {...pwState}>
        <input className={field} type="password" placeholder={t('Current password')} value={pw.currentPassword} onChange={e => setPw({ ...pw, currentPassword: e.target.value })} required />
        <input className={field} type="password" placeholder={t('New password (6+ characters)')} value={pw.newPassword} onChange={e => setPw({ ...pw, newPassword: e.target.value })} required />
      </Card>
      <p className="text-xs text-gray-500 text-center">{t('Never share your PIN. H-Pesa will never ask for it by phone or message.')}</p>
    </Screen>
  )
}
