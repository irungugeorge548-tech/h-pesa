import { Routes, Route, Navigate } from 'react-router-dom'
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
import { peekRedirect, clearRedirect } from './lib/api'

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
    localStorage.setItem('hpesa_token', data.token)
    localStorage.setItem('hpesa_user', JSON.stringify(data.user))
    setToken(data.token)
    setUser(data.user)
  }

  const logout = () => {
    localStorage.clear()
    setToken(null)
    setUser(null)
  }

  if (showSplash) return <Splash onDone={finishSplash} />

  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/login" element={!token ? <Login onLogin={login} /> : <Navigate to="/" />} />
        <Route path="/register" element={!token ? <Register onLogin={login} /> : <Navigate to="/" />} />
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
        <Route path="/account" element={token ? <Account user={user} logout={logout} /> : <Navigate to="/login" />} />
      </Routes>
    </div>
  )
}

export default App
