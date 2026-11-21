// Device-side helpers: device id, saved wallets (max 3), fingerprint (the phone's own biometric) and lock timing.
export const MAX_WALLETS = 3
const KEEP = ['hpesa_device', 'hpesa_bio', 'hpesa_lang', 'hpesa_wallets']
export const deviceId = () => {
  try {
    let d = localStorage.getItem('hpesa_device')
    if (!d) { d = 'd' + Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join(''); localStorage.setItem('hpesa_device', d) }
    return d
  } catch { return 'd' + Math.random().toString(16).slice(2) + Date.now() }
}
export const wallets = () => { try { return JSON.parse(localStorage.getItem('hpesa_wallets') || '[]') } catch { return [] } }
export const saveWallets = (w) => localStorage.setItem('hpesa_wallets', JSON.stringify(w.slice(0, MAX_WALLETS)))
export const addWallet = (token, user) => {
  const w = wallets().filter(x => x.user.id !== user.id)
  saveWallets([{ token, user }, ...w])
}
export const clearSession = () => {
  Object.keys(localStorage).forEach(k => { if (!KEEP.includes(k)) localStorage.removeItem(k) })
}

// ---- lock timing: PIN after 1 minute away, full login after 24 hours away ----
export const LOCK_AFTER_MS = 60 * 1000
export const LOGOUT_AFTER_MS = 24 * 60 * 60 * 1000
export const touch = () => { try { localStorage.setItem('hpesa_last', String(Date.now())) } catch { /* ignore */ } }
export const awayFor = () => { try { const t = Number(localStorage.getItem('hpesa_last') || 0); return t ? Date.now() - t : Infinity } catch { return Infinity } }

// ---- fingerprint (WebAuthn platform authenticator). It only unlocks the screen on this phone. ----
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const unb64 = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0))
export const bioSupported = async () => {
  try { return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()) } catch { return false }
}
export const bioEnabled = () => { try { return !!localStorage.getItem('hpesa_bio') } catch { return false } }
export const bioDisable = () => { try { localStorage.removeItem('hpesa_bio') } catch { /* ignore */ } }
export const bioEnrol = async (name) => {
  const cred = await navigator.credentials.create({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    rp: { name: 'H-Pesa' },
    user: { id: crypto.getRandomValues(new Uint8Array(16)), name: name || 'wallet', displayName: name || 'wallet' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
    timeout: 60000,
  } })
  localStorage.setItem('hpesa_bio', b64(cred.rawId))
  return true
}
export const bioCheck = async () => {
  const id = localStorage.getItem('hpesa_bio')
  if (!id) return false
  await navigator.credentials.get({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    allowCredentials: [{ type: 'public-key', id: unb64(id) }],
    userVerification: 'required', timeout: 60000,
  } })
  return true
}
