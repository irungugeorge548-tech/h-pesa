import { useEffect, useState } from 'react'
import { Screen } from '../components/ui'
import { useT } from '../i18n'
import { Avatar, Sticker, shrinkImage } from '../components/extras'
import { get, patch, errMsg } from '../lib/api'

const field = 'w-full px-4 py-3.5 border rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-primary'

export default function Profile({ onUser }) {
  const { t } = useT()
  const [me, setMe] = useState(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { get('/api/account/me').then(u => { setMe(u); setName(u.name); setEmail(u.email) }).catch(e => setError(errMsg(e))) }, [])

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setError(''); setMsg('')
    try {
      const u = await patch('/api/account/profile', { name, email })
      setMe(u); onUser?.({ id: u.id, name: u.name, phone: u.phone, email: u.email, username: u.username, photo: u.photo }); setMsg(t('Saved'))
    } catch (err) { setError(errMsg(err, t('Something went wrong'))) } finally { setBusy(false) }
  }

  const pick = async (e) => {
    const f = e.target.files?.[0]; if (!f) return
    setError(''); setMsg('')
    try { const u = await patch('/api/account/photo', { photo: await shrinkImage(f) }); setMe(u); onUser?.({ id: u.id, name: u.name, phone: u.phone, email: u.email, username: u.username, photo: u.photo }); setMsg(t('Saved')) } catch (err) { setError(errMsg(err, 'Could not use that picture')) }
  }
  const removePhoto = async () => { try { const u = await patch('/api/account/photo', { photo: null }); setMe(u); onUser?.({ id: u.id, name: u.name, phone: u.phone, email: u.email, username: u.username, photo: null }) } catch (err) { setError(errMsg(err)) } }
  return (
    <Screen title="Profile">
      {!me ? <p className="text-gray-400">{error || t('Loading…')}</p> : (
        <>
        <div className="bg-white rounded-3xl border shadow-sm p-5 mb-4 flex flex-col items-center gap-3">
          <Avatar user={me} size={96} />
          <div className="flex gap-3 text-sm">
            <label className="text-primary font-semibold cursor-pointer">Change photo<input type="file" accept="image/*" onChange={pick} className="hidden" /></label>
            {me.photo && <button onClick={removePhoto} className="text-gray-500">Remove</button>}
          </div>
          <div className="w-full"><Sticker user={me} compact /></div>
        </div>
        <form onSubmit={save} className="bg-white rounded-3xl border shadow-sm p-5 space-y-4">
          {msg && <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm">{msg}</div>}
          {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm">{error}</div>}
          <div><label className="block text-sm text-gray-700 mb-1">{t('Full name')}</label><input className={field} value={name} onChange={e => setName(e.target.value)} required /></div>
          <div><label className="block text-sm text-gray-700 mb-1">{t('Email')}</label><input className={field} type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div><label className="block text-sm text-gray-700 mb-1">{t('Phone number')}</label><input className={`${field} bg-gray-50 text-gray-500`} value={me.phone} disabled /><p className="text-xs text-gray-500 mt-1">{t('Your phone number is your H-Pesa number and cannot be changed here.')}</p></div>
          <button disabled={busy} className="w-full bg-primary disabled:opacity-60 text-white py-3.5 rounded-2xl font-semibold">{t('Save')}</button>
        </form></>)}
    </Screen>
  )
}
