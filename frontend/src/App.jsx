import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useState, useEffect } from 'react'
import Splash from './pages/Splash'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import SendMoney from './pages/SendMoney'
import PayBill from './pages/PayBill'
import BuyGoods from './pages/BuyGoods'
import History from './pages/History'
import QRPay from './pages/QRPay'
import Airtime from './pages/Airtime'
import Withdraw from './pages/Withdraw'
import Deposit from './pages/Deposit'
import Bundles from './pages/Bundles'
import USSD from './pages/USSD'
import Homes from './pages/Homes'
import HMart from './pages/HMart'
import Services from './pages/Services'
import Account from './pages/Account'
import Chama from './pages/Chama'
import ChamaDetail from './pages/ChamaDetail'
import Requests from './pages/Requests'
import PayRequest from './pages/PayRequest'
import AutoPay from './pages/AutoPay'
import Rewards from './pages/Rewards'
import Profile from './pages/Profile'
import Security from './pages/Security'
import Notifications from './pages/Notifications'
import ConnectApps from './pages/ConnectApps'
import ForgotPassword from './pages/ForgotPassword'
import Legal from './pages/Legal'
import Statement from './pages/Statement'
import Support from './pages/Support'
import Wallets from './pages/Wallets'
import { LockScreen } from './components/extras'
import { peekRedirect, clearRedirect } from './lib/api'
import { addWallet, wallets, saveWallets, clearSession, touch, awayFor, LOCK_AFTER_MS, LOGOUT_AFTER_MS } from './lib/device'

