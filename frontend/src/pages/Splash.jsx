import { useEffect } from 'react'
import { Cheetah } from '../components/extras'

export default function Splash({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="h-screen flex flex-col items-center justify-center text-white"
      style={{ background: 'linear-gradient(160deg, #0A5C36 0%, #00A86B 100%)' }}>
      <style>{`
        @keyframes hp-pop { from { opacity: 0; transform: scale(.85) } to { opacity: 1; transform: scale(1) } }
        @keyframes hp-fade { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      <div style={{ animation: 'hp-pop .5s ease-out both' }}><Cheetah size={260} ride className="shadow-xl" /></div>
      <div className="hidden">
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7a2 2 0 0 1 2-2h13v4" />
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <circle cx="16.500" cy="13.500" r="1.200" fill="white" />
        </svg>
      </div>

      <h1 className="text-5xl font-extrabold tracking-tight mt-6" style={{ animation: 'hp-fade .6s .2s ease-out both' }}>H-Pesa</h1>
      <p className="mt-2 text-white/80 text-sm" style={{ animation: 'hp-fade .6s .4s ease-out both' }}>Send. Pay. Simply.</p>
    </div>
  )
}
