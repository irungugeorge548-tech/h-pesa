import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Icon, GREEN_GRADIENT } from './ui'
import { bioCheck, bioEnabled } from '../lib/device'

// Haraka Pesa cheetah: friendly, small, spotted.
export function Cheetah({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label="H-Pesa cheetah">
      <circle cx="26" cy="26" r="13" fill="#F2B544" /><circle cx="26" cy="26" r="6" fill="#7A4A12" />
      <circle cx="74" cy="26" r="13" fill="#F2B544" /><circle cx="74" cy="26" r="6" fill="#7A4A12" />
      <ellipse cx="50" cy="56" rx="38" ry="34" fill="#F7C65A" />
      <ellipse cx="50" cy="68" rx="20" ry="15" fill="#FFF1CC" />
      {[[22, 50], [30, 40], [70, 40], [78, 50], [36, 33], [64, 33], [18, 62], [82, 62]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.8" fill="#7A4A12" />)}
      <path d="M36 44c-2 7 0 14 4 18M64 44c2 7 0 14-4 18" stroke="#3B2A10" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <ellipse cx="38" cy="47" rx="4.5" ry="5.5" fill="#fff" /><ellipse cx="62" cy="47" rx="4.5" ry="5.5" fill="#fff" />
      <circle cx="39" cy="48" r="2.8" fill="#1B1B1B" /><circle cx="61" cy="48" r="2.8" fill="#1B1B1B" />
      <path d="M44 62h12l-6 6z" fill="#3B2A10" />
      <path d="M50 68v4M43 74c3 3 11 3 14 0" stroke="#3B2A10" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  )
}

// The username "sticker": a small card people can show or screenshot.
export function Sticker({ user, compact }) {
  if (!user?.username) return null
  return (
    <div className={`rounded-3xl text-white flex items-center gap-3 ${compact ? 'p-3' : 'p-4'}`} style={{ background: GREEN_GRADIENT }}>
      <div className="bg-white/90 rounded-2xl p-1.5 flex-shrink-0"><Cheetah size={compact ? 40 : 52} /></div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-white/75">Haraka Pesa • H-Pesa</p>
        <p className={`font-extrabold truncate ${compact ? 'text-lg' : 'text-2xl'}`}>@{user.username}</p>
        <p className="text-xs text-white/80 truncate">{user.name}</p>
      </div>
    </div>
  )
}

export function Avatar({ user, size = 80 }) {
  return user?.photo
    ? <img src={user.photo} alt="" style={{ width: size, height: size }} className="rounded-full object-cover" />
    : <div style={{ width: size, height: size, fontSize: size / 2.4 }} className="rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">{(user?.name || '?')[0]}</div>
}

// Password / PIN box with a show-hide eye button
export function PasswordInput({ className = '', type: _ignored, ...props }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input {...props} type={show ? 'text' : 'password'} className={`${className} pr-12`} />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide' : 'Show'} className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-gray-500">
        <Icon name={show ? 'eyeoff' : 'eye'} size={20} />
      </button>
    </div>
  )
}

// Shrink a chosen picture to a small JPEG so it fits in the account
export function shrinkImage(file, max = 256) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      resolve(c.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = () => reject(new Error('Could not read that picture'))
    img.src = URL.createObjectURL(file)
  })
}