// After logging in from a shared payment link, go back to that link instead of Home
function HomeOrRedirect({ user, logout }) {
  // read without removing (React may run this twice in development), clear once shown
  const [target] = useState(() => peekRedirect())
  useEffect(() => { if (target) clearRedirect() }, [target])
  return target ? <Navigate to={target} replace /> : <Dashboard user={user} logout={logout} />
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('hpesa_token'))
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('hpesa_user') || 'null'))
  // Show the splash once per browser session
  const [showSplash, setShowSplash] = useState(() => {
    try { return !sessionStorage.getItem('hpesa_splash_seen') } catch { return true }
  })
  const finishSplash = () => {
    try { sessionStorage.setItem('hpesa_splash_seen', '1') } catch {}
    setShowSplash(false)
  }

  const login = (data) => {
    addWallet(data.token, data.user)
    touch()
    setLocked(false)
    localStorage.setItem('hpesa_token', data.token)
    localStorage.setItem('hpesa_user', JSON.stringify(data.user))
    setToken(data.token)
    setUser(data.user)
  }

  const updateUser = (u) => {
    localStorage.setItem('hpesa_user', JSON.stringify(u))
    setUser(u)
  }

  const logout = () => {
    // remove only this wallet; if another saved wallet remains, continue with it
    const rest = wallets().filter(w => w.user.id !== user?.id)
    saveWallets(rest)
    clearSession()
    if (rest.length) { switchTo(rest[0]) } else { setToken(null); setUser(null) }
    setLocked(false)
  }
  const switchTo = (w) => {
    localStorage.setItem('hpesa_token', w.token); localStorage.setItem('hpesa_user', JSON.stringify(w.user))
    setToken(w.token); setUser(w.user); touch(); setLocked(false)
  }

  // Lock screen: PIN after a minute away; full login after a long absence
  const [locked, setLocked] = useState(() => !!localStorage.getItem('hpesa_token') && awayFor() > LOCK_AFTER_MS)
  useEffect(() => {
    if (token && awayFor() > LOGOUT_AFTER_MS) { saveWallets([]); clearSession(); setToken(null); setUser(null); setLocked(false) }
    const mark = () => { if (document.visibilityState === 'hidden') touch() }
    const back = () => {
      if (document.visibilityState !== 'visible' || !localStorage.getItem('hpesa_token')) return
      const a = awayFor()
      if (a > LOGOUT_AFTER_MS) { saveWallets([]); clearSession(); setToken(null); setUser(null) }
      else if (a > LOCK_AFTER_MS) setLocked(true)
      else touch()
    }
    const beat = setInterval(() => { if (document.visibilityState === 'visible' && !locked) touch() }, 5000)
    document.addEventListener('visibilitychange', mark); document.addEventListener('visibilitychange', back)
    window.addEventListener('pagehide', touch)
    return () => { clearInterval(beat); document.removeEventListener('visibilitychange', mark); document.removeEventListener('visibilitychange', back); window.removeEventListener('pagehide', touch) }
  }, [token, locked])

  // Arriving from another app (for example H-Fleet's "Top up"): open THIS wallet, the one that app is connected to,
  // even if a different H-Pesa account was logged in on this phone. The token travels in the address
  // fragment (never sent to a server) and is removed from the address bar straight away.
  const navigate = useNavigate()
  const handoff = () => {
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const sso = h.get('sso')
    if (!sso) return
    const next = ['/deposit', '/'].includes(h.get('next')) ? h.get('next') : '/'
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    axios.get('/api/account/me', { headers: { Authorization: `Bearer ${sso}` } })
      .then(r => {
        const same = localStorage.getItem('hpesa_token') === sso
        if (!same) { clearSession(); login({ token: sso, user: r.data }) }
        navigate(next, { replace: true })
      })
      .catch(() => { /* an old or invalid token: carry on with the normal login */ })
  }
  useEffect(() => { handoff(); window.addEventListener('hashchange', handoff); return () => window.removeEventListener('hashchange', handoff) }, [])

  if (showSplash) return <Splash onDone={finishSplash} />
  if (token && locked) return <LockScreen user={user} onUnlock={() => { touch(); setLocked(false) }} onFullLogout={() => { logout() }} />

  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/login" element={!token ? <Login onLogin={login} /> : <Navigate to="/" />} />
        <Route path="/register" element={!token || window.location.search.includes('add=1') ? <Register onLogin={login} /> : <Navigate to="/apps" replace />} />
        <Route path="/forgot-password" element={<ForgotPassword mode="password" />} />
        <Route path="/forgot-pin" element={<ForgotPassword mode="pin" />} />
        <Route path="/terms" element={<Legal kind="terms" />} />
        <Route path="/privacy" element={<Legal kind="privacy" />} />
        <Route path="/account/statement" element={token ? <Statement /> : <Navigate to="/login" />} />
        <Route path="/support" element={token ? <Support /> : <Navigate to="/login" />} />
        <Route path="/account/wallets" element={token ? <Wallets onSwitch={switchTo} current={user} /> : <Navigate to="/login" />} />
        <Route path="/apps" element={token ? <ConnectApps user={user} fresh /> : <Navigate to="/login" />} />
        <Route path="/account/apps" element={token ? <ConnectApps user={user} /> : <Navigate to="/login" />} />
        <Route path="/" element={token ? <HomeOrRedirect user={user} logout={logout} /> : <Navigate to="/login" />} />
        <Route path="/send" element={token ? <SendMoney /> : <Navigate to="/login" />} />
        <Route path="/paybill" element={token ? <PayBill /> : <Navigate to="/login" />} />
        <Route path="/till" element={token ? <BuyGoods /> : <Navigate to="/login" />} />
        <Route path="/history" element={token ? <History /> : <Navigate to="/login" />} />
        <Route path="/qr" element={token ? <QRPay /> : <Navigate to="/login" />} />
        <Route path="/airtime" element={token ? <Airtime /> : <Navigate to="/login" />} />
        <Route path="/withdraw" element={token ? <Withdraw /> : <Navigate to="/login" />} />
        <Route path="/deposit" element={token ? <Deposit /> : <Navigate to="/login" />} />
        <Route path="/bundles" element={token ? <Bundles /> : <Navigate to="/login" />} />
        <Route path="/ussd" element={token ? <USSD /> : <Navigate to="/login" />} />
        <Route path="/homes" element={token ? <Homes /> : <Navigate to="/login" />} />
        <Route path="/mart" element={token ? <HMart /> : <Navigate to="/login" />} />
        <Route path="/pay/:code" element={<PayRequest loggedIn={!!token} />} />
        <Route path="/chama" element={token ? <Chama /> : <Navigate to="/login" />} />
        <Route path="/chama/:id" element={token ? <ChamaDetail /> : <Navigate to="/login" />} />
        <Route path="/requests" element={token ? <Requests /> : <Navigate to="/login" />} />
        <Route path="/autopay" element={token ? <AutoPay /> : <Navigate to="/login" />} />
        <Route path="/rewards" element={token ? <Rewards /> : <Navigate to="/login" />} />
        <Route path="/services" element={token ? <Services /> : <Navigate to="/login" />} />
        <Route path="/account/profile" element={token ? <Profile onUser={updateUser} /> : <Navigate to="/login" />} />
        <Route path="/account/security" element={token ? <Security /> : <Navigate to="/login" />} />
        <Route path="/account/notifications" element={token ? <Notifications user={user} /> : <Navigate to="/login" />} />
        <Route path="/account" element={token ? <Account user={user} logout={logout} /> : <Navigate to="/login" />} />
      </Routes>
    </div>
  )
}

export default App