// Lock screen: PIN only (or fingerprint). Like M-Pesa, it does not ask for the phone number again.
export function LockScreen({ user, onUnlock, onFullLogout }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const ref = useRef()
  const submit = async (p) => {
    setBusy(true); setError('')
    try {
      await axios.post('/api/account/verify-pin', { pin: p }, { headers: { Authorization: `Bearer ${localStorage.getItem('hpesa_token')}` } })
      onUnlock()
    } catch (e) {
      if (e.response?.status === 401) return onFullLogout()
      setError(e.response?.data?.error || 'Could not check your PIN'); setPin('')
    } finally { setBusy(false) }
  }
  const change = (v) => { const d = v.replace(/\D/g, '').slice(0, 4); setPin(d); if (d.length === 4) submit(d) }
  const finger = async () => { try { if (await bioCheck()) onUnlock() } catch { setError('Fingerprint not recognised. Use your PIN.') } }
  useEffect(() => { if (bioEnabled()) finger() }, []) // eslint-disable-line
  return (
    <div className="fixed inset-0 z-[3000] flex flex-col items-center justify-center text-white px-6" style={{ background: GREEN_GRADIENT }} onClick={() => ref.current?.focus()}>
      <div className="bg-white rounded-full p-1"><Avatar user={user} size={84} /></div>
      <p className="text-xl font-bold mt-3">{user?.name}</p>
      <p className="text-white/80 text-sm mb-6">Enter your PIN to continue</p>
      <div className="flex gap-3 mb-3">{[0, 1, 2, 3].map(i => <span key={i} className={`w-4 h-4 rounded-full border-2 border-white ${pin.length > i ? 'bg-white' : ''}`} />)}</div>
      <input ref={ref} autoFocus type="password" inputMode="numeric" value={pin} onChange={e => change(e.target.value)} disabled={busy}
        aria-label="PIN" className="w-40 text-center text-2xl tracking-[0.5em] bg-white/15 rounded-2xl py-3 outline-none placeholder-white/50" placeholder="••••" />
      {error && <p className="bg-white/90 text-red-700 rounded-xl px-3 py-2 text-sm mt-4 text-center">{error}</p>}
      {bioEnabled() && <button onClick={finger} className="mt-6 flex items-center gap-2 bg-white/15 rounded-full px-5 py-3"><Icon name="shield" size={20} /> Use fingerprint</button>}
      <button onClick={onFullLogout} className="mt-8 text-white/80 text-sm underline">Log in with another account</button>
    </div>
  )
}

// ---- receipts ----
export const txTitle = (tx) => tx.description || tx.type
const fmt = (iso) => new Date(iso).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })
export const receiptText = (tx, user) => [
  'H-PESA (HARAKA PESA) RECEIPT', '------------------------------',
  `Reference: ${tx.reference || tx.id}`, `Date: ${fmt(tx.createdAt)}`, `Type: ${tx.type}`, `Details: ${txTitle(tx)}`,
  `Amount: KES ${Number(tx.amount).toLocaleString()}`, `Status: Successful`, `Account: ${user?.name || ''} ${user?.username ? '(@' + user.username + ')' : ''}`,
  '------------------------------', 'Pre-launch demo. Haraka Pesa is not yet a registered company.'].join('\n')
export const download = (name, text, mime = 'text/plain') => {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime })); a.download = name
  document.body.appendChild(a); a.click(); a.remove()
}
export const share = async (title, text) => {
  if (navigator.share) { try { await navigator.share({ title, text }); return true } catch { return false } }
  try { await navigator.clipboard.writeText(text); alert('Copied. You can paste it anywhere.'); return true } catch { return false }
}
export function ReceiptSheet({ tx, user, onClose }) {
  if (!tx) return null
  const text = receiptText(tx, user)
  return (
    <div className="fixed inset-0 z-[2000] bg-black/50 flex items-end" onClick={onClose}>
      <div className="bg-white w-full rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3"><Cheetah size={44} /><div><p className="font-extrabold">Transaction receipt</p><p className="text-xs text-gray-500">{fmt(tx.createdAt)}</p></div></div>
        <pre className="bg-gray-50 border rounded-2xl p-3 text-xs whitespace-pre-wrap">{text}</pre>
        <div className="flex gap-3 mt-4">
          <button onClick={() => share('H-Pesa receipt', text)} className="flex-1 bg-primary text-white rounded-2xl py-3 font-semibold">Share</button>
          <button onClick={() => download(`receipt-${tx.reference || tx.id}.txt`, text)} className="flex-1 border border-primary text-primary rounded-2xl py-3 font-semibold">Download</button>
        </div>
        <button onClick={onClose} className="w-full mt-3 text-gray-500 py-2">Close</button>
      </div>
    </div>
  )
}
